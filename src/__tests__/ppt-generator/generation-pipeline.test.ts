/**
 * PPT Generator – Generation Pipeline Tests
 *
 * Tests the full prompt → outline → slides pipeline covering:
 *   • Outline API route (POST /api/presentation/outline)
 *   • Slide-generation API route (POST /api/presentation/generate)
 *   • Template-variable substitution (title, date, tone, language, etc.)
 *   • Prompt sanitisation before forwarding to the model
 *   • Response shape validation
 *   • Slide count enforcement (exactly N slides)
 *   • Language routing / locale selection
 *   • Search-results injection into the generation prompt
 *   • Unauthenticated requests → 401
 *   • Rate-limited requests → 429
 *   • Invalid body → 400
 *   • Model unavailable → 503
 *
 * All AI calls are mocked – these tests verify the PIPELINE behaviour,
 * not the quality of the AI output (see content-scenarios for that).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// AUTH MOCK – logged-in user by default
// ─────────────────────────────────────────────────────────────────────────────
const mockAuth = vi.fn();
vi.mock("@/server/auth", () => ({ auth: mockAuth }));

// ─────────────────────────────────────────────────────────────────────────────
// AI SDK MOCK – pretend the model returns a canned stream
// ─────────────────────────────────────────────────────────────────────────────
const mockStreamText = vi.fn();
vi.mock("ai", () => ({ streamText: mockStreamText }));

// ─────────────────────────────────────────────────────────────────────────────
// MODEL PICKER MOCK – returns a dummy model object
// ─────────────────────────────────────────────────────────────────────────────
vi.mock("@/lib/model-picker", () => ({
  modelPicker: vi.fn().mockResolvedValue({ id: "mock-model" }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Builds a minimal NextRequest-like object with a JSON body */
function buildRequest(body: unknown, method = "POST"): Request {
  return new Request("http://localhost:3000/api/presentation/outline", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Standard authenticated session */
function authenticatedSession(userId = "user-01") {
  return {
    user: { id: userId, name: "Test User", email: "test@example.com", role: "USER" },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

/** Canonical slide XML the mock AI returns per slide */
function mockSlideXML(n: number) {
  return `<SECTION layout="left">
  <H2>Slide ${n} Heading</H2>
  <P>Content for slide ${n}</P>
  <IMG query="professional business meeting slide ${n}" />
</SECTION>`;
}

function mockPresentationXML(slideCount: number): string {
  const slides = Array.from({ length: slideCount }, (_, i) => mockSlideXML(i + 1)).join("\n");
  return `<PRESENTATION>\n${slides}\n</PRESENTATION>`;
}

/** Mimic the toDataStreamResponse() the real streamText returns */
function fakeStream(content: string) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(content));
      controller.close();
    },
  });
  return {
    toDataStreamResponse: () =>
      new Response(stream, { status: 200, headers: { "Content-Type": "text/plain" } }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTLINE ROUTE TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/presentation/outline", () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue(authenticatedSession());
    const mod = await import("@/app/api/presentation/outline/route");
    POST = mod.POST;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = buildRequest({ prompt: "Test prompt for outline", numberOfCards: 5, language: "en-US" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("returns 400 with validation errors on invalid body", async () => {
    const req = buildRequest({ prompt: "Hi", numberOfCards: 0, language: "xx" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/validation/i);
    expect(Array.isArray(body.details)).toBe(true);
  });

  it("returns 400 when prompt is below 10 characters", async () => {
    const req = buildRequest({ prompt: "Short", numberOfCards: 5, language: "en-US" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when numberOfCards exceeds 20", async () => {
    const req = buildRequest({
      prompt: "A long enough prompt to pass length check",
      numberOfCards: 25,
      language: "en-US",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 streaming response for valid input", async () => {
    mockStreamText.mockReturnValueOnce(
      fakeStream(
        `<TITLE>Climate Presentation</TITLE>\n# Topic 1\n- Point A\n- Point B\n# Topic 2\n- Point C\n- Point D`,
      ),
    );
    const req = buildRequest({
      prompt: "Climate change impacts on Indian agriculture",
      numberOfCards: 5,
      language: "en-US",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("forwards language to the model prompt context", async () => {
    let capturedPrompt = "";
    mockStreamText.mockImplementationOnce(({ prompt }: { prompt: string }) => {
      capturedPrompt = prompt;
      return fakeStream("<TITLE>Title</TITLE>");
    });
    const req = buildRequest({
      prompt: "भारत में कृषि पर जलवायु परिवर्तन का प्रभाव",
      numberOfCards: 5,
      language: "hi",
    });
    await POST(req);
    // The language code should appear somewhere in the formatted prompt
    expect(capturedPrompt).toContain("hi");
  });

  it("includes current date in the prompt", async () => {
    let capturedPrompt = "";
    mockStreamText.mockImplementationOnce(({ prompt }: { prompt: string }) => {
      capturedPrompt = prompt;
      return fakeStream("<TITLE>T</TITLE>");
    });
    const req = buildRequest({
      prompt: "Startup pitch for Indian VCs in 2025",
      numberOfCards: 5,
      language: "en-US",
    });
    await POST(req);
    const year = new Date().getFullYear().toString();
    expect(capturedPrompt).toContain(year);
  });

  it("sanitises XSS payload in prompt before sending to model", async () => {
    let capturedPrompt = "";
    mockStreamText.mockImplementationOnce(({ prompt }: { prompt: string }) => {
      capturedPrompt = prompt;
      return fakeStream("<TITLE>T</TITLE>");
    });
    const xssPrompt = `"><script>alert(1)</script> presentation about data`;
    const req = buildRequest({
      prompt: xssPrompt,
      numberOfCards: 5,
      language: "en-US",
    });
    await POST(req);
    expect(capturedPrompt).not.toContain("<script>");
    expect(capturedPrompt).not.toContain('alert(1)');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE ROUTE TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/presentation/generate", () => {
  let POST: (req: Request) => Promise<Response>;

  const validSlidesBody = (overrides?: Record<string, unknown>) => ({
    title: "Startup Ecosystem in India",
    prompt: "Overview of India's startup ecosystem for investors",
    outline: Array.from({ length: 8 }, (_, i) => `# Section ${i + 1}\n- Point A\n- Point B`),
    language: "en-US",
    tone: "professional",
    ...overrides,
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue(authenticatedSession());
    const mod = await import("@/app/api/presentation/generate/route");
    POST = mod.POST;
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(buildRequest(validSlidesBody()));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body (title too long)", async () => {
    const res = await POST(buildRequest(validSlidesBody({ title: "T".repeat(201) })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/validation/i);
  });

  it("returns 400 when outline has fewer than 3 items", async () => {
    const res = await POST(
      buildRequest(validSlidesBody({ outline: ["# T1\n- P", "# T2\n- P"] })),
    );
    expect(res.status).toBe(400);
  });

  it("returns 503 when model picker throws (Ollama offline)", async () => {
    const { modelPicker } = await import("@/lib/model-picker");
    vi.mocked(modelPicker).mockRejectedValueOnce(new Error("Ollama service is unavailable"));
    const res = await POST(buildRequest(validSlidesBody()));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/unavailable/i);
  });

  it("returns 200 streaming response for valid request", async () => {
    mockStreamText.mockReturnValueOnce(fakeStream(mockPresentationXML(8)));
    const res = await POST(buildRequest(validSlidesBody()));
    expect(res.status).toBe(200);
  });

  it("injects search results into the model prompt", async () => {
    let capturedPrompt = "";
    mockStreamText.mockImplementationOnce(({ prompt }: { prompt: string }) => {
      capturedPrompt = prompt;
      return fakeStream(mockPresentationXML(5));
    });
    const body = validSlidesBody({
      searchResults: [
        {
          query: "India startup funding 2025",
          results: [
            { title: "India tops startup funding", content: "India raised $10B in 2025", url: "https://example.com" },
          ],
        },
      ],
    });
    await POST(buildRequest(body));
    expect(capturedPrompt).toContain("India tops startup funding");
  });

  it("includes all {TOTAL_SLIDES} replacement in prompt", async () => {
    let capturedPrompt = "";
    mockStreamText.mockImplementationOnce(({ prompt }: { prompt: string }) => {
      capturedPrompt = prompt;
      return fakeStream(mockPresentationXML(12));
    });
    const body = validSlidesBody({
      outline: Array.from({ length: 12 }, (_, i) => `# T${i + 1}\n- P`),
    });
    await POST(buildRequest(body));
    expect(capturedPrompt).toContain("12");
    expect(capturedPrompt).not.toContain("{TOTAL_SLIDES}");
  });

  it("replaces all template variables in the prompt (no placeholders left)", async () => {
    let capturedPrompt = "";
    mockStreamText.mockImplementationOnce(({ prompt }: { prompt: string }) => {
      capturedPrompt = prompt;
      return fakeStream(mockPresentationXML(5));
    });
    await POST(buildRequest(validSlidesBody()));
    const leftover = capturedPrompt.match(/\{[A-Z_]+\}/g);
    expect(leftover).toBeNull();
  });

  it("applies per-user rate limiting (429 after 3 requests)", async () => {
    mockStreamText.mockReturnValue(fakeStream(mockPresentationXML(5)));
    const body = validSlidesBody();
    // 3 allowed
    for (let i = 0; i < 3; i++) {
      const res = await POST(buildRequest(body));
      expect(res.status).toBe(200);
    }
    // 4th should be rate-limited
    const overLimit = await POST(buildRequest(body));
    expect(overLimit.status).toBe(429);
  });

  it("different users do NOT share rate-limit buckets", async () => {
    mockStreamText.mockReturnValue(fakeStream(mockPresentationXML(5)));
    const body = validSlidesBody();

    // Exhaust user-A's limit
    mockAuth.mockResolvedValue(authenticatedSession("user-A"));
    for (let i = 0; i < 3; i++) await POST(buildRequest(body));
    const blocked = await POST(buildRequest(body));
    expect(blocked.status).toBe(429);

    // User-B should still be fine
    mockAuth.mockResolvedValue(authenticatedSession("user-B"));
    const ok = await POST(buildRequest(body));
    expect(ok.status).toBe(200);
  });
});
