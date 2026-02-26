/**
 * PPT Generator – Export Service Tests
 *
 * Covers ExportService: PDF, PNG, HTML, utility helpers.
 *
 * All puppeteer calls are mocked – these tests run in pure Node / Vitest
 * with no headless browser.  The mocks replicate the exact shape puppeteer
 * returns so every branch of the production code is exercised.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExportService, type ExportOptions } from "@/lib/export-service";

// ─────────────────────────────────────────────────────────────────────────────
// Puppeteer mock helpers
// ─────────────────────────────────────────────────────────────────────────────

const mockPDF = Buffer.from("PDF-BYTES");
const mockScreenshot = Buffer.from("PNG-BYTES");

function makeMockPage(overrides: Record<string, unknown> = {}) {
  return {
    setViewport: vi.fn().mockResolvedValue(undefined),
    setContent: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue(3), // default: 3 slides
    pdf: vi.fn().mockResolvedValue(mockPDF),
    screenshot: vi.fn().mockResolvedValue(mockScreenshot),
    ...overrides,
  };
}

function makeMockBrowser(page: ReturnType<typeof makeMockPage>) {
  return {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

const mockLaunch = vi.fn();
vi.mock("puppeteer", () => ({ default: { launch: mockLaunch } }));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Shared fixtures
// ─────────────────────────────────────────────────────────────────────────────

const SLIDE_HTML = `
  <div data-slide>Slide 1</div>
  <div data-slide>Slide 2</div>
  <div data-slide>Slide 3</div>
`;

const CSS_CONTENT = `body { font-family: sans-serif; } .slide { width: 1920px; }`;

// ─────────────────────────────────────────────────────────────────────────────
// ExportService.exportToPDF
// ─────────────────────────────────────────────────────────────────────────────

describe("ExportService.exportToPDF", () => {
  let page: ReturnType<typeof makeMockPage>;
  let browser: ReturnType<typeof makeMockBrowser>;

  beforeEach(() => {
    page = makeMockPage();
    browser = makeMockBrowser(page);
    mockLaunch.mockResolvedValue(browser);
  });

  it("returns a Buffer on success", async () => {
    const result = await ExportService.exportToPDF(SLIDE_HTML, { format: "pdf" });
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("calls page.pdf with landscape: true by default", async () => {
    await ExportService.exportToPDF(SLIDE_HTML, { format: "pdf" });
    const pdfCall = page.pdf.mock.calls[0]?.[0];
    expect(pdfCall?.landscape).toBe(true);
  });

  it("calls page.pdf with landscape: false in portrait mode", async () => {
    await ExportService.exportToPDF(SLIDE_HTML, { format: "pdf", orientation: "portrait" });
    const pdfCall = page.pdf.mock.calls[0]?.[0];
    expect(pdfCall?.landscape).toBe(false);
  });

  it("sets deviceScaleFactor to 2 for high-quality export", async () => {
    await ExportService.exportToPDF(SLIDE_HTML, { format: "pdf", quality: "high" });
    const viewportCall = page.setViewport.mock.calls[0]?.[0];
    expect(viewportCall?.deviceScaleFactor).toBe(2);
  });

  it("sets deviceScaleFactor to 1 for standard-quality export", async () => {
    await ExportService.exportToPDF(SLIDE_HTML, { format: "pdf", quality: "medium" });
    const viewportCall = page.setViewport.mock.calls[0]?.[0];
    expect(viewportCall?.deviceScaleFactor).toBe(1);
  });

  it("always closes the browser – even on success", async () => {
    await ExportService.exportToPDF(SLIDE_HTML, { format: "pdf" });
    expect(browser.close).toHaveBeenCalledOnce();
  });

  it("throws a descriptive error and closes browser when page.pdf rejects", async () => {
    page.pdf.mockRejectedValueOnce(new Error("Render failed"));
    await expect(ExportService.exportToPDF(SLIDE_HTML, { format: "pdf" }))
      .rejects.toThrow(/Failed to export to PDF/);
    expect(browser.close).toHaveBeenCalledOnce();
  });

  it("throws a descriptive error when puppeteer.launch rejects", async () => {
    mockLaunch.mockRejectedValueOnce(new Error("Chrome not found"));
    await expect(ExportService.exportToPDF(SLIDE_HTML, { format: "pdf" }))
      .rejects.toThrow(/Failed to export to PDF/);
  });

  it("sets correct viewport dimensions (1920 × 1080)", async () => {
    await ExportService.exportToPDF(SLIDE_HTML, { format: "pdf" });
    const viewportCall = page.setViewport.mock.calls[0]?.[0];
    expect(viewportCall?.width).toBe(1920);
    expect(viewportCall?.height).toBe(1080);
  });

  it("passes printBackground: true to page.pdf", async () => {
    await ExportService.exportToPDF(SLIDE_HTML, { format: "pdf" });
    const pdfCall = page.pdf.mock.calls[0]?.[0];
    expect(pdfCall?.printBackground).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ExportService.exportToPNG
// ─────────────────────────────────────────────────────────────────────────────

describe("ExportService.exportToPNG", () => {
  let page: ReturnType<typeof makeMockPage>;
  let browser: ReturnType<typeof makeMockBrowser>;

  beforeEach(() => {
    // evaluate is called once to count slides, then once per slide to toggle visibility
    page = makeMockPage({
      evaluate: vi.fn()
        .mockResolvedValueOnce(3) // slideCount
        .mockResolvedValue(undefined), // show/hide calls
    });
    browser = makeMockBrowser(page);
    mockLaunch.mockResolvedValue(browser);
  });

  it("returns one Buffer per slide", async () => {
    const result = await ExportService.exportToPNG(SLIDE_HTML, { format: "png" });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
    result.forEach((buf) => expect(Buffer.isBuffer(buf)).toBe(true));
  });

  it("returns an empty array when presentation has 0 slides", async () => {
    page.evaluate = vi.fn().mockResolvedValueOnce(0);
    const result = await ExportService.exportToPNG(SLIDE_HTML, { format: "png" });
    expect(result).toHaveLength(0);
  });

  it("sets deviceScaleFactor = 2 for high quality", async () => {
    await ExportService.exportToPNG(SLIDE_HTML, { format: "png", quality: "high" });
    const vp = page.setViewport.mock.calls[0]?.[0];
    expect(vp?.deviceScaleFactor).toBe(2);
  });

  it("sets deviceScaleFactor = 1.5 for medium quality", async () => {
    await ExportService.exportToPNG(SLIDE_HTML, { format: "png", quality: "medium" });
    const vp = page.setViewport.mock.calls[0]?.[0];
    expect(vp?.deviceScaleFactor).toBe(1.5);
  });

  it("sets deviceScaleFactor = 1 for low quality", async () => {
    await ExportService.exportToPNG(SLIDE_HTML, { format: "png", quality: "low" });
    const vp = page.setViewport.mock.calls[0]?.[0];
    expect(vp?.deviceScaleFactor).toBe(1);
  });

  it("closes the browser on success", async () => {
    await ExportService.exportToPNG(SLIDE_HTML, { format: "png" });
    expect(browser.close).toHaveBeenCalledOnce();
  });

  it("throws descriptive error and closes browser on page.screenshot failure", async () => {
    page.screenshot.mockRejectedValueOnce(new Error("Screenshot failed"));
    await expect(ExportService.exportToPNG(SLIDE_HTML, { format: "png" }))
      .rejects.toThrow(/Failed to export to PNG/);
    expect(browser.close).toHaveBeenCalledOnce();
  });

  it("calls screenshot for each slide individually", async () => {
    await ExportService.exportToPNG(SLIDE_HTML, { format: "png" });
    expect(page.screenshot).toHaveBeenCalledTimes(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ExportService.exportToHTML
// ─────────────────────────────────────────────────────────────────────────────

describe("ExportService.exportToHTML", () => {
  it("returns a string starting with <!DOCTYPE html>", async () => {
    const html = await ExportService.exportToHTML(SLIDE_HTML, CSS_CONTENT, { format: "html" });
    expect(typeof html).toBe("string");
    expect(html.trim()).toMatch(/^<!DOCTYPE html>/i);
  });

  it("embeds the CSS content into the output", async () => {
    const html = await ExportService.exportToHTML(SLIDE_HTML, CSS_CONTENT, { format: "html" });
    expect(html).toContain("font-family: sans-serif");
  });

  it("embeds the original presentation HTML", async () => {
    const html = await ExportService.exportToHTML(SLIDE_HTML, CSS_CONTENT, { format: "html" });
    expect(html).toContain("Slide 1");
    expect(html).toContain("Slide 2");
  });

  it("includes keyboard navigation script", async () => {
    const html = await ExportService.exportToHTML(SLIDE_HTML, CSS_CONTENT, { format: "html" });
    expect(html).toContain("ArrowLeft");
    expect(html).toContain("ArrowRight");
  });

  it("includes print-specific CSS", async () => {
    const html = await ExportService.exportToHTML(SLIDE_HTML, CSS_CONTENT, { format: "html" });
    expect(html).toContain("@media print");
    expect(html).toContain("page-break-after");
  });

  it("includes prev/next navigation buttons", async () => {
    const html = await ExportService.exportToHTML(SLIDE_HTML, CSS_CONTENT, { format: "html" });
    expect(html).toContain("prevBtn");
    expect(html).toContain("nextBtn");
  });

  it("works with empty CSS", async () => {
    const html = await ExportService.exportToHTML(SLIDE_HTML, "", { format: "html" });
    expect(html.trim()).toMatch(/^<!DOCTYPE html>/i);
  });

  it("works with Unicode / Hindi slide content", async () => {
    const hindiHTML = `<div data-slide>प्रेजेंटेशन</div>`;
    const html = await ExportService.exportToHTML(hindiHTML, CSS_CONTENT, { format: "html" });
    expect(html).toContain("प्रेजेंटेशन");
    // Meta charset must be present for proper encoding
    expect(html).toContain(`charset="UTF-8"`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ExportService.getFileExtension / getMimeType
// ─────────────────────────────────────────────────────────────────────────────

describe("ExportService.getFileExtension", () => {
  it("returns pdf for pdf format", () => {
    expect(ExportService.getFileExtension("pdf")).toBe("pdf");
  });

  it("returns html for html format", () => {
    expect(ExportService.getFileExtension("html")).toBe("html");
  });

  it("returns zip for png format (slides zipped)", () => {
    expect(ExportService.getFileExtension("png")).toBe("zip");
  });

  it("returns pptx for pptx format", () => {
    expect(ExportService.getFileExtension("pptx")).toBe("pptx");
  });
});

describe("ExportService.getMimeType", () => {
  it("returns application/pdf for pdf", () => {
    expect(ExportService.getMimeType("pdf")).toBe("application/pdf");
  });

  it("returns correct MIME for pptx", () => {
    expect(ExportService.getMimeType("pptx")).toContain("presentationml");
  });

  it("returns application/zip for png", () => {
    expect(ExportService.getMimeType("png")).toBe("application/zip");
  });

  it("returns text/html for html", () => {
    expect(ExportService.getMimeType("html")).toBe("text/html");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ExportOptions shape validation (type-level guard tests)
// ─────────────────────────────────────────────────────────────────────────────

describe("ExportOptions – format handling", () => {
  let page: ReturnType<typeof makeMockPage>;
  let browser: ReturnType<typeof makeMockBrowser>;

  beforeEach(() => {
    page = makeMockPage();
    browser = makeMockBrowser(page);
    mockLaunch.mockResolvedValue(browser);
  });

  const formats: ExportOptions["format"][] = ["pdf", "pptx", "png", "html"];
  it.each(formats)("getFileExtension returns string for format '%s'", (fmt) => {
    expect(typeof ExportService.getFileExtension(fmt)).toBe("string");
  });

  it.each(formats)("getMimeType returns non-empty string for format '%s'", (fmt) => {
    const mime = ExportService.getMimeType(fmt);
    expect(typeof mime).toBe("string");
    expect(mime.length).toBeGreaterThan(0);
  });
});
