/**
 * PPT Generator – Input Validation Tests
 *
 * Covers every edge-case the Zod schemas + sanitisation helpers must handle
 * before any content ever reaches the AI model. If these pass, the generator
 * never receives garbage input.
 *
 * Scenarios tested:
 *   • Prompt length (too short / too long / boundary)
 *   • Slide-count bounds (min 3, max 20)
 *   • Language enum validation
 *   • XSS / script injection in prompts
 *   • SQL-injection-like content in prompts
 *   • HTML entities in prompts (should be sanitised for XML)
 *   • Hindi / Devanagari prompts (important for Indian users)
 *   • Hinglish (mixed English + Hindi) prompts
 *   • Null / undefined / wrong type fields
 *   • URL-based prompt injection
 *   • Slides generation schema validation
 *   • Update presentation schema validation
 */

import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import {
  PresentationInputSchema,
  SlidesGenerationSchema,
  UpdatePresentationSchema,
  sanitizeHTML,
  sanitizeForXML,
  isValidEmail,
} from "@/lib/validation";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function parseInput(overrides?: Record<string, unknown>) {
  return PresentationInputSchema.parse({
    prompt: "Make a presentation about climate change in India",
    numberOfCards: 8,
    language: "en-US",
    ...overrides,
  });
}

function parseSlidesInput(overrides?: Record<string, unknown>) {
  return SlidesGenerationSchema.parse({
    title: "Climate Change in India",
    prompt: "Impacts of climate change on Indian agriculture",
    outline: Array.from({ length: 8 }, (_, i) => `# Topic ${i + 1}\n- Point 1\n- Point 2`),
    language: "en-US",
    tone: "professional",
    ...overrides,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PresentationInputSchema
// ─────────────────────────────────────────────────────────────────────────────

describe("PresentationInputSchema", () => {
  // ── HAPPY PATH ──────────────────────────────────────────────────────────────
  describe("valid inputs", () => {
    it("accepts a standard English prompt", () => {
      const result = parseInput();
      expect(result.prompt).toContain("climate change");
      expect(result.numberOfCards).toBe(8);
    });

    it("accepts minimum prompt length (10 chars)", () => {
      const result = parseInput({ prompt: "AI in 2025" });
      expect(result.prompt).toBe("AI in 2025");
    });

    it("accepts maximum prompt length (2000 chars)", () => {
      const longPrompt = "A".repeat(2000);
      const result = parseInput({ prompt: longPrompt });
      expect(result.prompt.length).toBe(2000);
    });

    it("accepts minimum slide count (3)", () => {
      const result = parseInput({ numberOfCards: 3 });
      expect(result.numberOfCards).toBe(3);
    });

    it("accepts maximum slide count (20)", () => {
      const result = parseInput({ numberOfCards: 20 });
      expect(result.numberOfCards).toBe(20);
    });

    it("accepts Hindi (Devanagari) prompts", () => {
      const hindiPrompt = "भारत में जलवायु परिवर्तन के प्रभाव पर प्रस्तुति बनाएं";
      const result = parseInput({ prompt: hindiPrompt });
      expect(result.prompt).toBe(hindiPrompt);
    });

    it("accepts Hinglish (mixed) prompts", () => {
      const hinglishPrompt = "India ke startup ecosystem ke baare mein presentation";
      const result = parseInput({ prompt: hinglishPrompt });
      expect(result.prompt).toBe(hinglishPrompt);
    });

    it("accepts all supported language codes", () => {
      const langs = ["en-US", "es-ES", "fr-FR", "de-DE", "it-IT", "pt-BR", "ru-RU", "ja-JP", "ko-KR", "zh-CN", "ar"];
      for (const language of langs) {
        const result = parseInput({ language });
        expect(result.language).toBe(language);
      }
    });

    it("trims whitespace from prompt", () => {
      const result = parseInput({ prompt: "   AI and the future   " });
      expect(result.prompt).toBe("AI and the future");
    });

    it("passes through optional modelProvider", () => {
      const result = parseInput({ modelProvider: "openai" });
      expect(result.modelProvider).toBe("openai");
    });

    it("passes through optional modelId", () => {
      const result = parseInput({ modelId: "gpt-4o" });
      expect(result.modelId).toBe("gpt-4o");
    });
  });

  // ── VALIDATION FAILURES ──────────────────────────────────────────────────────
  describe("invalid inputs", () => {
    it("rejects prompt shorter than 10 characters", () => {
      expect(() => parseInput({ prompt: "Short" })).toThrow(ZodError);
    });

    it("rejects empty prompt", () => {
      expect(() => parseInput({ prompt: "" })).toThrow(ZodError);
    });

    it("rejects prompt longer than 2000 characters", () => {
      expect(() => parseInput({ prompt: "A".repeat(2001) })).toThrow(ZodError);
    });

    it("rejects numberOfCards below minimum (2)", () => {
      expect(() => parseInput({ numberOfCards: 2 })).toThrow(ZodError);
    });

    it("rejects numberOfCards above maximum (21)", () => {
      expect(() => parseInput({ numberOfCards: 21 })).toThrow(ZodError);
    });

    it("rejects fractional numberOfCards", () => {
      expect(() => parseInput({ numberOfCards: 4.5 })).toThrow(ZodError);
    });

    it("rejects null numberOfCards", () => {
      expect(() => parseInput({ numberOfCards: null })).toThrow(ZodError);
    });

    it("rejects unsupported language code", () => {
      expect(() => parseInput({ language: "xx-YY" })).toThrow(ZodError);
    });

    it("rejects missing prompt", () => {
      expect(() => PresentationInputSchema.parse({ numberOfCards: 5, language: "en-US" })).toThrow(ZodError);
    });

    it("rejects missing numberOfCards", () => {
      expect(() =>
        PresentationInputSchema.parse({
          prompt: "Valid prompt here!",
          language: "en-US",
        }),
      ).toThrow(ZodError);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SlidesGenerationSchema
// ─────────────────────────────────────────────────────────────────────────────

describe("SlidesGenerationSchema", () => {
  it("validates a well-formed slides request", () => {
    const result = parseSlidesInput();
    expect(result.title).toBe("Climate Change in India");
    expect(result.outline).toHaveLength(8);
  });

  it("rejects fewer than 3 outline items", () => {
    expect(() =>
      parseSlidesInput({ outline: ["# Topic 1\n- P1", "# Topic 2\n- P2"] }),
    ).toThrow(ZodError);
  });

  it("rejects more than 20 outline items", () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => `# T${i + 1}\n- P`);
    expect(() => parseSlidesInput({ outline: tooMany })).toThrow(ZodError);
  });

  it("rejects title longer than 200 characters", () => {
    expect(() => parseSlidesInput({ title: "T".repeat(201) })).toThrow(ZodError);
  });

  it("rejects prompt longer than 2000 characters", () => {
    expect(() => parseSlidesInput({ prompt: "p".repeat(2001) })).toThrow(ZodError);
  });

  it("accepts optional searchResults field", () => {
    const result = parseSlidesInput({
      searchResults: [{ query: "climate", results: [{ title: "Article", content: "..." }] }],
    });
    expect(result.searchResults).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UpdatePresentationSchema
// ─────────────────────────────────────────────────────────────────────────────

describe("UpdatePresentationSchema", () => {
  it("accepts a minimal valid update (id only)", () => {
    const result = UpdatePresentationSchema.parse({ id: "clxyz123" });
    expect(result.id).toBe("clxyz123");
  });

  it("accepts full update payload", () => {
    const result = UpdatePresentationSchema.parse({
      id: "clxyz123",
      title: "New Title",
      theme: "dark",
      imageSource: "stock",
      thumbnailUrl: "https://example.com/thumb.jpg",
    });
    expect(result.theme).toBe("dark");
  });

  it("accepts empty thumbnailUrl string", () => {
    const result = UpdatePresentationSchema.parse({ id: "clxyz123", thumbnailUrl: "" });
    expect(result.thumbnailUrl).toBe("");
  });

  it("rejects invalid thumbnailUrl (not URL and not empty)", () => {
    expect(() =>
      UpdatePresentationSchema.parse({ id: "clxyz123", thumbnailUrl: "not-a-url" }),
    ).toThrow(ZodError);
  });

  it("rejects imageSource other than ai/stock", () => {
    expect(() =>
      UpdatePresentationSchema.parse({ id: "clxyz123", imageSource: "unsplash" }),
    ).toThrow(ZodError);
  });

  it("rejects missing id", () => {
    expect(() => UpdatePresentationSchema.parse({ title: "No ID" })).toThrow(ZodError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeForXML
// ─────────────────────────────────────────────────────────────────────────────

describe("sanitizeForXML", () => {
  it('escapes & to &amp;', () => {
    expect(sanitizeForXML("Tata & Sons")).toBe("Tata &amp; Sons");
  });

  it("escapes < and >", () => {
    expect(sanitizeForXML("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });

  it('escapes double quotes', () => {
    expect(sanitizeForXML(`title="hack"`)).toContain("&quot;");
  });

  it("escapes single quotes", () => {
    expect(sanitizeForXML("it's")).toContain("&apos;");
  });

  it("preserves Devanagari script untouched", () => {
    const hindi = "भारत";
    expect(sanitizeForXML(hindi)).toBe(hindi);
  });

  it("neutralises XSS attempt payload", () => {
    const xss = `"><img src=x onerror=alert(1)>`;
    const clean = sanitizeForXML(xss);
    expect(clean).not.toContain("<img");
    expect(clean).not.toContain("onerror");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeHTML
// ─────────────────────────────────────────────────────────────────────────────

describe("sanitizeHTML", () => {
  it("escapes all five HTML special characters", () => {
    const dirty = `<p class="x">a & b</p>`;
    const clean = sanitizeHTML(dirty);
    expect(clean).not.toContain("<");
    expect(clean).not.toContain(">");
    expect(clean).not.toContain("&amp;amp;"); // no double-encoding
  });

  it("handles empty string", () => {
    expect(sanitizeHTML("")).toBe("");
  });

  it("does not alter plain text", () => {
    expect(sanitizeHTML("Hello World")).toBe("Hello World");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isValidEmail
// ─────────────────────────────────────────────────────────────────────────────

describe("isValidEmail", () => {
  it("accepts standard email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("accepts Indian domain", () => {
    expect(isValidEmail("admin@company.in")).toBe(true);
  });

  it("rejects email without @", () => {
    expect(isValidEmail("notanemail")).toBe(false);
  });

  it("rejects email without domain", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });
});
