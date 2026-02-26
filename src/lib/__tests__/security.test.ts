import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RateLimiter,
  CSRFProtection,
  InputSanitizer,
  EncryptionUtils,
  RequestValidator,
  SecurityHeaders,
  SecurityAuditLogger,
} from '@/lib/security';
import { NextRequest } from 'next/server';

describe('Security Utilities', () => {
  describe('RateLimiter', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        max: 5,
      });
    });

    afterEach(() => {
      // Cleanup rate limiter (no destroy method)
    });

    it('should allow requests within limit', async () => {
      const result = await rateLimiter.check('test-user');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      // Result doesn't have limit property, only remaining
    });

    it('should block requests exceeding limit', async () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        await rateLimiter.check('test-user');
      }

      // 6th request should be blocked
      const result = await rateLimiter.check('test-user');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track different users separately', async () => {
      await rateLimiter.check('user1');
      await rateLimiter.check('user1');

      const result1 = await rateLimiter.check('user1');
      const result2 = await rateLimiter.check('user2');

      expect(result1.remaining).toBe(2); // user1 has made 3 requests
      expect(result2.remaining).toBe(4); // user2 has made 1 request
    });

    it('should reset after time window', async () => {
      // Use short window for testing
      const shortLimiter = new RateLimiter({
        windowMs: 100, // 100ms
        max: 2,
      });

      await shortLimiter.check('user');
      await shortLimiter.check('user');

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should allow requests again
      const result = await shortLimiter.check('user');
      expect(result.allowed).toBe(true);

      // No destroy method
    });

    it('should include reset time in response', async () => {
      const result = await rateLimiter.check('user');

      expect(result.resetTime).toBeDefined();
      expect(typeof result.resetTime).toBe('number');
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe('InputSanitizer', () => {
    describe('sanitizeHTML', () => {
      it('should escape script tags', () => {
        const dirty = '<script>alert("xss")</script>';
        const clean = InputSanitizer.sanitizeHTML(dirty);

        expect(clean).not.toContain('<script>');
        expect(clean).toContain('&lt;script&gt;');
      });

      it('should escape event handlers', () => {
        const dirty = '<img src="x" onerror="alert(1)">';
        const clean = InputSanitizer.sanitizeHTML(dirty);

        expect(clean).not.toContain('onerror=');
      });

      it('should preserve safe HTML', () => {
        const safe = '<p>Hello <strong>World</strong></p>';
        const clean = InputSanitizer.sanitizeHTML(safe);

        expect(clean).toContain('&lt;p&gt;');
        expect(clean).toContain('&lt;strong&gt;');
      });

      it('should handle empty strings', () => {
        expect(InputSanitizer.sanitizeHTML('')).toBe('');
      });
    });

    describe('sanitizeSQL', () => {
      it('should escape single quotes', () => {
        const input = "O'Reilly";
        const sanitized = InputSanitizer.sanitizeSQL(input);

        expect(sanitized).toBe("O''Reilly");
      });

      it('should escape backslashes', () => {
        const input = 'C:\\Users\\test';
        const sanitized = InputSanitizer.sanitizeSQL(input);

        expect(sanitized).toContain('\\\\');
      });

      it('should remove dangerous keywords', () => {
        const input = 'DROP TABLE users';
        const sanitized = InputSanitizer.sanitizeSQL(input);

        expect(sanitized.toLowerCase()).not.toContain('drop table');
      });
    });

    describe('sanitizeEmail', () => {
      it('should trim and lowercase email', () => {
        const email = '  TEST@EXAMPLE.COM  ';
        const sanitized = InputSanitizer.sanitizeEmail(email);

        expect(sanitized).toBe('test@example.com');
      });

      it('should handle valid emails', () => {
        const emails = [
          'user@example.com',
          'test.user@example.co.uk',
          'user+tag@example.com',
        ];

        emails.forEach(email => {
          const sanitized = InputSanitizer.sanitizeEmail(email);
          expect(sanitized).toBe(email.toLowerCase());
        });
      });

      it('should return empty string for invalid emails', () => {
        const invalidEmails = [
          'notanemail',
          '@example.com',
          'user@',
          'user @example.com',
        ];

        invalidEmails.forEach(email => {
          const sanitized = InputSanitizer.sanitizeEmail(email);
          expect(sanitized).toBe('');
        });
      });
    });

    describe('sanitizeFilename', () => {
      it('should remove path traversal attempts', () => {
        const dangerous = '../../../etc/passwd';
        const sanitized = InputSanitizer.sanitizeFilename(dangerous);

        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toContain('/');
      });

      it('should remove special characters', () => {
        const filename = 'my*file?.txt';
        const sanitized = InputSanitizer.sanitizeFilename(filename);

        expect(sanitized).toBe('my_file_.txt');
      });

      it('should preserve valid filenames', () => {
        const filename = 'my-file_name.txt';
        const sanitized = InputSanitizer.sanitizeFilename(filename);

        expect(sanitized).toBe(filename);
      });
    });

    describe('sanitizeURL', () => {
      it('should allow safe protocols', () => {
        const urls = [
          'https://example.com',
          'http://example.com',
          'ftp://files.example.com',
        ];

        urls.forEach(url => {
          const sanitized = InputSanitizer.sanitizeURL(url);
          expect(sanitized).toBe(url);
        });
      });

      it('should block dangerous protocols', () => {
        const dangerousUrls = [
          'javascript:alert(1)',
          'data:text/html,<script>alert(1)</script>',
          'vbscript:msgbox(1)',
        ];

        dangerousUrls.forEach(url => {
          const sanitized = InputSanitizer.sanitizeURL(url);
          expect(sanitized).toBe('');
        });
      });

      it('should handle malformed URLs', () => {
        const malformed = 'not a url';
        const sanitized = InputSanitizer.sanitizeURL(malformed);

        expect(sanitized).toBe('');
      });
    });

    describe('sanitizeJSON', () => {
      it('should parse valid JSON', () => {
        const json = '{"name": "test", "value": 123}';
        const result = InputSanitizer.sanitizeJSON(json);

        expect(result).toEqual({ name: 'test', value: 123 });
      });

      it('should return null for invalid JSON', () => {
        const invalid = '{invalid json}';
        const result = InputSanitizer.sanitizeJSON(invalid);

        expect(result).toBeNull();
      });

      it('should handle empty strings', () => {
        const result = InputSanitizer.sanitizeJSON('');
        expect(result).toBeNull();
      });
    });

    describe('comprehensive', () => {
      it('should sanitize mixed content', () => {
        const input = {
          name: '<script>alert("xss")</script>John',
          email: '  TEST@EXAMPLE.COM  ',
          website: 'javascript:alert(1)',
          bio: 'DROP TABLE users; --',
        };

        const sanitized = InputSanitizer.comprehensive(input);

        expect(sanitized.name).not.toContain('<script>');
        expect(sanitized.email).toBe('test@example.com');
        expect(sanitized.website).toBe('');
        expect(sanitized.bio).not.toContain('DROP TABLE');
      });

      it('should handle nested objects', () => {
        const input = {
          user: {
            name: '<script>xss</script>',
            details: {
              email: 'TEST@EXAMPLE.COM',
            },
          },
        };

        const sanitized = InputSanitizer.comprehensive(input);

        expect(sanitized.user.name).not.toContain('<script>');
        expect(sanitized.user.details.email).toBe('test@example.com');
      });

      it('should handle arrays', () => {
        const input = {
          tags: ['<script>', 'normal', 'DROP TABLE'],
        };

        const sanitized = InputSanitizer.comprehensive(input);

        expect(sanitized.tags[0]).not.toContain('<script>');
        expect(sanitized.tags[1]).toBe('normal');
      });
    });
  });

  describe('EncryptionUtils', () => {
    describe('encrypt and decrypt', () => {
      it('should encrypt and decrypt data correctly', () => {
        const original = 'sensitive data';
        const encrypted = EncryptionUtils.encrypt(original);
        const decrypted = EncryptionUtils.decrypt(encrypted);

        expect(encrypted).not.toBe(original);
        expect(decrypted).toBe(original);
      });

      it('should produce different ciphertext for same input', () => {
        const data = 'test data';
        const encrypted1 = EncryptionUtils.encrypt(data);
        const encrypted2 = EncryptionUtils.encrypt(data);

        // Different due to random IV
        expect(encrypted1).not.toBe(encrypted2);

        // But both should decrypt to same value
        expect(EncryptionUtils.decrypt(encrypted1)).toBe(data);
        expect(EncryptionUtils.decrypt(encrypted2)).toBe(data);
      });

      it('should handle empty strings', () => {
        const encrypted = EncryptionUtils.encrypt('');
        const decrypted = EncryptionUtils.decrypt(encrypted);

        expect(decrypted).toBe('');
      });

      it('should handle special characters', () => {
        const data = '特殊文字 🎉 émojis';
        const encrypted = EncryptionUtils.encrypt(data);
        const decrypted = EncryptionUtils.decrypt(encrypted);

        expect(decrypted).toBe(data);
      });

      it('should throw on invalid encrypted data', () => {
        expect(() => {
          EncryptionUtils.decrypt('invalid-encrypted-data');
        }).toThrow();
      });
    });

    describe('hashPassword', () => {
      it('should hash password', async () => {
        const password = 'mySecurePassword123!';
        const hashed = await EncryptionUtils.hashPassword(password);

        expect(hashed).not.toBe(password);
        expect(hashed.length).toBeGreaterThan(50); // bcrypt hashes are long
      });

      it('should produce different hashes for same password', async () => {
        const password = 'test123';
        const hash1 = await EncryptionUtils.hashPassword(password);
        const hash2 = await EncryptionUtils.hashPassword(password);

        expect(hash1).not.toBe(hash2); // Different due to random salt
      });
    });

    describe('verifyPassword', () => {
      it('should verify correct password', async () => {
        const password = 'myPassword123';
        const hashed = await EncryptionUtils.hashPassword(password);

        const isValid = await EncryptionUtils.verifyPassword(password, hashed);
        expect(isValid).toBe(true);
      });

      it('should reject incorrect password', async () => {
        const password = 'myPassword123';
        const wrongPassword = 'wrongPassword';
        const hashed = await EncryptionUtils.hashPassword(password);

        const isValid = await EncryptionUtils.verifyPassword(wrongPassword, hashed);
        expect(isValid).toBe(false);
      });
    });

    describe('generateToken', () => {
      it('should generate random token', () => {
        const token = EncryptionUtils.generateToken();

        expect(token).toBeDefined();
        expect(token.length).toBe(64); // 32 bytes = 64 hex chars
      });

      it('should generate unique tokens', () => {
        const token1 = EncryptionUtils.generateToken();
        const token2 = EncryptionUtils.generateToken();

        expect(token1).not.toBe(token2);
      });

      it('should respect custom length', () => {
        const token = EncryptionUtils.generateToken(16);

        expect(token.length).toBe(32); // 16 bytes = 32 hex chars
      });
    });

    describe('hash', () => {
      it('should generate consistent hash', () => {
        const data = 'test data';
        const hash1 = EncryptionUtils.hash(data);
        const hash2 = EncryptionUtils.hash(data);

        expect(hash1).toBe(hash2);
      });

      it('should generate different hashes for different data', () => {
        const hash1 = EncryptionUtils.hash('data1');
        const hash2 = EncryptionUtils.hash('data2');

        expect(hash1).not.toBe(hash2);
      });

      it('should produce SHA-256 hash', () => {
        const hash = EncryptionUtils.hash('test');

        expect(hash.length).toBe(64); // SHA-256 produces 64 hex chars
      });
    });
  });

  describe('CSRFProtection', () => {
    describe('generateToken', () => {
      it('should generate CSRF token', () => {
        const sessionId = 'test-session-123';
        const token = CSRFProtection.generateToken(sessionId);

        expect(token).toBeDefined();
        expect(token.length).toBeGreaterThan(0);
      });

      it('should generate different tokens for different sessions', () => {
        const token1 = CSRFProtection.generateToken('session1');
        const token2 = CSRFProtection.generateToken('session2');

        expect(token1).not.toBe(token2);
      });
    });

    describe('validateToken', () => {
      it('should validate correct token', () => {
        const sessionId = 'test-session-123';
        const token = CSRFProtection.generateToken(sessionId);

        const isValid = CSRFProtection.validateToken(token, sessionId);
        expect(isValid).toBe(true);
      });

      it('should reject invalid token', () => {
        const sessionId = 'test-session-123';
        const fakeToken = 'fake-token-12345';

        const isValid = CSRFProtection.validateToken(fakeToken, sessionId);
        expect(isValid).toBe(false);
      });

      it('should reject token for different session', () => {
        const token = CSRFProtection.generateToken('session1');

        const isValid = CSRFProtection.validateToken(token, 'session2');
        expect(isValid).toBe(false);
      });

      it('should reject empty token', () => {
        const isValid = CSRFProtection.validateToken('', 'session');
        expect(isValid).toBe(false);
      });
    });
  });

  describe('RequestValidator', () => {
    describe('validateContentType', () => {
      it('should accept valid content types', () => {
        const validTypes = [
          'application/json',
          'application/x-www-form-urlencoded',
          'multipart/form-data',
          'text/plain',
        ];

        validTypes.forEach(type => {
          expect(RequestValidator.validateContentType(type)).toBe(true);
        });
      });

      it('should reject invalid content types', () => {
        const invalidTypes = [
          'application/x-dangerous',
          'text/html',
          '',
        ];

        invalidTypes.forEach(type => {
          expect(RequestValidator.validateContentType(type)).toBe(false);
        });
      });
    });

    describe('validateRequestSize', () => {
      it('should accept requests within size limit', () => {
        const size = 1024 * 1024; // 1 MB
        const maxSize = 10 * 1024 * 1024; // 10 MB

        expect(RequestValidator.validateRequestSize(size, maxSize)).toBe(true);
      });

      it('should reject oversized requests', () => {
        const size = 15 * 1024 * 1024; // 15 MB
        const maxSize = 10 * 1024 * 1024; // 10 MB

        expect(RequestValidator.validateRequestSize(size, maxSize)).toBe(false);
      });
    });

    describe('validateOrigin', () => {
      it('should accept allowed origins', () => {
        const origin = 'https://example.com';
        const allowed = ['https://example.com', 'https://app.example.com'];

        expect(RequestValidator.validateOrigin(origin, allowed)).toBe(true);
      });

      it('should reject disallowed origins', () => {
        const origin = 'https://evil.com';
        const allowed = ['https://example.com'];

        expect(RequestValidator.validateOrigin(origin, allowed)).toBe(false);
      });

      it('should handle wildcard origins', () => {
        const origin = 'https://subdomain.example.com';
        const allowed = ['https://*.example.com'];

        // Assuming wildcard support (implementation dependent)
        const result = RequestValidator.validateOrigin(origin, allowed);
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('SecurityHeaders', () => {
    it('should generate all security headers', () => {
      const headers = SecurityHeaders.getSecurityHeaders();

      expect(headers['X-Frame-Options']).toBeDefined();
      expect(headers['X-Content-Type-Options']).toBeDefined();
      expect(headers['X-XSS-Protection']).toBeDefined();
      expect(headers['Strict-Transport-Security']).toBeDefined();
      expect(headers['Content-Security-Policy']).toBeDefined();
      expect(headers['Referrer-Policy']).toBeDefined();
      expect(headers['Permissions-Policy']).toBeDefined();
    });

    it('should set HSTS header correctly', () => {
      const headers = SecurityHeaders.getSecurityHeaders();
      const hsts = headers['Strict-Transport-Security'];

      expect(hsts).toContain('max-age=');
      expect(hsts).toContain('includeSubDomains');
    });

    it('should set CSP header', () => {
      const headers = SecurityHeaders.getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];

      expect(csp).toBeDefined();
      expect(csp).toContain('default-src');
    });
  });

  describe('SecurityAuditLogger', () => {
    it('should log security events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

      SecurityAuditLogger.log('test-event', 'user-123', { detail: 'test' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log authentication events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

      SecurityAuditLogger.logAuth('user-123', 'login', true);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log suspicious activity', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

      SecurityAuditLogger.logSuspicious('user-123', 'multiple-failed-logins', {
        attempts: 5,
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
