import { z } from "zod";

// ============================================
// INPUT VALIDATION SCHEMAS
// ============================================

export const PresentationInputSchema = z.object({
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters")
    .max(2000, "Prompt must not exceed 2000 characters")
    .trim(),
  numberOfCards: z
    .number()
    .int("Number of cards must be an integer")
    .min(3, "Minimum 3 slides required")
    .max(20, "Maximum 20 slides allowed"),
  language: z.enum([
    "en-US",
    "es-ES",
    "fr-FR",
    "de-DE",
    "it-IT",
    "pt-BR",
    "ru-RU",
    "ja-JP",
    "ko-KR",
    "zh-CN",
    "ar",
  ]),
  modelProvider: z.enum(["openai", "ollama", "lmstudio"]).optional(),
  modelId: z.string().max(100).optional(),
});

export const SlidesGenerationSchema = z.object({
  title: z.string().min(1, "Title required").max(200, "Title too long").trim(),
  prompt: z.string().max(2000, "Prompt too long").trim(),
  outline: z
    .array(z.string().max(5000, "Outline item too long"))
    .min(3, "Minimum 3 outline items")
    .max(20, "Maximum 20 outline items"),
  language: z.string().max(10),
  tone: z.string().max(100),
  modelProvider: z.string().max(50).optional(),
  modelId: z.string().max(100).optional(),
  searchResults: z.any().optional(),
});

export const UpdatePresentationSchema = z.object({
  id: z.string().min(1, "Presentation ID required"),
  title: z.string().max(200).optional(),
  outline: z.array(z.string()).optional(),
  searchResults: z.any().optional(),
  prompt: z.string().max(2000).optional(),
  theme: z.string().max(50).optional(),
  imageSource: z.enum(["ai", "stock"]).optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
});

// ============================================
// SANITIZATION HELPERS
// ============================================

/**
 * Sanitizes HTML input by escaping special characters
 */
export function sanitizeHTML(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitizes input for XML usage
 */
export function sanitizeForXML(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitEntry {
  timestamps: number[];
  blocked: boolean;
  blockedUntil?: number;
}

/**
 * Simple in-memory rate limiter
 * In production, use Redis for distributed rate limiting
 */
export class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.requests.entries()) {
        // Remove entries older than 1 hour
        if (entry.timestamps.length === 0 || now - entry.timestamps[0]! > 3600000) {
          this.requests.delete(key);
        }
      }
    }, 300000); // 5 minutes
  }

  /**
   * Check if a request is allowed based on rate limiting rules
   * @param identifier - Unique identifier (e.g., user ID, IP address)
   * @param maxRequests - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns true if request is allowed, false otherwise
   */
  isAllowed(
    identifier: string,
    maxRequests: number = 10,
    windowMs: number = 60000, // 1 minute default
  ): boolean {
    const now = Date.now();
    const entry = this.requests.get(identifier) ?? {
      timestamps: [],
      blocked: false,
    };

    // Check if currently blocked
    if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
      return false;
    }

    // Unblock if block period has expired
    if (entry.blocked && entry.blockedUntil && now >= entry.blockedUntil) {
      entry.blocked = false;
      entry.blockedUntil = undefined;
      entry.timestamps = [];
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((timestamp) => now - timestamp < windowMs);

    // Check if limit exceeded
    if (entry.timestamps.length >= maxRequests) {
      // Block for the remainder of the window
      entry.blocked = true;
      entry.blockedUntil = now + windowMs;
      this.requests.set(identifier, entry);
      return false;
    }

    // Add current timestamp
    entry.timestamps.push(now);
    this.requests.set(identifier, entry);

    return true;
  }

  /**
   * Get remaining requests for an identifier
   */
  getRemainingRequests(
    identifier: string,
    maxRequests: number = 10,
    windowMs: number = 60000,
  ): number {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry) return maxRequests;

    // Check if blocked
    if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
      return 0;
    }

    // Filter valid timestamps
    const validTimestamps = entry.timestamps.filter(
      (timestamp) => now - timestamp < windowMs,
    );

    return Math.max(0, maxRequests - validTimestamps.length);
  }

  /**
   * Cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

// ============================================
// VALIDATION ERROR CLASS
// ============================================

export class ValidationError extends Error {
  constructor(
    public field: string,
    message: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}
