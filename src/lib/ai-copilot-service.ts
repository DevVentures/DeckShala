import { logger } from "./logger";
import { OllamaService } from "./ollama-service";
import { type PlateSlide } from "@/components/presentation/utils/parser";

/**
 * Real-Time AI Co-Pilot Editor Service
 * Like Grammarly but for slides / Copilot inside PPT
 *
 * Features:
 * - Rewrite bullets for clarity
 * - Generate speaker notes automatically
 * - Suggest relevant images
 * - Fix grammar and spelling
 * - Simplify complex language
 * - Provide real-time suggestions
 * - Improve readability
 * - Ensure consistency
 */

export interface CopilotSuggestion {
  id: string;
  type:
  | "rewrite"
  | "grammar"
  | "simplify"
  | "speaker-notes"
  | "image"
  | "clarity"
  | "consistency";
  severity: "info" | "suggestion" | "warning" | "error";
  title: string;
  description: string;
  original: string;
  suggested: string;
  confidence: number; // 0-100
  position: {
    slideIndex: number;
    elementIndex?: number;
  };
}

export interface SpeakerNotes {
  slideIndex: number;
  notes: string;
  keyPoints: string[];
  talkingTime: number; // estimated seconds
  tips: string[];
}

export interface GrammarIssue {
  text: string;
  issue: string;
  correction: string;
  explanation: string;
  position: {
    start: number;
    end: number;
  };
}

export interface ImageSuggestion {
  context: string;
  query: string;
  relevance: number;
  placement: "background" | "inline" | "side";
  description: string;
}

export interface ReadabilityScore {
  score: number; // 0-100
  grade: "excellent" | "good" | "fair" | "poor";
  metrics: {
    avgSentenceLength: number;
    avgWordLength: number;
    complexWords: number;
    readingLevel: string;
  };
  suggestions: string[];
}

export class AICopilotService {
  private static activeSuggestions = new Map<string, CopilotSuggestion[]>();

  /**
   * Main entry: Analyze slide and provide real-time suggestions
   */
  static async analyzeSlide(
    slide: PlateSlide,
    slideIndex: number,
    options: {
      checkGrammar?: boolean;
      generateSpeakerNotes?: boolean;
      suggestImages?: boolean;
      simplifyLanguage?: boolean;
      checkReadability?: boolean;
    } = {}
  ): Promise<{
    suggestions: CopilotSuggestion[];
    speakerNotes?: SpeakerNotes;
    readability?: ReadabilityScore;
  }> {
    try {
      const slideText = AICopilotService.extractTextFromSlide(slide);
      const suggestions: CopilotSuggestion[] = [];

      // Run analyses in parallel
      const analyses = await Promise.all([
        options.checkGrammar ? AICopilotService.checkGrammar(slideText, slideIndex) : null,
        options.simplifyLanguage
          ? AICopilotService.simplifyLanguage(slideText, slideIndex)
          : null,
        AICopilotService.improveBullets(slideText, slideIndex),
        AICopilotService.checkClarity(slideText, slideIndex),
      ]);

      // Collect all suggestions
      analyses.forEach((analysis) => {
        if (analysis) {
          suggestions.push(...analysis);
        }
      });

      // Generate speaker notes if requested
      let speakerNotes: SpeakerNotes | undefined;
      if (options.generateSpeakerNotes) {
        speakerNotes = await AICopilotService.generateSpeakerNotes(slideText, slideIndex);
      }

      // Check readability if requested
      let readability: ReadabilityScore | undefined;
      if (options.checkReadability) {
        readability = AICopilotService.calculateReadability(slideText);
      }

      // Store active suggestions
      AICopilotService.activeSuggestions.set(`slide-${slideIndex}`, suggestions);

      logger.info("Copilot: Analysis complete", {
        slideIndex,
        suggestionsCount: suggestions.length,
      });

      return {
        suggestions,
        speakerNotes,
        readability,
      };
    } catch (error) {
      logger.error("Copilot: Analysis failed", error as Error, { slideIndex });
      throw error;
    }
  }

  /**
   * Check grammar and spelling
   */
  private static async checkGrammar(
    text: string,
    slideIndex: number
  ): Promise<CopilotSuggestion[]> {
    if (!text || text.length < 10) return [];

    const prompt = `
You are a grammar and spelling checker for presentation slides.

Analyze this text and identify issues:
${text}

Provide corrections in JSON format:
[
  {
    "text": "original text with issue",
    "issue": "description of the problem",
    "correction": "corrected text",
    "explanation": "why this is better"
  }
]

Focus on:
- Spelling errors
- Grammar mistakes
- Punctuation issues
- Capitalization
- Consistency

Return empty array if no issues found.
`;

    try {
      const response = await OllamaService.generateText(prompt, {
        temperature: 0.1,
        maxTokens: 800,
      });

      const issues: GrammarIssue[] = JSON.parse(response);

      return issues.map((issue, index) => ({
        id: `grammar-${slideIndex}-${index}`,
        type: "grammar",
        severity: "error" as const,
        title: "Grammar Issue",
        description: issue.issue,
        original: issue.text,
        suggested: issue.correction,
        confidence: 95,
        position: {
          slideIndex,
        },
      }));
    } catch (error) {
      logger.error("Grammar check failed", error as Error);
      return [];
    }
  }

  /**
   * Simplify complex language
   */
  private static async simplifyLanguage(
    text: string,
    slideIndex: number
  ): Promise<CopilotSuggestion[]> {
    if (!text || text.length < 20) return [];

    const prompt = `
Simplify this presentation text to make it clearer and more accessible.

Original:
${text}

Provide simplified versions of complex sentences or phrases in JSON format:
[
  {
    "original": "complex text",
    "simplified": "simplified version",
    "reason": "why this is better"
  }
]

Guidelines:
- Use shorter sentences
- Replace jargon with simple terms
- Active voice over passive
- Clear and direct language
- Maintain professionalism

Return empty array if text is already clear.
`;

    try {
      const response = await OllamaService.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
      });

      const simplifications = JSON.parse(response);

      return simplifications.map((simp: any, index: number) => ({
        id: `simplify-${slideIndex}-${index}`,
        type: "simplify",
        severity: "suggestion" as const,
        title: "Simplify Language",
        description: simp.reason,
        original: simp.original,
        suggested: simp.simplified,
        confidence: 85,
        position: {
          slideIndex,
        },
      }));
    } catch (error) {
      logger.error("Simplification failed", error as Error);
      return [];
    }
  }

  /**
   * Improve bullet points
   */
  private static async improveBullets(
    text: string,
    slideIndex: number
  ): Promise<CopilotSuggestion[]> {
    // Check if text contains bullet points
    if (!text.includes("•") && !text.includes("-") && !text.includes("*")) {
      return [];
    }

    const prompt = `
Improve these bullet points to be more impactful and clear:

${text}

Provide improved versions in JSON format:
[
  {
    "original": "original bullet",
    "improved": "improved bullet",
    "improvement": "what was improved"
  }
]

Guidelines:
- Start with strong action verbs
- Be concise (max 15 words)
- Parallel structure
- Specific and measurable
- Remove unnecessary words
`;

    try {
      const response = await OllamaService.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
      });

      const improvements = JSON.parse(response);

      return improvements.map((imp: any, index: number) => ({
        id: `bullet-${slideIndex}-${index}`,
        type: "rewrite",
        severity: "suggestion" as const,
        title: "Improve Bullet Point",
        description: imp.improvement,
        original: imp.original,
        suggested: imp.improved,
        confidence: 80,
        position: {
          slideIndex,
        },
      }));
    } catch (error) {
      logger.error("Bullet improvement failed", error as Error);
      return [];
    }
  }

  /**
   * Check clarity and suggest improvements
   */
  private static async checkClarity(
    text: string,
    slideIndex: number
  ): Promise<CopilotSuggestion[]> {
    if (!text || text.length < 30) return [];

    const prompt = `
Analyze this slide text for clarity issues:

${text}

Identify unclear or ambiguous statements in JSON format:
[
  {
    "issue": "what is unclear",
    "original": "unclear text",
    "clearer": "clearer version",
    "why": "explanation"
  }
]

Look for:
- Vague statements
- Ambiguous pronouns
- Unclear references
- Missing context
- Confusing structure
`;

    try {
      const response = await OllamaService.generateText(prompt, {
        temperature: 0.2,
        maxTokens: 800,
      });

      const clarityIssues = JSON.parse(response);

      return clarityIssues.map((issue: any, index: number) => ({
        id: `clarity-${slideIndex}-${index}`,
        type: "clarity",
        severity: "warning" as const,
        title: "Clarity Issue",
        description: issue.issue,
        original: issue.original,
        suggested: issue.clearer,
        confidence: 75,
        position: {
          slideIndex,
        },
      }));
    } catch (error) {
      logger.error("Clarity check failed", error as Error);
      return [];
    }
  }

  /**
   * Generate speaker notes automatically
   */
  static async generateSpeakerNotes(
    slideText: string,
    slideIndex: number
  ): Promise<SpeakerNotes> {
    const prompt = `
Generate comprehensive speaker notes for this slide:

${slideText}

Provide notes in JSON format:
{
  "notes": "detailed speaker notes (2-3 paragraphs)",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "tips": ["presentation tip 1", "tip 2"]
}

Include:
- What to say
- How to explain concepts
- Examples to mention
- Transitions to next slide
- Engagement techniques
`;

    try {
      const response = await OllamaService.generateText(prompt, {
        temperature: 0.4,
        maxTokens: 1200,
      });

      const notes = JSON.parse(response);

      // Estimate talking time (average 150 words per minute)
      const wordCount = notes.notes.split(/\s+/).length;
      const talkingTime = Math.ceil((wordCount / 150) * 60);

      return {
        slideIndex,
        notes: notes.notes,
        keyPoints: notes.keyPoints || [],
        talkingTime,
        tips: notes.tips || [],
      };
    } catch (error) {
      logger.error("Speaker notes generation failed", error as Error);
      return {
        slideIndex,
        notes: "Speaker notes could not be generated.",
        keyPoints: [],
        talkingTime: 60,
        tips: [],
      };
    }
  }

  /**
   * Suggest images for slide content
   */
  static async suggestImages(
    slideText: string,
    slideIndex: number
  ): Promise<CopilotSuggestion[]> {
    const prompt = `
Suggest relevant images for this slide:

${slideText}

Provide suggestions in JSON format:
[
  {
    "context": "what the image should show",
    "query": "search query for the image",
    "relevance": 85,
    "placement": "background|inline|side",
    "description": "detailed description"
  }
]

Limit to 2-3 highly relevant suggestions.
`;

    try {
      const response = await OllamaService.generateText(prompt, {
        temperature: 0.4,
        maxTokens: 600,
      });

      const images: ImageSuggestion[] = JSON.parse(response);

      return images.map((img, index) => ({
        id: `image-${slideIndex}-${index}`,
        type: "image",
        severity: "info" as const,
        title: "Image Suggestion",
        description: img.context,
        original: "",
        suggested: img.description,
        confidence: img.relevance,
        position: {
          slideIndex,
        },
      }));
    } catch (error) {
      logger.error("Image suggestion failed", error as Error);
      return [];
    }
  }

  /**
   * Calculate readability score
   */
  private static calculateReadability(text: string): ReadabilityScore {
    if (!text || text.length < 10) {
      return {
        score: 100,
        grade: "excellent",
        metrics: {
          avgSentenceLength: 0,
          avgWordLength: 0,
          complexWords: 0,
          readingLevel: "Elementary",
        },
        suggestions: [],
      };
    }

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/);
    const avgSentenceLength = words.length / (sentences.length || 1);
    const avgWordLength =
      words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const complexWords = words.filter((w) => w.length > 7).length;

    // Simple readability scoring
    let score = 100;
    score -= avgSentenceLength > 20 ? 20 : 0;
    score -= avgWordLength > 6 ? 15 : 0;
    score -= complexWords > words.length * 0.2 ? 15 : 0;

    const grade: "excellent" | "good" | "fair" | "poor" =
      score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "fair" : "poor";

    const suggestions: string[] = [];
    if (avgSentenceLength > 20) {
      suggestions.push("Break up long sentences for better clarity");
    }
    if (complexWords > words.length * 0.2) {
      suggestions.push("Simplify complex words for better understanding");
    }
    if (words.length > 50) {
      suggestions.push("Consider splitting content across multiple slides");
    }

    return {
      score,
      grade,
      metrics: {
        avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
        avgWordLength: Math.round(avgWordLength * 10) / 10,
        complexWords,
        readingLevel:
          score >= 80
            ? "Elementary"
            : score >= 60
              ? "High School"
              : "College",
      },
      suggestions,
    };
  }

  /**
   * Apply suggestion to slide
   */
  static applySuggestion(
    slide: PlateSlide,
    suggestion: CopilotSuggestion
  ): PlateSlide {
    // Clone slide
    const updatedSlide = { ...slide };

    // Replace original text with suggested text in content
    if (updatedSlide.content) {
      updatedSlide.content = AICopilotService.replaceText(
        updatedSlide.content,
        suggestion.original,
        suggestion.suggested
      );
    }

    return updatedSlide;
  }

  /**
   * Helper: Replace text in slide children
   */
  private static replaceText(
    children: any[],
    original: string,
    suggested: string
  ): any[] {
    return children.map((child) => {
      if (child.text && child.text.includes(original)) {
        return {
          ...child,
          text: child.text.replace(original, suggested),
        };
      }

      if (child.children) {
        return {
          ...child,
          children: AICopilotService.replaceText(child.children, original, suggested),
        };
      }

      return child;
    });
  }

  /**
   * Get active suggestions for a slide
   */
  static getActiveSuggestions(slideIndex: number): CopilotSuggestion[] {
    return AICopilotService.activeSuggestions.get(`slide-${slideIndex}`) || [];
  }

  /**
   * Clear suggestions
   */
  static clearSuggestions(slideIndex?: number): void {
    if (slideIndex !== undefined) {
      AICopilotService.activeSuggestions.delete(`slide-${slideIndex}`);
    } else {
      AICopilotService.activeSuggestions.clear();
    }
  }

  /**
   * Extract text from slide
   */
  private static extractTextFromSlide(slide: PlateSlide): string {
    const extractText = (node: any): string => {
      if (typeof node === "string") return node;
      if (node.text) return node.text;
      if (node.children) {
        return node.children.map(extractText).join(" ");
      }
      return "";
    };

    if (slide.content) {
      return slide.content.map(extractText).join(" ");
    }

    return "";
  }

  /**
   * Batch analyze multiple slides
   */
  static async analyzePresentationBatch(
    slides: PlateSlide[],
    options: Parameters<typeof AICopilotService.analyzeSlide>[2] = {}
  ): Promise<
    Map<
      number,
      {
        suggestions: CopilotSuggestion[];
        speakerNotes?: SpeakerNotes;
        readability?: ReadabilityScore;
      }
    >
  > {
    const results = new Map();

    // Analyze slides in parallel (in batches of 3 to avoid overwhelming the AI)
    const batchSize = 3;
    for (let i = 0; i < slides.length; i += batchSize) {
      const batch = slides.slice(i, i + batchSize);
      const analyses = await Promise.all(
        batch.map((slide, index) =>
          AICopilotService.analyzeSlide(slide, i + index, options)
        )
      );

      analyses.forEach((analysis, index) => {
        results.set(i + index, analysis);
      });
    }

    return results;
  }
}
