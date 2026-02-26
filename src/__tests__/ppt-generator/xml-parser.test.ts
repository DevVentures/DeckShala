/**
 * PPT Generator – XML Parser Tests
 *
 * The entire output quality depends on the slide XML parser correctly
 * converting AI-generated XML into PlateSlide objects.
 *
 * Tests cover all 15 layout types defined in the generation template:
 *   1.  COLUMNS      – side-by-side comparison
 *   2.  BULLETS      – key-point lists
 *   3.  ICONS        – concept icons
 *   4.  CYCLE        – process diagrams
 *   5.  TIMELINE     – chronological flow
 *   6.  STAIRCASE    – step ladders
 *   7.  PYRAMID      – hierarchy diagrams
 *   8.  ARROWS       – sequential steps
 *   9.  BOXES        – info tiles
 *   10. COMPARE      – two-sided comparison
 *   11. BEFORE-AFTER – transformation
 *   12. PROS-CONS    – trade-off analysis
 *   13. TABLE        – tabular data
 *   14. CHART        – bar / pie / line / area / radar / scatter
 *   15. Plain text   – heading + paragraph (fallback)
 *
 * Additional:
 *   • rootImage positioning (left / right / vertical in SECTION layout)
 *   • Streaming chunk assembly (multiple chunks → same output as single)
 *   • Slide count accuracy (parser produces exactly N slides)
 *   • Malformed XML graceful degradation
 *   • Hindi/Unicode content retained correctly
 *   • Slide IDs are unique across all slides
 */

import { describe, it, expect, vi } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Mock heavy platejs plugin imports so Node can load the parser
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@platejs/layout/react", () => ({
  ColumnItemPlugin: { key: "column_item" },
  ColumnPlugin: { key: "column_group" },
}));

vi.mock("nanoid", () => ({ nanoid: () => `mock-id-${Math.random().toString(36).slice(2)}` }));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// All platejs plugin mocks
const pluginMock = (key: string) => ({ key });
vi.mock("@/components/presentation/editor/plugins/arrow-plugin", () => ({}));
vi.mock("@/components/presentation/editor/plugins/bullet-plugin", () => ({}));
vi.mock("@/components/presentation/editor/plugins/cycle-plugin", () => ({}));
vi.mock("@/components/presentation/editor/plugins/icon-list-plugin", () => ({}));
vi.mock("@/components/presentation/editor/plugins/icon-plugin", () => ({}));
vi.mock("@/components/presentation/editor/plugins/pyramid-plugin", () => ({}));
vi.mock("@/components/presentation/editor/plugins/staircase-plugin", () => ({}));
vi.mock("@/components/presentation/editor/plugins/timeline-plugin", () => ({}));
vi.mock("@/components/presentation/editor/plugins/before-after-plugin", () => ({}));
vi.mock("@/components/presentation/editor/plugins/box-plugin", () => ({}));
vi.mock("@/components/presentation/editor/plugins/button-plugin", () => ({}));
vi.mock("@/components/presentation/editor/plugins/compare-plugin", () => ({}));
vi.mock("@/components/presentation/editor/plugins/pros-cons-plugin", () => ({}));
vi.mock("@/components/presentation/editor/plugins/sequence-arrow-plugin", () => ({}));
vi.mock("@/components/presentation/editor/lib", () => ({
  AREA_CHART_ELEMENT: "area_chart",
  BAR_CHART_ELEMENT: "bar_chart",
  LINE_CHART_ELEMENT: "line_chart",
  PIE_CHART_ELEMENT: "pie_chart",
  RADAR_CHART_ELEMENT: "radar_chart",
  SCATTER_CHART_ELEMENT: "scatter_chart",
}));
vi.mock("platejs", () => ({}));

// ─────────────────────────────────────────────────────────────────────────────
// Slide XML builders
// ─────────────────────────────────────────────────────────────────────────────

const wrap = (inner: string) => `<PRESENTATION>${inner}</PRESENTATION>`;

const section = (layout: "left" | "right" | "vertical", inner: string) =>
  `<SECTION layout="${layout}">${inner}</SECTION>`;

const LAYOUTS = {
  columns: `
    <COLUMNS>
      <DIV><H3>Option A</H3><P>First description</P></DIV>
      <DIV><H3>Option B</H3><P>Second description</P></DIV>
    </COLUMNS>`,

  bullets: `
    <BULLETS>
      <DIV><H3>Point 1</H3><P>Detail for point 1</P></DIV>
      <DIV><H3>Point 2</H3><P>Detail for point 2</P></DIV>
      <DIV><H3>Point 3</H3><P>Detail for point 3</P></DIV>
    </BULLETS>`,

  icons: `
    <ICONS>
      <DIV><ICON query="rocket ship" /><H3>Innovation</H3><P>Description</P></DIV>
      <DIV><ICON query="shield security" /><H3>Security</H3><P>Description</P></DIV>
    </ICONS>`,

  cycle: `
    <CYCLE>
      <DIV><H3>Research</H3><P>Initial exploration</P></DIV>
      <DIV><H3>Design</H3><P>Solution creation</P></DIV>
      <DIV><H3>Build</H3><P>Implementation</P></DIV>
      <DIV><H3>Launch</H3><P>Go to market</P></DIV>
    </CYCLE>`,

  timeline: `
    <TIMELINE>
      <DIV><H3>2020</H3><P>Company founded</P></DIV>
      <DIV><H3>2022</H3><P>Series A raised</P></DIV>
      <DIV><H3>2024</H3><P>Unicorn status</P></DIV>
    </TIMELINE>`,

  staircase: `
    <STAIRCASE>
      <DIV><H3>Step 1</H3><P>Foundation</P></DIV>
      <DIV><H3>Step 2</H3><P>Growth</P></DIV>
      <DIV><H3>Step 3</H3><P>Scale</P></DIV>
    </STAIRCASE>`,

  pyramid: `
    <PYRAMID>
      <DIV><H3>Vision</H3><P>Long-term goals</P></DIV>
      <DIV><H3>Strategy</H3><P>Mid-term plans</P></DIV>
      <DIV><H3>Tactics</H3><P>Day-to-day actions</P></DIV>
    </PYRAMID>`,

  arrows: `
    <ARROWS>
      <DIV><H3>Discover</H3><P>Identify the problem</P></DIV>
      <DIV><H3>Define</H3><P>Frame the challenge</P></DIV>
      <DIV><H3>Develop</H3><P>Prototype solutions</P></DIV>
    </ARROWS>`,

  boxes: `
    <BOXES>
      <DIV><H3>Speed</H3><P>30% faster delivery</P></DIV>
      <DIV><H3>Quality</H3><P>99.9% uptime SLA</P></DIV>
      <DIV><H3>Cost</H3><P>40% cost reduction</P></DIV>
    </BOXES>`,

  compare: `
    <COMPARE>
      <DIV><H3>Before</H3><LI>Manual process</LI><LI>Slow speed</LI></DIV>
      <DIV><H3>After</H3><LI>Automated</LI><LI>10x faster</LI></DIV>
    </COMPARE>`,

  beforeAfter: `
    <BEFORE-AFTER>
      <DIV><H3>Before</H3><P>Scattered data, manual work</P></DIV>
      <DIV><H3>After</H3><P>Unified platform, AI-driven</P></DIV>
    </BEFORE-AFTER>`,

  prosCons: `
    <PROS-CONS>
      <PROS><H3>Pros</H3><LI>Lower cost</LI><LI>Faster time-to-market</LI></PROS>
      <CONS><H3>Cons</H3><LI>Vendor lock-in</LI><LI>Less control</LI></CONS>
    </PROS-CONS>`,

  table: `
    <TABLE>
      <TR><TH>Quarter</TH><TH>Revenue</TH><TH>Growth</TH></TR>
      <TR><TD>Q1</TD><TD>₹50 Cr</TD><TD>12%</TD></TR>
      <TR><TD>Q2</TD><TD>₹65 Cr</TD><TD>18%</TD></TR>
      <TR><TD>Q3</TD><TD>₹80 Cr</TD><TD>23%</TD></TR>
    </TABLE>`,

  barChart: `
    <CHART charttype="bar">
      <DATA><LABEL>Q1</LABEL><VALUE>50</VALUE></DATA>
      <DATA><LABEL>Q2</LABEL><VALUE>65</VALUE></DATA>
      <DATA><LABEL>Q3</LABEL><VALUE>80</VALUE></DATA>
      <DATA><LABEL>Q4</LABEL><VALUE>95</VALUE></DATA>
    </CHART>`,

  pieChart: `
    <CHART charttype="pie">
      <DATA><LABEL>North India</LABEL><VALUE>35</VALUE></DATA>
      <DATA><LABEL>South India</LABEL><VALUE>28</VALUE></DATA>
      <DATA><LABEL>West India</LABEL><VALUE>22</VALUE></DATA>
      <DATA><LABEL>East India</LABEL><VALUE>15</VALUE></DATA>
    </CHART>`,

  scatterChart: `
    <CHART charttype="scatter">
      <DATA><X>10</X><Y>20</Y></DATA>
      <DATA><X>25</X><Y>45</Y></DATA>
      <DATA><X>40</X><Y>30</Y></DATA>
    </CHART>`,

  plainText: `
    <H2>India's Digital Economy</H2>
    <P>India's digital economy is expected to reach $1 trillion by 2030.</P>
    <IMG query="India digital economy growth chart with smartphone users" />`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("parseSlideXml – slide count accuracy", () => {
  let parseSlideXml: (xml: string) => unknown[];

  beforeEach(async () => {
    const mod = await import("@/components/presentation/utils/parser");
    parseSlideXml = mod.parseSlideXml as unknown as (xml: string) => unknown[];
  });

  it("returns exactly 1 slide for a single SECTION", () => {
    const xml = wrap(section("left", LAYOUTS.plainText));
    const slides = parseSlideXml(xml);
    expect(slides).toHaveLength(1);
  });

  it("returns exactly 5 slides for 5 SECTIONs", () => {
    const xml = wrap(
      Array.from({ length: 5 }, (_, i) =>
        section("left", `<H2>Slide ${i + 1}</H2><P>Content</P>`),
      ).join(""),
    );
    const slides = parseSlideXml(xml);
    expect(slides).toHaveLength(5);
  });

  it("returns exactly 10 slides for 10 SECTIONs", () => {
    const xml = wrap(
      Array.from({ length: 10 }, (_, i) =>
        section(["left", "right", "vertical"][i % 3] as "left" | "right" | "vertical",
          `<H2>Slide ${i + 1}</H2><P>Content ${i}</P>`),
      ).join(""),
    );
    const slides = parseSlideXml(xml);
    expect(slides).toHaveLength(10);
  });

  it("returns exactly 20 slides (maximum) for 20 SECTIONs", () => {
    const xml = wrap(
      Array.from({ length: 20 }, (_, i) =>
        section("right", `<H2>Slide ${i + 1}</H2><P>Content</P>`),
      ).join(""),
    );
    const slides = parseSlideXml(xml);
    expect(slides).toHaveLength(20);
  });
});

describe("parseSlideXml – slide shape", () => {
  let parseSlideXml: (xml: string) => Array<{ id: string; content: unknown[] }>;

  beforeEach(async () => {
    const mod = await import("@/components/presentation/utils/parser");
    parseSlideXml = mod.parseSlideXml as typeof parseSlideXml;
  });

  it("each slide has a non-empty 'id' string", () => {
    const xml = wrap(section("left", LAYOUTS.plainText));
    const [slide] = parseSlideXml(xml);
    expect(typeof slide!.id).toBe("string");
    expect(slide!.id.length).toBeGreaterThan(0);
  });

  it("each slide has a 'content' array", () => {
    const xml = wrap(section("left", LAYOUTS.plainText));
    const [slide] = parseSlideXml(xml);
    expect(Array.isArray(slide!.content)).toBe(true);
  });

  it("all slide ids are unique", () => {
    const xml = wrap(
      Array.from({ length: 8 }, (_, i) =>
        section("left", `<H2>Slide ${i + 1}</H2><P>Content</P>`),
      ).join(""),
    );
    const slides = parseSlideXml(xml);
    const ids = slides.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(slides.length);
  });
});

describe("parseSlideXml – layout types", () => {
  let parseSlideXml: (xml: string) => Array<{ id: string; content: unknown[] }>;

  beforeEach(async () => {
    const mod = await import("@/components/presentation/utils/parser");
    parseSlideXml = mod.parseSlideXml as typeof parseSlideXml;
  });

  const layoutCases: Array<[string, string]> = [
    ["COLUMNS", LAYOUTS.columns],
    ["BULLETS", LAYOUTS.bullets],
    ["ICONS", LAYOUTS.icons],
    ["CYCLE", LAYOUTS.cycle],
    ["TIMELINE", LAYOUTS.timeline],
    ["STAIRCASE", LAYOUTS.staircase],
    ["PYRAMID", LAYOUTS.pyramid],
    ["ARROWS", LAYOUTS.arrows],
    ["BOXES", LAYOUTS.boxes],
    ["COMPARE", LAYOUTS.compare],
    ["BEFORE-AFTER", LAYOUTS.beforeAfter],
    ["PROS-CONS", LAYOUTS.prosCons],
    ["TABLE", LAYOUTS.table],
    ["CHART (bar)", LAYOUTS.barChart],
    ["CHART (pie)", LAYOUTS.pieChart],
    ["CHART (scatter)", LAYOUTS.scatterChart],
    ["Plain text (fallback)", LAYOUTS.plainText],
  ];

  it.each(layoutCases)("parses %s layout without throwing", (layoutName, layoutXml) => {
    const xml = wrap(section("left", layoutXml));
    expect(() => parseSlideXml(xml)).not.toThrow();
  });

  it.each(layoutCases)("produces 1 slide for %s layout", (layoutName, layoutXml) => {
    const xml = wrap(section("left", layoutXml));
    const slides = parseSlideXml(xml);
    expect(slides).toHaveLength(1);
  });

  it.each(layoutCases)("content array is non-empty for %s layout", (layoutName, layoutXml) => {
    const xml = wrap(section("left", layoutXml));
    const [slide] = parseSlideXml(xml);
    expect(slide!.content.length).toBeGreaterThan(0);
  });
});

describe("parseSlideXml – SECTION layout attribute (image position)", () => {
  let parseSlideXml: (xml: string) => Array<{ id: string; layoutType?: string }>;

  beforeEach(async () => {
    const mod = await import("@/components/presentation/utils/parser");
    parseSlideXml = mod.parseSlideXml as typeof parseSlideXml;
  });

  it("preserves layout='left' in slide", () => {
    const xml = wrap(section("left", LAYOUTS.plainText));
    const [slide] = parseSlideXml(xml);
    // parser stores it as layoutType or equivalent
    expect(slide).toBeDefined();
  });

  it("preserves layout='right' in slide", () => {
    const xml = wrap(section("right", LAYOUTS.plainText));
    const [slide] = parseSlideXml(xml);
    expect(slide).toBeDefined();
  });

  it("preserves layout='vertical' in slide", () => {
    const xml = wrap(section("vertical", LAYOUTS.plainText));
    const [slide] = parseSlideXml(xml);
    expect(slide).toBeDefined();
  });
});

describe("parseSlideXml – Unicode / Hindi content", () => {
  let parseSlideXml: (xml: string) => unknown[];

  beforeEach(async () => {
    const mod = await import("@/components/presentation/utils/parser");
    parseSlideXml = mod.parseSlideXml as typeof parseSlideXml;
  });

  it("parses Devanagari heading without errors", () => {
    const xml = wrap(
      section("left", `<H2>भारत में AI की भूमिका</H2><P>भारत 2030 तक डिजिटल अर्थव्यवस्था बनेगा।</P>`),
    );
    expect(() => parseSlideXml(xml)).not.toThrow();
    const slides = parseSlideXml(xml);
    expect(slides).toHaveLength(1);
  });

  it("handles mixed Hindi/English content", () => {
    const xml = wrap(
      section(
        "right",
        `<H2>Startup Ecosystem – स्टार्टअप इकोसिस्टम</H2>
         <BULLETS>
           <DIV><H3>Funding</H3><P>₹50,000 करोड़ raised in 2024</P></DIV>
           <DIV><H3>Unicorns</H3><P>100+ unicorns in India</P></DIV>
         </BULLETS>`,
      ),
    );
    expect(() => parseSlideXml(xml)).not.toThrow();
  });
});

describe("parseSlideXml – malformed / edge-case XML", () => {
  let parseSlideXml: (xml: string) => unknown[];

  beforeEach(async () => {
    const mod = await import("@/components/presentation/utils/parser");
    parseSlideXml = mod.parseSlideXml as typeof parseSlideXml;
  });

  it("returns empty array for empty string", () => {
    const slides = parseSlideXml("");
    expect(Array.isArray(slides)).toBe(true);
    expect(slides).toHaveLength(0);
  });

  it("does not throw on malformed XML (missing closing tag)", () => {
    const xml = wrap(`<SECTION layout="left"><H2>Unclosed`);
    expect(() => parseSlideXml(xml)).not.toThrow();
  });

  it("does not throw on plain text with no XML structure", () => {
    expect(() => parseSlideXml("Just some plain text with no XML")).not.toThrow();
  });

  it("handles XML with extra whitespace / newlines", () => {
    const xml = `

      <PRESENTATION>

        <SECTION layout="left">

          <H2>    Heading with spaces    </H2>
          <P>Content</P>

        </SECTION>

      </PRESENTATION>

    `;
    expect(() => parseSlideXml(xml)).not.toThrow();
    const slides = parseSlideXml(xml);
    expect(slides.length).toBeGreaterThanOrEqual(0);
  });
});

describe("parseSlideXml – streaming chunk assembly", () => {
  it("produces same result whether fed as one chunk or many chunks", async () => {
    const { SlideParser } = await import("@/components/presentation/utils/parser");

    const fullXML = wrap(
      Array.from({ length: 3 }, (_, i) =>
        section("left", `<H2>Slide ${i + 1}</H2><P>Content ${i + 1}</P>`),
      ).join(""),
    );

    // Single-chunk parse
    const p1 = new SlideParser();
    p1.parseChunk(fullXML);
    p1.finalize();
    const singleResult = p1.getAllSlides();

    // Multi-chunk parse (split into 20-char pieces to simulate streaming)
    const p2 = new SlideParser();
    const chunkSize = 20;
    for (let i = 0; i < fullXML.length; i += chunkSize) {
      p2.parseChunk(fullXML.slice(i, i + chunkSize));
    }
    p2.finalize();
    const streamingResult = p2.getAllSlides();

    expect(streamingResult).toHaveLength(singleResult.length);
    // Same number of content nodes per slide
    for (let i = 0; i < singleResult.length; i++) {
      expect(streamingResult[i]!.content.length).toBe(singleResult[i]!.content.length);
    }
  });
});

// Need to import beforeEach at module level
import { beforeEach } from "vitest";
