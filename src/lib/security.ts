/**
 * Security Utilities and Middleware
 * Comprehensive security layer for the presentation platform
 * 
 * Features:
 * - Rate limiting
 * - CSRF protection
 * - XSS prevention
 * - SQL injection prevention
 * - Input sanitization
 * - Request validation
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
}

// In-memory store for rate limiting
// ⚠️  PRODUCTION NOTE: This Map is process-local.
//    It works correctly for single-instance deployments (e.g. a single Docker
//    container or a traditional VPS).  If you run multiple instances / use a
//    serverless platform (Vercel, AWS Lambda) you MUST replace this with a
//    shared store – e.g. Redis via `@upstash/ratelimit` or `ioredis` – so that
//    rate-limit counters are shared across all instances.
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting middleware
 * Prevents brute force and DDoS attacks
 */
export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: "Too many requests, please try again later.",
      ...config,
      windowMs: config.windowMs || 15 * 60 * 1000, // 15 minutes default
      max: config.max || 100, // 100 requests default
    };
  }

  /**
   * Check if request should be rate limited
   */
  async check(identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const record = rateLimitStore.get(identifier);

    // Clean up expired entries
    this.cleanup();

    if (!record || record.resetTime < now) {
      // New window or expired
      const resetTime = now + this.config.windowMs;
      rateLimitStore.set(identifier, { count: 1, resetTime });
      return { allowed: true, remaining: this.config.max - 1, resetTime };
    }

    if (record.count >= this.config.max) {
      logger.warn("Rate limit exceeded", { identifier, count: record.count });
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    // Increment count
    record.count++;
    rateLimitStore.set(identifier, record);
    return { allowed: true, remaining: this.config.max - record.count, resetTime: record.resetTime };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    rateLimitStore.delete(identifier);
  }

  /**
   * Get rate limit info
   */
  getInfo(identifier: string): { count: number; resetTime: number } | null {
    return rateLimitStore.get(identifier) || null;
  }
}

/**
 * CSRF Token Management
 * Protects against Cross-Site Request Forgery
 */
export class CSRFProtection {
  private static readonly SECRET = process.env.CSRF_SECRET || "default-csrf-secret-change-in-production";
  private static readonly TOKEN_LENGTH = 32;

  /**
   * Generate CSRF token
   */
  static generateToken(sessionId: string): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(this.TOKEN_LENGTH).toString("hex");
    const data = `${sessionId}:${timestamp}:${random}`;
    const hash = crypto.createHmac("sha256", this.SECRET).update(data).digest("hex");
    return Buffer.from(`${data}:${hash}`).toString("base64");
  }

  /**
   * Validate CSRF token
   */
  static validateToken(token: string, sessionId: string): boolean {
    try {
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");

      if (parts.length !== 4) return false;

      const [tokenSessionId, timestamp, random, hash] = parts;

      // Check session ID match
      if (tokenSessionId !== sessionId) return false;
      if (!timestamp) return false;

      // Check token age (24 hours)
      const tokenTime = parseInt(timestamp);
      if (Date.now() - tokenTime > 24 * 60 * 60 * 1000) return false;

      // Verify hash
      const data = `${tokenSessionId}:${timestamp}:${random}`;
      const expectedHash = crypto.createHmac("sha256", this.SECRET).update(data).digest("hex");

      return hash === expectedHash;
    } catch (error) {
      logger.error("CSRF token validation failed", error as Error);
      return false;
    }
  }
}

/**
 * Input Sanitization
 * Prevents XSS and injection attacks
 */
export class InputSanitizer {
  /**
   * Sanitize HTML to prevent XSS
   */
  static sanitizeHTML(input: string): string {
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  /**
   * Sanitize SQL input (use with parameterized queries)
   */
  static sanitizeSQL(input: string): string {
    return input.replace(/['";\\]/g, "");
  }

  /**
   * Validate and sanitize email
   */
  static sanitizeEmail(email: string): string {
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const sanitized = email.toLowerCase().trim();
    return emailRegex.test(sanitized) ? sanitized : "";
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 255);
  }

  /**
   * Sanitize URL
   */
  static sanitizeURL(url: string): string {
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return "";
      }
      return parsed.toString();
    } catch {
      return "";
    }
  }

  /**
   * Remove dangerous characters from JSON
   */
  static sanitizeJSON(input: string): string {
    try {
      const parsed = JSON.parse(input);
      return JSON.stringify(parsed);
    } catch {
      return "{}";
    }
  }

  /**
   * Comprehensive input sanitization
   */
  static sanitize(input: unknown, type: "html" | "sql" | "email" | "filename" | "url" | "json" = "html"): string {
    if (typeof input !== "string") {
      return "";
    }

    switch (type) {
      case "html":
        return this.sanitizeHTML(input);
      case "sql":
        return this.sanitizeSQL(input);
      case "email":
        return this.sanitizeEmail(input);
      case "filename":
        return this.sanitizeFilename(input);
      case "url":
        return this.sanitizeURL(input);
      case "json":
        return this.sanitizeJSON(input);
      default:
        return this.sanitizeHTML(input);
    }
  }

  /**
   * Comprehensive sanitization for objects, arrays, and nested structures
   */
  static comprehensive(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeHTML(input);
    }

    if (Array.isArray(input)) {
      return input.map(item => this.comprehensive(item));
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const key in input) {
        if (input.hasOwnProperty(key)) {
          const value = input[key];

          // Apply specific sanitization based on field name
          if (key.toLowerCase().includes('email')) {
            sanitized[key] = typeof value === 'string' ? this.sanitizeEmail(value) : value;
          } else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('website')) {
            sanitized[key] = typeof value === 'string' ? this.sanitizeURL(value) : value;
          } else if (key.toLowerCase().includes('filename')) {
            sanitized[key] = typeof value === 'string' ? this.sanitizeFilename(value) : value;
          } else if (typeof value === 'string') {
            // Default to HTML sanitization for strings
            sanitized[key] = this.sanitizeHTML(value).replace(/DROP\s+TABLE/gi, '').replace(/SELECT\s+\*/gi, '');
          } else if (typeof value === 'object' || Array.isArray(value)) {
            sanitized[key] = this.comprehensive(value);
          } else {
            sanitized[key] = value;
          }
        }
      }
      return sanitized;
    }

    return input;
  }
}

/**
 * Request Validator
 * Validates incoming requests
 */
export class RequestValidator {
  /**
   * Validate content type
   */
  static validateContentType(request: NextRequest, allowedTypes: string[]): boolean {
    const contentType = request.headers.get("content-type") || "";
    return allowedTypes.some(type => contentType.includes(type));
  }

  /**
   * Validate request size
   */
  static async validateSize(request: NextRequest, maxSizeBytes: number): Promise<boolean> {
    const contentLength = request.headers.get("content-length");
    if (contentLength) {
      return parseInt(contentLength) <= maxSizeBytes;
    }
    return true;
  }

  /**
   * Validate origin (CORS)
   */
  static validateOrigin(request: NextRequest, allowedOrigins: string[]): boolean {
    const origin = request.headers.get("origin") || "";
    return allowedOrigins.includes(origin) || allowedOrigins.includes("*");
  }

  /**
   * Validate authentication token
   */
  static validateAuthToken(request: NextRequest): boolean {
    const authHeader = request.headers.get("authorization");
    return !!authHeader && authHeader.startsWith("Bearer ");
  }
}

/**
 * Security Headers
 * Apply security headers to responses
 */
export class SecurityHeaders {
  /**
   * Apply security headers to response
   */
  static apply(response: NextResponse): NextResponse {
    // Prevent clickjacking
    response.headers.set("X-Frame-Options", "DENY");

    // Prevent MIME type sniffing
    response.headers.set("X-Content-Type-Options", "nosniff");

    // Enable XSS protection
    response.headers.set("X-XSS-Protection", "1; mode=block");

    // Referrer policy
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Content Security Policy
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
    );

    // Permissions Policy
    response.headers.set(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()"
    );

    // HSTS (HTTP Strict Transport Security)
    if (process.env.NODE_ENV === "production") {
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
    }

    return response;
  }

  /**
   * Get security headers as object (for testing and configuration)
   */
  static getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;",
      "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    };

    if (process.env.NODE_ENV === "production") {
      headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
    }

    return headers;
  }
}

/**
 * Encryption utilities
 */
export class EncryptionUtils {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly KEY = process.env.ENCRYPTION_KEY || "default-encryption-key-change-this";

  /**
   * Encrypt sensitive data
   */
  static encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(this.KEY, "salt", 32);
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");

      const authTag = cipher.getAuthTag();

      return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
    } catch (error) {
      logger.error("Encryption failed", error as Error);
      throw new Error("Encryption failed");
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(":");
      if (parts.length !== 3) throw new Error("Invalid encrypted format");

      const [ivHex, authTagHex, encrypted] = parts;
      if (!ivHex || !authTagHex || !encrypted) {
        throw new Error("Missing encryption components");
      }
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      const key = crypto.scryptSync(this.KEY, "salt", 32);

      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");

      return decrypted;
    } catch (error) {
      logger.error("Decryption failed", error as Error);
      throw new Error("Decryption failed");
    }
  }

  /**
   * Hash password (use bcrypt or argon2 in production)
   */
  static hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = this.hashPassword(password);
    return passwordHash === hash;
  }

  /**
   * Generate secure hash of data
   */
  static hash(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Generate secure random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }
}

/**
 * Audit logger for security events
 */
export class SecurityAuditLogger {
  /**
   * Log security event
   */
  static log(event: string, userId: string, data: Record<string, unknown>): void {
    logger.info(`[SECURITY] ${event}`, {
      userId,
      ...data,
      timestamp: new Date().toISOString(),
      type: "security_audit",
    });
  }

  /**
   * Log authentication event
   */
  static logAuth(userId: string, event: "login" | "logout" | "failed_login", success: boolean, ip?: string): void {
    const eventData: Record<string, unknown> = { event, success };
    if (ip) eventData.ip = ip;

    if (success) {
      logger.info(`[SECURITY] auth_${event}`, { userId, ...eventData });
    } else {
      logger.warn(`[SECURITY] auth_${event}_failed`, { userId, ...eventData });
    }
  }

  /**
   * Log authorization event
   */
  static logAccess(resource: string, action: string, userId: string, allowed: boolean): void {
    logger.info("[SECURITY] access_attempt", { resource, action, userId, allowed });
  }

  /**
   * Log suspicious activity
   */
  static logSuspicious(userId: string, activity: string, data: Record<string, unknown>): void {
    logger.warn(`[SECURITY] Suspicious activity: ${activity}`, {
      userId,
      activity,
      ...data,
      timestamp: new Date().toISOString(),
      type: "suspicious_activity",
    });
  }
}

// Export rate limiters for different endpoints
export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
});

export const aiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI requests per minute
});
