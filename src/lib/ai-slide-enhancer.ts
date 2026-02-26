import { OllamaService } from "./ollama-service";
import { logger } from "./logger";
import { type PlateSlide } from "@/components/presentation/utils/parser";

/**
 * AI Slide Enhancer Service
 * Provides comprehensive slide enhancement capabilities including:
 * - Rephrase content
 * - Shorten/improve text
 * - Improve structure
 * - Suggest layouts
 * - Add visual recommendations
 */

export interface SlideEnhancementResult {
  originalSlide: PlateSlide;
  enhancedContent: string;
  improvements: {
    rephrasedContent?: string;
    shortenedText?: string;
    structuralImprovements?: string[];
    layoutSuggestions?: string[];
    visualRecommendations?: string[];
  };
  confidence: number; // 0-100
  applied: boolean;
}

export interface EnhancementOptions {
  rephrase?: boolean;
  shorten?: boolean;
  improveStructure?: boolean;
  suggestLayouts?: boolean;
  addVisuals?: boolean;
  targetAudience?: string;
  tone?: "professional" | "casual" | "academic" | "creative";
}

export class AISlideEnhancer {
  /**
   * Main method: Enhance entire slide with all improvements
   * This is the "Make My Slides Better" feature
   */
  static async enhanceSlide(
    slideContent: string,
    slideIndex: number,
    options: EnhancementOptions = {}
  ): Promise<SlideEnhancementResult> {
    try {
      const {
        rephrase = true,
        shorten = true,
        improveStructure = true,
        suggestLayouts = true,
        addVisuals = true,
        targetAudience = "general audience",
        tone = "professional",
      } = options;

      const prompt = `You are an expert presentation designer and content writer. Analyze and enhance this slide:

**Slide ${slideIndex + 1}:**
${slideContent}

**Enhancement Requirements:**
${rephrase ? "- Rephrase content for better clarity and impact" : ""}
${shorten ? "- Shorten text while preserving key messages" : ""}
${improveStructure ? "- Improve information structure and hierarchy" : ""}
${suggestLayouts ? "- Suggest better visual layouts" : ""}
${addVisuals ? "- Recommend relevant visuals/graphics" : ""}

**Context:**
- Target Audience: ${targetAudience}
- Tone: ${tone}

**Return JSON format:**
{
  "enhancedContent": "<improved slide content>",
  "rephrasedContent": "<rephrased version>",
  "shortenedText": "<concise version>",
  "structuralImprovements": ["improvement 1", "improvement 2"],
  "layoutSuggestions": ["layout idea 1", "layout idea 2"],
  "visualRecommendations": ["visual 1", "visual 2", "visual 3"],
  "confidence": <0-100 score>
}`;

      const result = await OllamaService.generateWithFallback(prompt, {
        temperature: 0.4,
        maxTokens: 1500,
      });

      // Parse JSON response
      let jsonText = result.response;
      const jsonMatch = result.response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonText = jsonMatch[1];
      }

      const improvements = JSON.parse(jsonText);

      logger.info("Slide enhanced successfully", {
        slideIndex,
        confidence: improvements.confidence,
      });

      return {
        originalSlide: { content: slideContent, id: slideIndex.toString() } as unknown as PlateSlide,
        enhancedContent: improvements.enhancedContent,
        improvements: {
          rephrasedContent: improvements.rephrasedContent,
          shortenedText: improvements.shortenedText,
          structuralImprovements: improvements.structuralImprovements || [],
          layoutSuggestions: improvements.layoutSuggestions || [],
          visualRecommendations: improvements.visualRecommendations || [],
        },
        confidence: improvements.confidence || 85,
        applied: false,
      };
    } catch (error) {
      logger.error("Slide enhancement error", error as Error, { slideIndex });
      throw new Error("Failed to enhance slide. Please try again.");
    }
  }

  /**
   * Rephrase slide content for better clarity
   */
  static async rephraseContent(
    content: string,
    tone: "professional" | "casual" | "academic" | "creative" = "professional"
  ): Promise<string> {
    try {
      const prompt = `Rephrase this slide content to be more clear, engaging, and ${tone}:

${content}

Requirements:
- Maintain all key information
- Improve clarity and flow
- Use ${tone} tone
- Make it more impactful

Return ONLY the rephrased content, no explanations.`;

      const result = await OllamaService.generateWithFallback(prompt, {
        temperature: 0.5,
        maxTokens: 500,
      });

      return result.response.trim();
    } catch (error) {
      logger.error("Rephrase content error", error as Error);
      throw new Error("Failed to rephrase content");
    }
  }

  /**
   * Shorten slide text while preserving key messages
   */
  static async shortenText(
    content: string,
    targetReduction: "minimal" | "moderate" | "aggressive" = "moderate"
  ): Promise<string> {
    try {
      const reductionMap = {
        minimal: "10-20%",
        moderate: "30-40%",
        aggressive: "50%+",
      };

      const prompt = `Shorten this slide content by approximately ${reductionMap[targetReduction]}:

${content}

Requirements:
- Keep ALL key messages
- Remove redundancy and filler
- Use concise language
- Maintain clarity

Return ONLY the shortened content, no explanations.`;

      const result = await OllamaService.generateWithFallback(prompt, {
        temperature: 0.3,
        maxTokens: 400,
      });

      return result.response.trim();
    } catch (error) {
      logger.error("Shorten text error", error as Error);
      throw new Error("Failed to shorten text");
    }
  }

  /**
   * Improve slide structure and information hierarchy
   */
  static async improveStructure(
    content: string
  ): Promise<{
    restructuredContent: string;
    suggestions: string[];
  }> {
    try {
      const prompt = `Analyze and improve the structure of this slide:

${content}

Provide:
1. Restructured content with better hierarchy
2. Specific suggestions for organization

Return JSON:
{
  "restructuredContent": "<improved content with better structure>",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;

      const result = await OllamaService.generateWithFallback(prompt, {
        temperature: 0.4,
        maxTokens: 800,
      });

      let jsonText = result.response;
      const jsonMatch = result.response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonText = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonText);
      return {
        restructuredContent: parsed.restructuredContent,
        suggestions: parsed.suggestions || [],
      };
    } catch (error) {
      logger.error("Improve structure error", error as Error);
      throw new Error("Failed to improve structure");
    }
  }

  /**
   * Suggest better visual layouts for slide
   */
  static async suggestLayouts(
    content: string,
    currentLayout?: string
  ): Promise<Array<{ name: string; description: string; rationale: string }>> {
    try {
      const prompt = `Based on this slide content, suggest 3 effective visual layouts:

${content}

${currentLayout ? `Current Layout: ${currentLayout}` : ""}

Return JSON array:
[
  {
    "name": "<layout name>",
    "description": "<how to structure it>",
    "rationale": "<why this works>"
  }
]`;

      const result = await OllamaService.generateWithFallback(prompt, {
        temperature: 0.5,
        maxTokens: 600,
      });

      let jsonText = result.response;
      const jsonMatch = result.response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonText = jsonMatch[1];
      }

      return JSON.parse(jsonText);
    } catch (error) {
      logger.error("Suggest layouts error", error as Error);
      return [
        {
          name: "Title + Bullets",
          description: "Clear title with bullet points",
          rationale: "Simple and effective for most content",
        },
      ];
    }
  }

  /**
   * Enhance multiple slides at once
   */
  static async enhanceMultipleSlides(
    slides: Array<{ content: string; index: number }>,
    options: EnhancementOptions = {}
  ): Promise<SlideEnhancementResult[]> {
    const results: SlideEnhancementResult[] = [];

    for (const slide of slides) {
      try {
        const result = await AISlideEnhancer.enhanceSlide(
          slide.content,
          slide.index,
          options
        );
        results.push(result);
      } catch (error) {
        logger.error("Bulk enhancement error", error as Error, {
          slideIndex: slide.index,
        });
        // Continue with other slides even if one fails
      }
    }

    return results;
  }

  /**
   * Generate alternative versions of slide content
   */
  static async generateAlternatives(
    content: string,
    count: number = 3
  ): Promise<string[]> {
    try {
      const prompt = `Generate ${count} alternative versions of this slide content:

${content}

Requirements:
- Each version should convey the same message differently
- Vary the structure, word choice, and approach
- All versions should be professional and clear

Return JSON array:
["version 1", "version 2", "version 3"]`;

      const result = await OllamaService.generateWithFallback(prompt, {
        temperature: 0.7,
        maxTokens: 800,
      });

      let jsonText = result.response;
      const jsonMatch = result.response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonText = jsonMatch[1];
      }

      return JSON.parse(jsonText);
    } catch (error) {
      logger.error("Generate alternatives error", error as Error);
      return [];
    }
  }

  /**
   * Fix grammar and improve readability
   */
  static async fixGrammarAndReadability(content: string): Promise<string> {
    try {
      const prompt = `Fix grammar, spelling, and improve readability of this slide:

${content}

Requirements:
- Correct all grammatical errors
- Fix spelling mistakes
- Improve sentence structure
- Enhance readability
- Maintain original meaning

Return ONLY the corrected content.`;

      const result = await OllamaService.generateWithFallback(prompt, {
        temperature: 0.2,
        maxTokens: 500,
      });

      return result.response.trim();
    } catch (error) {
      logger.error("Fix grammar error", error as Error);
      throw new Error("Failed to fix grammar");
    }
  }
}
