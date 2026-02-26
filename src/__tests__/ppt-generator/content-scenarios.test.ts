/**
 * PPT Generator – Real-World Content Scenario Tests
 *
 * These tests verify that the inputs the platform receives in real-world
 * usage (especially from Indian users) pass validation, route correctly,
 * and produce the expected structural output.
 *
 * Scenario categories (mirroring real Indian AI PPT platform usage):
 *   1. Corporate / Business presentations
 *   2. Startup investor pitch decks (Indian VC context)
 *   3. Government scheme presentations
 *   4. Education / Academic (IIT, IIM style)
 *   5. Healthcare & pharma (Indian context)
 *   6. Technology & IT services
 *   7. Financial presentations (use of lakhs/crores)
 *   8. Hindi-language presentations
 *   9. Hinglish (code-switched) prompts
 *  10. Regional business context
 *  11. Edge-case content (empty slide content, very long titles, emoji)
 *  12. Multi-language outline entries
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PresentationInputSchema,
  SlidesGenerationSchema,
  sanitizeForXML,
} from "@/lib/validation";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildSlidesPayload(
  topic: string,
  slides = 8,
  language = "en-US",
  tone = "professional",
): Parameters<typeof SlidesGenerationSchema.parse>[0] {
  return {
    title: topic.slice(0, 100),
    prompt: topic,
    outline: Array.from({ length: slides }, (_, i) => `# Section ${i + 1}\n- Key point\n- Supporting detail`),
    language,
    tone,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Corporate / Business
// ─────────────────────────────────────────────────────────────────────────────

describe("Corporate & Business scenarios", () => {
  it("Q3 performance review for a large Indian conglomerate", () => {
    const result = PresentationInputSchema.parse({
      prompt: "Q3 2025 performance review for Tata Motors including EV sales and export data",
      numberOfCards: 10,
      language: "en-US",
    });
    expect(result.prompt).toContain("Tata Motors");
  });

  it("Annual general meeting presentation", () => {
    const result = PresentationInputSchema.parse({
      prompt: "Infosys annual shareholders meeting 2025 highlights and strategic roadmap",
      numberOfCards: 12,
      language: "en-US",
    });
    expect(result.numberOfCards).toBe(12);
  });

  it("Slides generation schema – corporate board deck", () => {
    const result = SlidesGenerationSchema.parse(
      buildSlidesPayload("Wipro board strategy presentation for FY2026", 10),
    );
    expect(result.outline).toHaveLength(10);
  });

  it("ESG / Sustainability presentation", () => {
    const result = SlidesGenerationSchema.parse(
      buildSlidesPayload("Reliance Industries ESG report 2025 and Net Zero roadmap", 8),
    );
    expect(result.tone).toBe("professional");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Startup Investor Pitch Deck
// ─────────────────────────────────────────────────────────────────────────────

describe("Startup investor pitch deck scenarios", () => {
  it("Series A fundraise pitch for a fintech startup", () => {
    const result = PresentationInputSchema.parse({
      prompt: "Series A pitch deck for Finpay – UPI-based BNPL platform targeting Tier-2 India",
      numberOfCards: 12,
      language: "en-US",
    });
    expect(result.prompt).toContain("UPI");
  });

  it("Pre-seed deck with Indian numbers (₹ lakhs / crores)", () => {
    const result = SlidesGenerationSchema.parse(
      buildSlidesPayload(
        "AgriTech startup raising ₹50 lakhs seed round to scale precision farming in Maharashtra",
        8,
      ),
    );
    expect(result.prompt).toContain("lakhs");
  });

  it("Slides with TAM/SAM/SOM for Indian D2C market", () => {
    const result = SlidesGenerationSchema.parse(
      buildSlidesPayload(
        "Indian D2C beauty brand targeting 500 crore TAM in metro cities",
        10,
      ),
    );
    expect(result.outline).toHaveLength(10);
  });

  it("Y Combinator style pitch with problem-solution frame", () => {
    const result = PresentationInputSchema.parse({
      prompt: "YC-style pitch deck for an edtech startup solving last-mile learning in rural India",
      numberOfCards: 8,
      language: "en-US",
    });
    expect(result.numberOfCards).toBe(8);
  });

  it("Unicorn valuation story presentation", () => {
    const result = PresentationInputSchema.parse({
      prompt: "Zepto's path to $1 billion valuation – 10-minute delivery model and unit economics",
      numberOfCards: 10,
      language: "en-US",
    });
    expect(result.prompt).toContain("Zepto");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Government & Policy
// ─────────────────────────────────────────────────────────────────────────────

describe("Government scheme & policy presentations", () => {
  it("PM Kisan scheme overview in English", () => {
    const result = PresentationInputSchema.parse({
      prompt: "PM Kisan Samman Nidhi Yojana – beneficiaries, fund disbursement, and impact on small farmers",
      numberOfCards: 8,
      language: "en-US",
    });
    expect(result.prompt).toContain("PM Kisan");
  });

  it("Swachh Bharat Mission progress presentation in Hindi", () => {
    const result = PresentationInputSchema.parse({
      prompt: "स्वच्छ भारत मिशन – 2025 तक की प्रगति और ग्रामीण स्वच्छता की स्थिति",
      numberOfCards: 7,
      language: "hi",
    });
    expect(result.language).toBe("hi");
  });

  it("Digital India initiative for a state government", () => {
    const result = SlidesGenerationSchema.parse(
      buildSlidesPayload("Digital India 2025 – implementation status in Rajasthan", 9),
    );
    expect(result.outline).toHaveLength(9);
  });

  it("Union Budget highlights presentation", () => {
    const result = PresentationInputSchema.parse({
      prompt: "Union Budget 2025-26 key announcements for infrastructure, defence, and agriculture sectors",
      numberOfCards: 10,
      language: "en-US",
    });
    expect(result.numberOfCards).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Education / Academic
// ─────────────────────────────────────────────────────────────────────────────

describe("Education & academic presentations", () => {
  it("IIT research presentation on ML for healthcare", () => {
    const result = PresentationInputSchema.parse({
      prompt: "Deep learning approaches for early cancer detection using MRI imaging – IIT Bombay seminar",
      numberOfCards: 12,
      language: "en-US",
    });
    expect(result.numberOfCards).toBe(12);
  });

  it("IIM case study with financial data", () => {
    const result = SlidesGenerationSchema.parse(
      buildSlidesPayload(
        "Flipkart vs Amazon India – IIM Ahmedabad case study on competitive strategy and market share",
        10,
      ),
    );
    expect(result.tone).toBe("professional");
  });

  it("NEET preparation strategy presentation", () => {
    const result = PresentationInputSchema.parse({
      prompt: "NEET 2025 preparation strategy for Class 12 students – subject-wise study plan",
      numberOfCards: 8,
      language: "en-US",
    });
    expect(result.prompt).toContain("NEET");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Healthcare & Pharma
// ─────────────────────────────────────────────────────────────────────────────

describe("Healthcare & pharma presentations", () => {
  it("Sun Pharma investor update presentation", () => {
    const result = PresentationInputSchema.parse({
      prompt: "Sun Pharma Q4 FY2025 investor update – US market performance, generic pipeline, R&D",
      numberOfCards: 10,
      language: "en-US",
    });
    expect(result.prompt).toContain("Sun Pharma");
  });

  it("India digital health mission overview", () => {
    const result = SlidesGenerationSchema.parse(
      buildSlidesPayload("Ayushman Bharat Digital Mission – ABHA ID adoption and telemedicine growth", 8),
    );
    expect(result.outline).toHaveLength(8);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Technology & IT Services
// ─────────────────────────────────────────────────────────────────────────────

describe("Technology & IT Services presentations", () => {
  it("Generative AI implementation roadmap", () => {
    const result = SlidesGenerationSchema.parse(
      buildSlidesPayload(
        "Generative AI implementation roadmap for a mid-size Indian IT services company",
        10,
      ),
    );
    expect(result.outline).toHaveLength(10);
  });

  it("Cloud migration strategy for Indian bank", () => {
    const result = PresentationInputSchema.parse({
      prompt: "Cloud migration strategy for SBI – hybrid cloud model, security, compliance with RBI guidelines",
      numberOfCards: 10,
      language: "en-US",
    });
    expect(result.prompt).toContain("RBI");
  });

  it("DevOps transformation presentation", () => {
    const result = SlidesGenerationSchema.parse(
      buildSlidesPayload("DevOps transformation journey – CI/CD, Kubernetes, and platform engineering", 8),
    );
    expect(result.tone).toBe("professional");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Hindi-language presentations
// ─────────────────────────────────────────────────────────────────────────────

describe("Hindi-language presentations", () => {
  it("validates Hindi prompt", () => {
    const result = PresentationInputSchema.parse({
      prompt: "भारतीय अर्थव्यवस्था 2025 में पांच प्रमुख चुनौतियां और समाधान क्या हैं?",
      numberOfCards: 6,
      language: "hi",
    });
    expect(result.language).toBe("hi");
  });

  it("sanitises Hindi prompt for XML without breaking Devanagari", () => {
    const hindi = "भारत में <AI> तकनीक & डिजिटल ट्रांसफॉर्मेशन";
    const clean = sanitizeForXML(hindi);
    expect(clean).toContain("भारत में");
    expect(clean).not.toContain("<AI>");
    expect(clean).toContain("&lt;AI&gt;");
  });

  it("builds valid slides schema with Hindi outline", () => {
    const outline = [
      "# परिचय\n- AI क्या है?\n- भारत में स्थिति",
      "# उपयोग\n- स्वास्थ्य\n- शिक्षा",
      "# चुनौतियां\n- डेटा\n- इंफ्रास्ट्रक्चर",
    ];
    const result = SlidesGenerationSchema.parse({
      title: "भारत में आर्टिफिशियल इंटेलिजेंस",
      prompt: "भारत में AI का भविष्य",
      outline,
      language: "hi",
      tone: "educational",
    });
    expect(result.outline).toHaveLength(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Hinglish (code-switched) prompts
// ─────────────────────────────────────────────────────────────────────────────

describe("Hinglish (code-switched) prompts", () => {
  it("validates Hinglish startup pitch prompt", () => {
    const result = PresentationInputSchema.parse({
      prompt: "Hamara startup ek AI-powered logistics platform hai jo Tier-2 cities mein delivery optimize karta hai",
      numberOfCards: 8,
      language: "en-US",
    });
    expect(result.prompt).toContain("Tier-2 cities");
  });

  it("validates Hinglish corporate prompt", () => {
    const result = PresentationInputSchema.parse({
      prompt: "Company ka Q3 performance presentation jisme revenue growth aur new product launch cover ho",
      numberOfCards: 7,
      language: "en-US",
    });
    expect(result.numberOfCards).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Edge-case content
// ─────────────────────────────────────────────────────────────────────────────

describe("Edge-case content scenarios", () => {
  it("prompt with emoji passes validation", () => {
    const result = PresentationInputSchema.parse({
      prompt: "🚀 Future of Space Tech in India – ISRO, private players, and commercial satellites 🛰️",
      numberOfCards: 8,
      language: "en-US",
    });
    expect(result.prompt).toContain("ISRO");
  });

  it("prompt with numbers, ₹, % symbols passes validation", () => {
    const result = PresentationInputSchema.parse({
      prompt: "India's GDP growth at 7.3% in FY25 with ₹50 lakh crore budget - key drivers",
      numberOfCards: 8,
      language: "en-US",
    });
    expect(result.prompt).toContain("₹");
  });

  it("very long title is truncated gracefully in the slides schema", () => {
    const longTitle = "The Comprehensive Analysis of India's Rapidly Evolving AI Ecosystem Including Startups, Regulation, Investment Trends, Talent Pool, and International Collaborations in 2025";
    // Title max is 200 chars
    expect(() =>
      SlidesGenerationSchema.parse({
        title: longTitle.slice(0, 200),
        prompt: "India AI ecosystem deep dive",
        outline: ["# T1\n- P", "# T2\n- P", "# T3\n- P"],
        language: "en-US",
        tone: "professional",
      }),
    ).not.toThrow();
  });

  it("outline with special characters is accepted", () => {
    const result = SlidesGenerationSchema.parse({
      title: "Data & Analytics",
      prompt: "Big data strategy for Indian enterprises",
      outline: [
        "# Data Pipeline & ETL\n- Extract, Transform, Load\n- Real-time vs batch",
        "# Analytics & BI\n- Dashboards, KPIs\n- Power BI vs Tableau",
        "# AI/ML Integration\n- Model deployment\n- MLOps pipeline",
      ],
      language: "en-US",
      tone: "technical",
    });
    expect(result.outline[0]).toContain("&");
  });

  it("single-word title still fits within schema constraints", () => {
    const result = SlidesGenerationSchema.parse({
      title: "AI",
      prompt: "Artificial Intelligence overview for business leaders",
      outline: ["# Intro\n- What is AI\n- History", "# Uses\n- Industry\n- Impact", "# Future\n- AGI\n- Risks"],
      language: "en-US",
      tone: "executive",
    });
    expect(result.title).toBe("AI");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Multi-language outline entries
// ─────────────────────────────────────────────────────────────────────────────

describe("Multi-language outline entries", () => {
  const multiLangOutline = [
    "# Introduction – परिचय\n- Overview of the topic\n- भारत में स्थिति",
    "# Market Analysis – बाजार विश्लेषण\n- Market size: ₹2 lakh crore\n- Growth rate: 15% CAGR",
    "# Conclusion – निष्कर्ष\n- Key takeaways\n- Next steps",
  ];

  it("accepts outline with mixed English-Hindi content", () => {
    const result = SlidesGenerationSchema.parse({
      title: "India AI Market",
      prompt: "Mixed language presentation for bilingual audience",
      outline: multiLangOutline,
      language: "en-US",
      tone: "professional",
    });
    expect(result.outline).toHaveLength(3);
  });
});
