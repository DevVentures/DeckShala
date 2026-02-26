"use server";

import { ContentParserService } from "@/lib/content-parser-service";
import { AutoDesignEngine } from "@/lib/auto-design-engine";
import { AICopilotService } from "@/lib/ai-copilot-service";
import { logger } from "@/lib/logger";
import { type ContentInput } from "@/lib/content-parser-service";
import { type PlateSlide } from "@/components/presentation/utils/parser";
import { type BrandingRules } from "@/lib/auto-design-engine";

/**
 * Server Actions for Smart Content-to-Presentation Generator
 * Auto Design Engine, and AI Co-Pilot
 */

/**
 * Parse content and generate presentation
 */
export async function parseContentToPresentation(input: ContentInput) {
  try {
    logger.info("Action: parseContentToPresentation called", {
      type: input.type,
    });

    // Validate input
    ContentParserService.validateInput(input);

    // Parse and generate
    const presentation =
      await ContentParserService.parseAndGenerate(input);

    return {
      success: true,
      data: presentation,
    };
  } catch (error: any) {
    logger.error("Action: parseContentToPresentation failed", error as Error);
    return {
      success: false,
      error: error.message || "Failed to parse content",
    };
  }
}

/**
 * Parse text content specifically
 */
export async function parseTextContent(text: string) {
  try {
    const presentation = await ContentParserService.parseAndGenerate({
      type: "text",
      content: text,
    });

    return {
      success: true,
      data: presentation,
    };
  } catch (error: any) {
    logger.error("Action: parseTextContent failed", error as Error);
    return {
      success: false,
      error: error.message || "Failed to parse text content",
    };
  }
}

/**
 * Parse URL content
 */
export async function parseURLContent(url: string) {
  try {
    const presentation = await ContentParserService.parseAndGenerate({
      type: "url",
      content: url,
    });

    return {
      success: true,
      data: presentation,
    };
  } catch (error: any) {
    logger.error("Action: parseURLContent failed", error as Error);
    return {
      success: false,
      error: error.message || "Failed to parse URL content",
    };
  }
}

/**
 * Parse YouTube video
 */
export async function parseYouTubeVideo(url: string) {
  try {
    const presentation = await ContentParserService.parseAndGenerate({
      type: "youtube",
      content: url,
    });

    return {
      success: true,
      data: presentation,
    };
  } catch (error: any) {
    logger.error("Action: parseYouTubeVideo failed", error as Error);
    return {
      success: false,
      error: error.message || "Failed to parse YouTube video",
    };
  }
}

/**
 * Estimate slide count from content
 */
export async function estimateSlideCount(content: string) {
  try {
    const count = ContentParserService.estimateSlideCount(content);

    return {
      success: true,
      data: { estimatedSlides: count },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to estimate slide count",
    };
  }
}

/**
 * Auto-design entire presentation
 */
export async function autoDesignPresentation(
  slides: PlateSlide[],
  options: {
    branding?: BrandingRules;
    targetAudience?: string;
    presentationType?: string;
    preferredStyle?: string;
  } = {}
) {
  try {
    logger.info("Action: autoDesignPresentation called", {
      slidesCount: slides.length,
    });

    const result = await AutoDesignEngine.autoDesignPresentation(
      slides,
      options
    );

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    logger.error("Action: autoDesignPresentation failed", error as Error);
    return {
      success: false,
      error: error.message || "Failed to auto-design presentation",
    };
  }
}

/**
 * Get available design themes
 */
export async function getAvailableThemes() {
  try {
    const themes = AutoDesignEngine.getAvailableThemes();

    return {
      success: true,
      data: themes,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to get themes",
    };
  }
}

/**
 * Apply smart spacing to slide
 */
export async function applySmartSpacing(
  slide: PlateSlide,
  themeId: string
) {
  try {
    const themes = AutoDesignEngine.getAvailableThemes();
    const theme = themes.find((t) => t.id === themeId);

    if (!theme) {
      return {
        success: false,
        error: "Theme not found",
      };
    }

    const spacedSlide = AutoDesignEngine.applySmartSpacing(slide, theme);

    return {
      success: true,
      data: spacedSlide,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to apply spacing",
    };
  }
}

/**
 * Analyze slide with AI Co-Pilot
 */
export async function analyzeSlideWithCopilot(
  slide: PlateSlide,
  slideIndex: number,
  options: {
    checkGrammar?: boolean;
    generateSpeakerNotes?: boolean;
    suggestImages?: boolean;
    simplifyLanguage?: boolean;
    checkReadability?: boolean;
  } = {}
) {
  try {
    logger.info("Action: analyzeSlideWithCopilot called", { slideIndex });

    const result = await AICopilotService.analyzeSlide(
      slide,
      slideIndex,
      options
    );

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    logger.error("Action: analyzeSlideWithCopilot failed", error as Error);
    return {
      success: false,
      error: error.message || "Failed to analyze slide",
    };
  }
}

/**
 * Generate speaker notes for slide
 */
export async function generateSpeakerNotes(
  slideText: string,
  slideIndex: number
) {
  try {
    const notes = await AICopilotService.generateSpeakerNotes(
      slideText,
      slideIndex
    );

    return {
      success: true,
      data: notes,
    };
  } catch (error: any) {
    logger.error("Action: generateSpeakerNotes failed", error as Error);
    return {
      success: false,
      error: error.message || "Failed to generate speaker notes",
    };
  }
}

/**
 * Suggest images for slide
 */
export async function suggestImagesForSlide(
  slideText: string,
  slideIndex: number
) {
  try {
    const suggestions = await AICopilotService.suggestImages(
      slideText,
      slideIndex
    );

    return {
      success: true,
      data: suggestions,
    };
  } catch (error: any) {
    logger.error("Action: suggestImagesForSlide failed", error as Error);
    return {
      success: false,
      error: error.message || "Failed to suggest images",
    };
  }
}

/**
 * Apply copilot suggestion to slide
 */
export async function applyCopilotSuggestion(
  slide: PlateSlide,
  suggestionId: string,
  slideIndex: number
) {
  try {
    const suggestions = AICopilotService.getActiveSuggestions(slideIndex);
    const suggestion = suggestions.find((s) => s.id === suggestionId);

    if (!suggestion) {
      return {
        success: false,
        error: "Suggestion not found",
      };
    }

    const updatedSlide = AICopilotService.applySuggestion(slide, suggestion);

    return {
      success: true,
      data: updatedSlide,
    };
  } catch (error: any) {
    logger.error("Action: applyCopilotSuggestion failed", error as Error);
    return {
      success: false,
      error: error.message || "Failed to apply suggestion",
    };
  }
}

/**
 * Batch analyze entire presentation
 */
export async function analyzePresentationBatch(
  slides: PlateSlide[],
  options: {
    checkGrammar?: boolean;
    generateSpeakerNotes?: boolean;
    suggestImages?: boolean;
    simplifyLanguage?: boolean;
    checkReadability?: boolean;
  } = {}
) {
  try {
    logger.info("Action: analyzePresentationBatch called", {
      slidesCount: slides.length,
    });

    const results = await AICopilotService.analyzePresentationBatch(
      slides,
      options
    );

    // Convert Map to object for JSON serialization
    const resultsObj: Record<number, any> = {};
    results.forEach((value, key) => {
      resultsObj[key] = value;
    });

    return {
      success: true,
      data: resultsObj,
    };
  } catch (error: any) {
    logger.error("Action: analyzePresentationBatch failed", error as Error);
    return {
      success: false,
      error: error.message || "Failed to analyze presentation",
    };
  }
}

/**
 * Clear copilot suggestions
 */
export async function clearCopilotSuggestions(slideIndex?: number) {
  try {
    AICopilotService.clearSuggestions(slideIndex);

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to clear suggestions",
    };
  }
}

/**
 * Combined action: Parse, design, and analyze
 * This is the ultimate "one-click" solution
 */
export async function createSmartPresentation(
  input: ContentInput,
  options: {
    autoDesign?: boolean;
    branding?: BrandingRules;
    targetAudience?: string;
    presentationType?: string;
    analyzeCopilot?: boolean;
  } = {}
) {
  try {
    logger.info("Action: createSmartPresentation called", {
      type: input.type,
      autoDesign: options.autoDesign,
      analyzeCopilot: options.analyzeCopilot,
    });

    // Step 1: Parse content to presentation
    const presentation = await ContentParserService.parseAndGenerate(input);

    let designedSlides = presentation.slides;
    let theme: any ;
    let copilotAnalysis: any ;

    // Step 2: Auto-design if requested
    if (options.autoDesign) {
      const designResult = await AutoDesignEngine.autoDesignPresentation(
        presentation.slides,
        {
          branding: options.branding,
          targetAudience: options.targetAudience,
          presentationType: options.presentationType,
        }
      );

      designedSlides = designResult.designedSlides;
      theme = designResult.theme;
    }

    // Step 3: Analyze with copilot if requested
    if (options.analyzeCopilot) {
      const analysisResults =
        await AICopilotService.analyzePresentationBatch(designedSlides, {
          checkGrammar: true,
          generateSpeakerNotes: true,
          suggestImages: true,
          simplifyLanguage: true,
          checkReadability: true,
        });

      // Convert Map to object
      const analysisObj: Record<number, any> = {};
      analysisResults.forEach((value, key) => {
        analysisObj[key] = value;
      });

      copilotAnalysis = analysisObj;
    }

    return {
      success: true,
      data: {
        presentation: {
          ...presentation,
          slides: designedSlides,
        },
        theme,
        copilotAnalysis,
      },
    };
  } catch (error: any) {
    logger.error("Action: createSmartPresentation failed", error as Error);
    return {
      success: false,
      error: error.message || "Failed to create smart presentation",
    };
  }
}
