import { db } from "@/server/db";
import { logger } from "./logger";
import { type TemplateCategory } from "@prisma/client";

/**
 * Template Service
 * Handles industry-specific templates and AI generation patterns
 */

export interface TemplateStructure {
  slideStructure: SlideStructureDefinition[];
  aiGuidelines: string[];
  examplePrompts: { section: string; prompt: string }[];
}

export interface SlideStructureDefinition {
  slideNumber: number;
  title: string;
  purpose: string;
  requiredElements: string[];
  suggestedLayout: string;
  contentGuidelines: string[];
  aiPromptHints: string[];
}

export interface IndustryTemplate {
  category: TemplateCategory;
  displayName: string;
  description: string;
  icon: string;
  defaultSlideCount: number;
  requiredSections: string[];
  targetAudience: string;
  bestPractices: string[];
}

export class TemplateService {
  /**
   * Get all industry templates with metadata
   */
  static getIndustryTemplates(): IndustryTemplate[] {
    return [
      {
        category: "PITCH_DECK",
        displayName: "Pitch Deck",
        description: "Perfect for startups seeking investment. Follows YC-style structure.",
        icon: "🚀",
        defaultSlideCount: 12,
        requiredSections: [
          "Problem",
          "Solution",
          "Market Size",
          "Product Demo",
          "Business Model",
          "Traction",
          "Team",
          "Competition",
          "Financial Projections",
          "Ask",
        ],
        targetAudience: "Investors, VCs, Angels",
        bestPractices: [
          "Keep it under 15 slides",
          "Lead with the problem",
          "Show real traction data",
          "Clear ask and use of funds",
        ],
      },
      {
        category: "INVESTOR_DECK",
        displayName: "Investor Deck",
        description: "Detailed financial deck for Series A+ funding rounds",
        icon: "💰",
        defaultSlideCount: 20,
        requiredSections: [
          "Executive Summary",
          "Market Analysis",
          "Competitive Landscape",
          "Go-to-Market Strategy",
          "Financial Metrics",
          "Unit Economics",
          "Growth Projections",
          "Team & Advisors",
          "Risk Analysis",
          "Investment Terms",
        ],
        targetAudience: "Series A+ Investors, Investment Committees",
        bestPractices: [
          "Include detailed financial models",
          "Show cohort analysis",
          "Demonstrate PMF with metrics",
          "Address key risks proactively",
        ],
      },
      {
        category: "SALES_DECK",
        displayName: "Sales Deck",
        description: "Convert prospects into customers with value-driven storytelling",
        icon: "📈",
        defaultSlideCount: 15,
        requiredSections: [
          "Problem Statement",
          "Your Solution",
          "Key Features",
          "Benefits & ROI",
          "Case Studies",
          "Social Proof",
          "Pricing",
          "Implementation",
          "Next Steps",
        ],
        targetAudience: "Potential Customers, Decision Makers",
        bestPractices: [
          "Lead with customer pain points",
          "Quantify ROI with numbers",
          "Use real customer testimonials",
          "Clear call-to-action on every slide",
        ],
      },
      {
        category: "PRODUCT_LAUNCH",
        displayName: "Product Launch",
        description: "Announce new products with impact and excitement",
        icon: "🎯",
        defaultSlideCount: 10,
        requiredSections: [
          "The Big Reveal",
          "Why Now",
          "Key Features",
          "Customer Benefits",
          "Demo/Screenshots",
          "Pricing & Availability",
          "Launch Timeline",
          "Marketing Plan",
        ],
        targetAudience: "Internal Teams, Press, Customers",
        bestPractices: [
          "Build anticipation",
          "Show product in action",
          "Clear value proposition",
          "Strong visual storytelling",
        ],
      },
      {
        category: "MARKETING_PLAN",
        displayName: "Marketing Plan",
        description: "Strategic marketing roadmap with clear KPIs and tactics",
        icon: "📊",
        defaultSlideCount: 18,
        requiredSections: [
          "Executive Summary",
          "Market Analysis",
          "Target Audience",
          "Brand Positioning",
          "Campaign Strategy",
          "Channel Mix",
          "Content Calendar",
          "Budget Allocation",
          "KPIs & Metrics",
          "Timeline",
        ],
        targetAudience: "Marketing Teams, Leadership, Stakeholders",
        bestPractices: [
          "Data-driven insights",
          "Clear channel attribution",
          "Realistic budget allocation",
          "Measurable objectives",
        ],
      },
      {
        category: "QUARTERLY_REVIEW",
        displayName: "Quarterly Review",
        description: "Review performance, celebrate wins, align on next quarter",
        icon: "📅",
        defaultSlideCount: 16,
        requiredSections: [
          "Quarter Highlights",
          "Key Metrics",
          "Goals vs. Actuals",
          "Wins & Successes",
          "Challenges Faced",
          "Learnings",
          "Next Quarter Objectives",
          "Team Updates",
        ],
        targetAudience: "Internal Teams, Leadership, Board",
        bestPractices: [
          "Lead with wins",
          "Be transparent about challenges",
          "Show progress vs. goals",
          "Clear action items",
        ],
      },
      {
        category: "TECHNICAL_PRESENTATION",
        displayName: "Technical Presentation",
        description: "Deep technical content for engineering audiences",
        icon: "💻",
        defaultSlideCount: 20,
        requiredSections: [
          "Overview",
          "Architecture",
          "Technical Stack",
          "Implementation Details",
          "Code Examples",
          "Performance Metrics",
          "Security Considerations",
          "Scalability",
          "Future Work",
        ],
        targetAudience: "Engineers, Technical Teams, CTOs",
        bestPractices: [
          "Include code snippets",
          "Show architecture diagrams",
          "Discuss trade-offs",
          "Be technically accurate",
        ],
      },
      {
        category: "BUSINESS_PROPOSAL",
        displayName: "Business Proposal",
        description: "Win contracts with professional, persuasive proposals",
        icon: "📋",
        defaultSlideCount: 15,
        requiredSections: [
          "Executive Summary",
          "Understanding Your Needs",
          "Proposed Solution",
          "Methodology",
          "Timeline & Milestones",
          "Team & Expertise",
          "Pricing & Terms",
          "Why Choose Us",
          "Next Steps",
        ],
        targetAudience: "Potential Clients, Procurement Teams",
        bestPractices: [
          "Customize to client needs",
          "Show relevant experience",
          "Clear deliverables",
          "Competitive pricing rationale",
        ],
      },
      {
        category: "TRAINING_MATERIAL",
        displayName: "Training Material",
        description: "Educational content for onboarding and skill development",
        icon: "🎓",
        defaultSlideCount: 25,
        requiredSections: [
          "Learning Objectives",
          "Prerequisites",
          "Core Concepts",
          "Step-by-Step Guide",
          "Examples",
          "Practice Exercises",
          "Common Mistakes",
          "Best Practices",
          "Resources",
          "Assessment",
        ],
        targetAudience: "New Employees, Team Members, Students",
        bestPractices: [
          "Clear learning path",
          "Interactive examples",
          "Progressive difficulty",
          "Actionable takeaways",
        ],
      },
      {
        category: "CONFERENCE_TALK",
        displayName: "Conference Talk",
        description: "Engaging presentations for conferences and events",
        icon: "🎤",
        defaultSlideCount: 30,
        requiredSections: [
          "Hook/Opening",
          "About Me",
          "Problem Statement",
          "Journey/Story",
          "Solution/Insights",
          "Live Demo",
          "Key Takeaways",
          "Call to Action",
          "Q&A",
        ],
        targetAudience: "Conference Attendees, Community",
        bestPractices: [
          "Strong opening hook",
          "Tell a story",
          "High-quality visuals",
          "Practice timing",
        ],
      },
      {
        category: "CLASSROOM_PPT",
        displayName: "Classroom Presentation",
        description: "Educational presentations for academic settings",
        icon: "🏫",
        defaultSlideCount: 20,
        requiredSections: [
          "Title & Introduction",
          "Learning Goals",
          "Background/Context",
          "Main Content",
          "Examples & Illustrations",
          "Activities/Discussion",
          "Summary",
          "References",
        ],
        targetAudience: "Students, Teachers, Academic Audience",
        bestPractices: [
          "Clear learning objectives",
          "Engaging visuals",
          "Interactive elements",
          "Proper citations",
        ],
      },
      {
        category: "PROJECT_REPORT",
        displayName: "Project Report",
        description: "Professional project documentation and status updates",
        icon: "📄",
        defaultSlideCount: 15,
        requiredSections: [
          "Project Overview",
          "Objectives",
          "Methodology",
          "Timeline",
          "Progress to Date",
          "Key Findings",
          "Challenges & Solutions",
          "Budget Status",
          "Next Steps",
          "Conclusions",
        ],
        targetAudience: "Project Stakeholders, Management",
        bestPractices: [
          "Status-driven updates",
          "Risk identification",
          "Clear metrics",
          "Action items",
        ],
      },
    ];
  }

  /**
   * Get template structure for a specific category
   */
  static async getTemplateStructure(
    category: TemplateCategory
  ): Promise<TemplateStructure | null> {
    try {
      const template = await db.templateStructure.findFirst({
        where: { templateCategory: category },
      });

      if (!template) {
        return TemplateService.getDefaultStructureForCategory(category);
      }

      return template.slideStructure as unknown as TemplateStructure;
    } catch (error) {
      logger.error("Failed to fetch template structure", error as Error, { category });
      return TemplateService.getDefaultStructureForCategory(category);
    }
  }

  /**
   * Generate AI prompt based on template category
   */
  static generateAIPromptForTemplate(
    category: TemplateCategory,
    userInput: string,
    brandKit?: any
  ): string {
    const template = TemplateService.getIndustryTemplates().find((t) => t.category === category);

    if (!template) {
      return userInput;
    }

    let prompt = `Create a ${template.displayName} presentation about: ${userInput}\n\n`;
    prompt += `Target Audience: ${template.targetAudience}\n\n`;
    prompt += `Required Sections:\n${template.requiredSections.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n`;
    prompt += `Best Practices:\n${template.bestPractices.map((p) => `- ${p}`).join("\n")}\n\n`;

    if (brandKit) {
      prompt += `\nBRAND GUIDELINES - STRICTLY FOLLOW:\n`;
      prompt += `Organization: ${brandKit.organizationName}\n`;
      prompt += `Primary Color: ${brandKit.primaryColor}\n`;
      if (brandKit.secondaryColor) prompt += `Secondary Color: ${brandKit.secondaryColor}\n`;
      if (brandKit.headingFont) prompt += `Heading Font: ${brandKit.headingFont}\n`;
      if (brandKit.bodyFont) prompt += `Body Font: ${brandKit.bodyFont}\n`;
      prompt += `\nMake sure all generated content aligns with ${brandKit.organizationName}'s brand identity.\n`;
    }

    return prompt;
  }

  /**
   * Get default structure for a category (fallback)
   */
  private static getDefaultStructureForCategory(
    category: TemplateCategory
  ): TemplateStructure {
    const pitchDeckStructure: TemplateStructure = {
      slideStructure: [
        {
          slideNumber: 1,
          title: "Cover Slide",
          purpose: "Hook the audience and establish credibility",
          requiredElements: ["Company name", "Tagline", "Logo"],
          suggestedLayout: "centered",
          contentGuidelines: ["Keep it clean", "Strong visual identity"],
          aiPromptHints: ["Generate a compelling tagline", "Focus on the core value proposition"],
        },
        {
          slideNumber: 2,
          title: "Problem",
          purpose: "Establish the pain point you're solving",
          requiredElements: ["Problem statement", "Current situation", "Impact/cost"],
          suggestedLayout: "two-column",
          contentGuidelines: ["Make it relatable", "Use real data", "Show urgency"],
          aiPromptHints: ["Quantify the problem", "Use storytelling"],
        },
        {
          slideNumber: 3,
          title: "Solution",
          purpose: "Present your product as the answer",
          requiredElements: ["Your solution", "Key features", "How it solves the problem"],
          suggestedLayout: "feature-showcase",
          contentGuidelines: ["Clear value proposition", "Show product visually"],
          aiPromptHints: ["Highlight differentiation", "Keep it simple"],
        },
        {
          slideNumber: 4,
          title: "Market Size",
          purpose: "Prove there's a big opportunity",
          requiredElements: ["TAM", "SAM", "SOM", "Growth rate"],
          suggestedLayout: "data-visualization",
          contentGuidelines: ["Use credible sources", "Show growth trajectory"],
          aiPromptHints: ["Bottom-up calculation", "Market trends"],
        },
        {
          slideNumber: 5,
          title: "Traction",
          purpose: "Demonstrate validation and momentum",
          requiredElements: ["Key metrics", "Growth charts", "Milestones"],
          suggestedLayout: "metrics-dashboard",
          contentGuidelines: ["Real data only", "Show growth trajectory"],
          aiPromptHints: ["Focus on impressive metrics", "Show month-over-month growth"],
        },
      ],
      aiGuidelines: [
        "Keep slides concise - max 3-4 bullet points per slide",
        "Use data to support every claim",
        "Tell a compelling story arc",
        "Focus on why now and why you",
        "End with a clear ask",
      ],
      examplePrompts: [
        {
          section: "Problem",
          prompt: "Generate a problem statement for [industry] showing current pain points and their financial impact",
        },
        {
          section: "Solution",
          prompt: "Describe how [product] solves [problem] in 3 key features",
        },
        {
          section: "Traction",
          prompt: "Present growth metrics showing [X]% MoM growth with key milestones",
        },
      ],
    };

    // Return pitch deck by default (you could add other structures here)
    return pitchDeckStructure;
  }

  /**
   * Validate slide against template structure
   */
  static validateSlideStructure(
    slideContent: string,
    expectedStructure: SlideStructureDefinition
  ): { isValid: boolean; missing: string[]; suggestions: string[] } {
    const missing: string[] = [];
    const suggestions: string[] = [];

    // Check for required elements
    for (const element of expectedStructure.requiredElements) {
      if (!slideContent.toLowerCase().includes(element.toLowerCase())) {
        missing.push(element);
        suggestions.push(`Consider adding: ${element}`);
      }
    }

    // Check content length
    const wordCount = slideContent.split(/\s+/).length;
    if (wordCount > 100) {
      suggestions.push("Slide content is too long - aim for 30-50 words per slide");
    }

    return {
      isValid: missing.length === 0,
      missing,
      suggestions,
    };
  }

  /**
   * Get template by category from database
   */
  static async getTemplateByCategory(category: TemplateCategory) {
    try {
      const templates = await db.presentationTemplate.findMany({
        where: { templateCategory: category, isPublic: true },
        orderBy: { downloads: "desc" },
        take: 1,
      });

      return { success: true, template: templates[0] ?? null };
    } catch (error) {
      logger.error("Failed to fetch template by category", error as Error, { category });
      return { success: false, template: null };
    }
  }

  /**
   * Get all public templates grouped by category
   */
  static async getAllTemplates() {
    try {
      const templates = await db.presentationTemplate.findMany({
        where: { isPublic: true },
        orderBy: [{ templateCategory: "asc" }, { downloads: "desc" }],
      });

      return { success: true, templates };
    } catch (error) {
      logger.error("Failed to fetch all templates", error as Error);
      return { success: false, templates: [] };
    }
  }

  /**
   * Increment template usage count
   */
  static async trackTemplateUsage(templateId: string) {
    try {
      await db.presentationTemplate.update({
        where: { id: templateId },
        data: { downloads: { increment: 1 } },
      });

      logger.info("Template usage tracked", { templateId });
    } catch (error) {
      logger.error("Failed to track template usage", error as Error, { templateId });
      // Don't fail the main operation
    }
  }
}
