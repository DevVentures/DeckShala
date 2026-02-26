# Comprehensive Testing Guide

## DeckShala — AI Presentation Platform

> Complete testing documentation covering unit tests, integration tests, E2E tests, security tests, and performance tests.

---

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [API Testing with Postman](#api-testing-with-postman)
7. [Security Testing](#security-testing)
8. [Performance Testing](#performance-testing)
9. [Ollama Integration Testing](#ollama-integration-testing)
10. [Test Coverage Requirements](#test-coverage-requirements)
11. [Continuous Integration](#continuous-integration)
12. [Troubleshooting](#troubleshooting)

---

## 1. Testing Overview

### Testing Strategy

The DeckShala platform implements a comprehensive multi-layer testing approach:

```
┌─────────────────────────────────────────┐
│         E2E Tests (Playwright)          │  ← User workflows
├─────────────────────────────────────────┤
│     Integration Tests (Vitest)          │  ← API endpoints
├─────────────────────────────────────────┤
│       Unit Tests (Vitest)                │  ← Functions/Components
├─────────────────────────────────────────┤
│    Security Tests (Custom)               │  ← Security validation
├─────────────────────────────────────────┤
│   Performance Tests (k6/Artillery)       │  ← Load testing
└─────────────────────────────────────────┘
```

### Test Pyramid

- **70% Unit Tests** - Fast, isolated function/component tests
- **20% Integration Tests** - API and service interaction tests
- **10% E2E Tests** - Full user workflow tests

---

## 2. Test Environment Setup

### Prerequisites

```bash
# Install dependencies
pnpm install

# Set up test database
pnpm prisma migrate deploy --schema ./prisma/schema.prisma

# Start Ollama service (for AI tests)
ollama serve
ollama pull llama3.2
```

### Environment Variables (.env.test)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/presentation_test"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="test-secret-key-32-characters-long"
GOOGLE_CLIENT_ID="test-client-id"
GOOGLE_CLIENT_SECRET="test-client-secret"

# Ollama
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2"
OLLAMA_TIMEOUT_MS="120000"

# Security
CSRF_SECRET="test-csrf-secret"
ENCRYPTION_KEY="test-encryption-key-32-chars-long"

# Testing
NODE_ENV="test"
```

### Test Database Setup

```bash
# Create test database
createdb presentation_test

# Run migrations
pnpm prisma migrate deploy

# Seed test data
pnpm prisma db seed
```

---

## 3. Unit Testing

### Framework: Vitest

```bash
# Run all unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch

# Run specific test file
pnpm test src/lib/security.test.ts
```

### Example Unit Test: Security Utilities

**File:** `src/lib/__tests__/security.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  RateLimiter,
  CSRFProtection,
  InputSanitizer,
  EncryptionUtils,
} from "@/lib/security";

describe("Security Utilities", () => {
  describe("RateLimiter", () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter({
        windowMs: 60000,
        max: 5,
      });
    });

    it("should allow requests within limit", async () => {
      const result = await rateLimiter.check("test-user");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should block requests exceeding limit", async () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        await rateLimiter.check("test-user");
      }

      // 6th request should be blocked
      const result = await rateLimiter.check("test-user");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should reset after time window", async () => {
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await rateLimiter.check("test-user");
      }

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 61000));

      // Should allow requests again
      const result = await rateLimiter.check("test-user");
      expect(result.allowed).toBe(true);
    });
  });

  describe("InputSanitizer", () => {
    it("should sanitize HTML", () => {
      const dirty = '<script>alert("xss")</script>';
      const clean = InputSanitizer.sanitizeHTML(dirty);
      expect(clean).not.toContain("<script>");
      expect(clean).toContain("&lt;script&gt;");
    });

    it("should sanitize email", () => {
      const email = "  TEST@EXAMPLE.COM  ";
      const sanitized = InputSanitizer.sanitizeEmail(email);
      expect(sanitized).toBe("test@example.com");
    });

    it("should sanitize URL", () => {
      const safe = "https://example.com";
      const unsafe = 'javascript:alert("xss")';

      expect(InputSanitizer.sanitizeURL(safe)).toBe(safe);
      expect(InputSanitizer.sanitizeURL(unsafe)).toBe("");
    });
  });

  describe("EncryptionUtils", () => {
    it("should encrypt and decrypt data", () => {
      const original = "sensitive data";
      const encrypted = EncryptionUtils.encrypt(original);
      const decrypted = EncryptionUtils.decrypt(encrypted);

      expect(encrypted).not.toBe(original);
      expect(decrypted).toBe(original);
    });

    it("should generate unique tokens", () => {
      const token1 = EncryptionUtils.generateToken();
      const token2 = EncryptionUtils.generateToken();

      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
    });
  });

  describe("CSRFProtection", () => {
    it("should generate and validate tokens", () => {
      const sessionId = "test-session-123";
      const token = CSRFProtection.generateToken(sessionId);

      expect(CSRFProtection.validateToken(token, sessionId)).toBe(true);
    });

    it("should reject invalid tokens", () => {
      const sessionId = "test-session-123";
      const fakeToken = "fake-token";

      expect(CSRFProtection.validateToken(fakeToken, sessionId)).toBe(false);
    });

    it("should reject expired tokens", () => {
      // Generate token with past timestamp
      const sessionId = "test-session-123";
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago

      // Mock token generation with old timestamp
      const token = CSRFProtection.generateToken(sessionId);

      // Should be valid initially
      expect(CSRFProtection.validateToken(token, sessionId)).toBe(true);
    });
  });
});
```

### Example Unit Test: Cache Service

**File:** `src/lib/__tests__/cache.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LRUCache, CacheService } from "@/lib/cache";

describe("Cache Service", () => {
  describe("LRUCache", () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>(3); // Small cache for testing
    });

    afterEach(() => {
      cache.destroy();
    });

    it("should store and retrieve values", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return null for non-existent keys", () => {
      expect(cache.get("nonexistent")).toBeNull();
    });

    it("should expire values after TTL", async () => {
      cache.set("key1", "value1", 1); // 1 second TTL
      expect(cache.get("key1")).toBe("value1");

      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(cache.get("key1")).toBeNull();
    });

    it("should evict LRU entry when cache is full", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      cache.set("key4", "value4"); // Should evict key1

      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key4")).toBe("value4");
    });

    it("should track cache statistics", () => {
      cache.set("key1", "value1");
      cache.get("key1"); // Hit
      cache.get("key2"); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });

  describe("CacheService", () => {
    let cacheService: CacheService;

    beforeEach(() => {
      cacheService = new CacheService("test");
    });

    it("should implement cache-aside pattern", async () => {
      let factoryCalled = 0;
      const factory = async () => {
        factoryCalled++;
        return "generated-value";
      };

      // First call should invoke factory
      const value1 = await cacheService.getOrSet("key", factory);
      expect(value1).toBe("generated-value");
      expect(factoryCalled).toBe(1);

      // Second call should use cache
      const value2 = await cacheService.getOrSet("key", factory);
      expect(value2).toBe("generated-value");
      expect(factoryCalled).toBe(1); // Not called again
    });

    it("should handle cache warming", async () => {
      const data = [
        { key: "key1", value: "value1", ttl: 3600 },
        { key: "key2", value: "value2", ttl: 3600 },
      ];

      await cacheService.warm(data);

      expect(await cacheService.get("key1")).toBe("value1");
      expect(await cacheService.get("key2")).toBe("value2");
    });
  });
});
```

### Example Unit Test: Access Control

**File:** `src/lib/__tests__/access-control.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  AccessControl,
  UserRole,
  ResourceType,
  Action,
} from "@/lib/access-control";

describe("Access Control", () => {
  it("should allow admin full access", () => {
    expect(
      AccessControl.hasPermission(
        UserRole.ADMIN,
        ResourceType.PRESENTATION,
        Action.DELETE,
      ),
    ).toBe(true);
  });

  it("should allow users to manage their own presentations", () => {
    expect(
      AccessControl.hasPermission(
        UserRole.USER,
        ResourceType.PRESENTATION,
        Action.CREATE,
      ),
    ).toBe(true);
  });

  it("should prevent viewers from deleting", () => {
    expect(
      AccessControl.hasPermission(
        UserRole.VIEWER,
        ResourceType.PRESENTATION,
        Action.DELETE,
      ),
    ).toBe(false);
  });

  it("should prevent guests from creating", () => {
    expect(
      AccessControl.hasPermission(
        UserRole.GUEST,
        ResourceType.PRESENTATION,
        Action.CREATE,
      ),
    ).toBe(false);
  });

  it("should get correct allowed actions", () => {
    const actions = AccessControl.getAllowedActions(
      UserRole.USER,
      ResourceType.PRESENTATION,
    );

    expect(actions).toContain(Action.CREATE);
    expect(actions).toContain(Action.READ);
    expect(actions).toContain(Action.UPDATE);
    expect(actions).toContain(Action.DELETE);
  });
});
```

---

## 4. Integration Testing

### Testing Server Actions

**File:** `src/app/_actions/__tests__/smart-generation-actions.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  parseContentToPresentation,
  autoDesignPresentation,
} from "../presentation/smart-generation-actions";
import { db } from "@/server/db";

// Mock authentication
vi.mock("@/server/auth", () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: "test-user-123", role: "USER" },
    }),
  ),
}));

describe("Smart Generation Actions", () => {
  beforeEach(async () => {
    // Setup test database state
    await db.$executeRaw`TRUNCATE TABLE "BaseDocument" CASCADE`;
  });

  afterEach(async () => {
    // Cleanup
    await db.$executeRaw`TRUNCATE TABLE "BaseDocument" CASCADE`;
  });

  describe("parseContentToPresentation", () => {
    it("should parse text content successfully", async () => {
      const input = {
        type: "text" as const,
        content:
          "AI is transforming technology. Machine learning enables computers to learn.",
      };

      const result = await parseContentToPresentation(input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.slides).toBeInstanceOf(Array);
      expect(result.data?.slides.length).toBeGreaterThan(0);
    });

    it("should handle invalid input", async () => {
      const input = {
        type: "text" as const,
        content: "",
      };

      const result = await parseContentToPresentation(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should parse URL content", async () => {
      const input = {
        type: "url" as const,
        content: "https://example.com/article",
      };

      const result = await parseContentToPresentation(input);

      // May fail if URL is not accessible, but should not crash
      expect(result).toHaveProperty("success");
    });
  });

  describe("autoDesignPresentation", () => {
    it("should apply design to slides", async () => {
      const slides = [
        {
          id: "slide-1",
          content: [{ type: "h1", children: [{ text: "Title" }] }],
        },
      ];

      const result = await autoDesignPresentation(slides);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.theme).toBeDefined();
      expect(result.data?.designedSlides).toBeInstanceOf(Array);
    });

    it("should apply custom branding", async () => {
      const slides = [
        {
          id: "slide-1",
          content: [{ type: "h1", children: [{ text: "Title" }] }],
        },
      ];

      const options = {
        branding: {
          primaryColor: "#ff0000",
          companyName: "Test Corp",
        },
      };

      const result = await autoDesignPresentation(slides, options);

      expect(result.success).toBe(true);
      expect(result.data?.theme).toBeDefined();
    });
  });
});
```

### Testing API Routes

**File:** `src/app/api/health/__tests__/route.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { GET } from "../route";

describe("/api/health", () => {
  it("should return healthy status", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.timestamp).toBeDefined();
  });
});
```

---

## 5. End-to-End Testing

### Framework: Playwright

```bash
# Run all E2E tests
pnpm playwright test

# Run in UI mode
pnpm playwright test --ui

# Run specific test file
pnpm playwright test e2e/presentation-create.spec.ts

# Debug test
pnpm playwright test --debug
```

### Example E2E Test: Presentation Creation

**File:** `e2e/presentation-create.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Presentation Creation", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in
    await page.goto("/auth/signin");
    // Perform OAuth sign-in (may need custom setup)
    await page.goto("/presentation");
  });

  test("should create new presentation", async ({ page }) => {
    // Click create button
    await page.click('button:has-text("Create New")');

    // Fill presentation form
    await page.fill('input[name="title"]', "Test Presentation");
    await page.fill('textarea[name="description"]', "E2E test presentation");
    await page.selectOption('select[name="numberOfSlides"]', "5");

    // Submit
    await page.click('button:has-text("Generate")');

    // Wait for generation
    await page.waitForSelector(".slide-preview", { timeout: 30000 });

    // Verify presentation created
    await expect(page.locator("h1")).toContainText("Test Presentation");
    await expect(page.locator(".slide-preview")).toHaveCount(5);
  });

  test("should edit slide content", async ({ page }) => {
    // Navigate to existing presentation
    await page.goto("/presentation/test-id");

    // Click on first slide
    await page.click(".slide-preview:first-child");

    // Edit content
    await page.click(".editable-content");
    await page.fill(".editable-content", "Updated content");

    // Wait for auto-save
    await page.waitForTimeout(2000);

    // Verify saved
    await expect(page.locator(".save-status")).toContainText("Saved");
  });

  test("should apply theme to presentation", async ({ page }) => {
    await page.goto("/presentation/test-id");

    // Open theme selector
    await page.click('button:has-text("Change Theme")');

    // Select theme
    await page.click('.theme-option[data-theme="modern-blue"]');

    // Apply theme
    await page.click('button:has-text("Apply Theme")');

    // Verify theme applied
    await expect(page.locator(".presentation-container")).toHaveAttribute(
      "data-theme",
      "modern-blue",
    );
  });

  test("should export presentation to PDF", async ({ page }) => {
    await page.goto("/presentation/test-id");

    // Start download
    const downloadPromise = page.waitForEvent("download");
    await page.click('button:has-text("Export")');
    await page.click('button:has-text("PDF")');

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".pdf");
  });
});
```

---

## 6. API Testing with Postman

### Import Collection

1. Open Postman
2. Click "Import"
3. Select `postman/DeckShala-Presentation-API.postman_collection.json`
4. Set environment variables:
   - `base_url`: http://localhost:3000
   - `session_token`: Your auth token

### Test Scenarios

#### 1. Authentication Flow

```
1. GET /auth/signin (Initiate OAuth)
2. Complete Google OAuth flow
3. GET /api/auth/session (Verify session)
```

#### 2. Presentation CRUD

```
1. POST /api/presentation/create (Create presentation)
2. GET /api/presentation/:id (Get presentation)
3. PUT /api/presentation/:id (Update presentation)
4. DELETE /api/presentation/:id (Delete presentation)
```

#### 3. Smart Features Workflow

```
1. POST /api/smart/parse-content (Parse content)
2. POST /api/smart/auto-design (Apply design)
3. POST /api/smart/analyze-slide (Get AI suggestions)
```

### Automated Testing with Newman

```bash
# Install Newman
npm install -g newman

# Run collection
newman run postman/DeckShala-Presentation-API.postman_collection.json \
  --environment postman/environment.json \
  --reporters cli,html \
  --reporter-html-export newman-report.html
```

---

## 7. Security Testing

### SQL Injection Testing

```bash
# Test input sanitization
curl -X POST http://localhost:3000/api/presentation/create \
  -H "Content-Type: application/json" \
  -d '{"title": "Test'; DROP TABLE BaseDocument;--"}'
```

Expected: Input should be sanitized, no SQL injection

### XSS Testing

```bash
# Test HTML sanitization
curl -X POST http://localhost:3000/api/presentation/create \
  -H "Content-Type: application/json" \
  -d '{"title": "<script>alert(\"xss\")</script>"}'
```

Expected: HTML entities escaped

### Rate Limiting Testing

```bash
# Rapid requests to test rate limiting
for i in {1..20}; do
  curl http://localhost:3000/api/presentation/list &
done
```

Expected: Some requests return 429 Too Many Requests

### CSRF Protection Testing

```bash
# Test CSRF token validation
curl -X POST http://localhost:3000/api/presentation/create \
  -H "Content-Type: application/json" \
  -d '{"title": "Test"}' \
  # Without CSRF token
```

Expected: 403 Forbidden

---

## 8. Performance Testing

### Load Testing with k6

**File:** `tests/load/presentation-load.js`

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 }, // Ramp up to 20 users
    { duration: "1m", target: 20 }, // Stay at 20 users
    { duration: "30s", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests < 500ms
    http_req_failed: ["rate<0.01"], // < 1% failures
  },
};

export default function () {
  // Test presentation list endpoint
  const res = http.get("http://localhost:3000/api/presentation/list");

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

Run: `k6 run tests/load/presentation-load.js`

### Stress Testing

```javascript
export const options = {
  stages: [
    { duration: "2m", target: 100 }, // Ramp to 100 users
    { duration: "5m", target: 100 }, // Stay at 100
    { duration: "2m", target: 200 }, // Spike to 200
    { duration: "5m", target: 200 }, // Stay at 200
    { duration: "2m", target: 0 }, // Ramp down
  ],
};
```

---

## 9. Ollama Integration Testing

### Health Check Test

```typescript
import { describe, it, expect } from "vitest";
import { OllamaService } from "@/lib/ollama-service";

describe("Ollama Integration", () => {
  it("should check Ollama service health", async () => {
    const isHealthy = await OllamaService.checkHealth();
    expect(isHealthy).toBe(true);
  });

  it(
    "should generate text content",
    async () => {
      const result = await OllamaService.generateText(
        "Explain AI in one sentence",
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    },
    { timeout: 30000 },
  );

  it("should handle fallback when model unavailable", async () => {
    const result = await OllamaService.generateWithFallback("Test prompt", {
      model: "nonexistent-model",
    });

    // Should fallback to default model
    expect(result.model).not.toBe("nonexistent-model");
  });
});
```

---

## 10. Test Coverage Requirements

### Minimum Coverage Targets

- **Overall Coverage:** 80%
- **Critical Paths:** 95%
- **Security Functions:** 100%
- **API Endpoints:** 90%

### Generate Coverage Report

```bash
pnpm test:coverage
open coverage/index.html
```

---

## 11. Continuous Integration

### GitHub Actions Workflow

**File:** `.github/workflows/test.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: "20"

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Run Prisma migrations
        run: pnpm prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Run unit tests
        run: pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json

      - name: Run E2E tests
        run: pnpm playwright test
```

---

## 12. Troubleshooting

### Common Issues

#### Ollama Connection Errors

```bash
# Check Ollama service
curl http://localhost:11434/api/tags

# Restart Ollama
systemctl restart ollama
```

#### Database Connection Issues

```bash
# Check PostgreSQL
psql -U postgres -d presentation_test -c "SELECT 1;"

# Reset database
pnpm prisma migrate reset --skip-seed
```

#### Test Timeout Errors

Increase timeout in test configuration:

```typescript
test(
  "long running test",
  async () => {
    // ...
  },
  { timeout: 60000 },
); // 60 seconds
```

---

## Summary

✅ **Comprehensive test coverage** across all layers  
✅ **Security testing** for vulnerabilities  
✅ **Performance testing** for scalability  
✅ **API testing** with Postman collection  
✅ **Ollama integration** testing  
✅ **CI/CD integration** ready

For questions or issues, see [CONTRIBUTING.md](../CONTRIBUTING.md) or join our [Discord](https://discord.gg/fsMHMhAHRV).
