"use server";

import { auth } from "@/server/auth";
import { AISlideEnhancer, type SlideEnhancementResult } from "@/lib/ai-slide-enhancer";
import { AIInsightsService } from "@/lib/ai-insights-service";
import { logger } from "@/lib/logger";

/**
 * Server action to enhance a slide with AI
 */
export async function enhanceSlideAction(
  slideContent: string,
  slideIndex: number,
  options: {
    rephrase?: boolean;
    shorten?: boolean;
    improveStructure?: boolean;
    suggestLayouts?: boolean;
    addVisuals?: boolean;
    tone?: "professional" | "casual" | "academic" | "creative";
  } = {}
): Promise<{ success: boolean; data?: SlideEnhancementResult; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await AISlideEnhancer.enhanceSlide(
      slideContent,
      slideIndex,
      options
    );

    logger.info("Slide enhanced via action", {
      userId: session.user.id,
      slideIndex,
    });

    return { success: true, data: result };
  } catch (error) {
    logger.error("Enhance slide action error", error as Error);
    return { success: false, error: "Failed to enhance slide" };
  }
}

/**
 * Server action to rephrase slide content
 */
export async function rephraseContentAction(
  content: string,
  tone: "professional" | "casual" | "academic" | "creative" = "professional"
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await AISlideEnhancer.rephraseContent(content, tone);

    return { success: true, data: result };
  } catch (error) {
    logger.error("Rephrase content action error", error as Error);
    return { success: false, error: "Failed to rephrase content" };
  }
}

/**
 * Server action to shorten slide text
 */
export async function shortenTextAction(
  content: string,
  targetReduction: "minimal" | "moderate" | "aggressive" = "moderate"
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await AISlideEnhancer.shortenText(content, targetReduction);

    return { success: true, data: result };
  } catch (error) {
    logger.error("Shorten text action error", error as Error);
    return { success: false, error: "Failed to shorten text" };
  }
}

/**
 * Server action to improve slide structure
 */
export async function improveStructureAction(
  content: string
): Promise<{
  success: boolean;
  data?: { restructuredContent: string; suggestions: string[] };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await AISlideEnhancer.improveStructure(content);

    return { success: true, data: result };
  } catch (error) {
    logger.error("Improve structure action error", error as Error);
    return { success: false, error: "Failed to improve structure" };
  }
}

/**
 * Server action to suggest visual layouts
 */
export async function suggestLayoutsAction(
  content: string,
  currentLayout?: string
): Promise<{
  success: boolean;
  data?: Array<{ name: string; description: string; rationale: string }>;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await AISlideEnhancer.suggestLayouts(content, currentLayout);

    return { success: true, data: result };
  } catch (error) {
    logger.error("Suggest layouts action error", error as Error);
    return { success: false, error: "Failed to suggest layouts" };
  }
}

/**
 * Server action to generate speaker notes
 */
export async function generateSpeakerNotesAction(
  slideContent: string,
  slideIndex: number,
  duration: number = 2
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await AIInsightsService.generateSpeakerNotes(
      slideContent,
      slideIndex,
      duration
    );

    return { success: true, data: result };
  } catch (error) {
    logger.error("Generate speaker notes action error", error as Error);
    return { success: false, error: "Failed to generate speaker notes" };
  }
}

/**
 * Server action to suggest images for slide
 */
export async function suggestImagesAction(
  slideContent: string,
  theme?: string
): Promise<{ success: boolean; data?: string[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await AIInsightsService.suggestImages(slideContent, theme);

    return { success: true, data: result };
  } catch (error) {
    logger.error("Suggest images action error", error as Error);
    return { success: false, error: "Failed to suggest images" };
  }
}

/**
 * Server action to fix grammar and improve readability
 */
export async function fixGrammarAction(
  content: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await AISlideEnhancer.fixGrammarAndReadability(content);

    return { success: true, data: result };
  } catch (error) {
    logger.error("Fix grammar action error", error as Error);
    return { success: false, error: "Failed to fix grammar" };
  }
}

/**
 * Server action to generate alternative versions of content
 */
export async function generateAlternativesAction(
  content: string,
  count: number = 3
): Promise<{ success: boolean; data?: string[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await AISlideEnhancer.generateAlternatives(content, count);

    return { success: true, data: result };
  } catch (error) {
    logger.error("Generate alternatives action error", error as Error);
    return { success: false, error: "Failed to generate alternatives" };
  }
}

/**
 * Server action to enhance multiple slides at once
 */
export async function enhanceMultipleSlidesAction(
  slides: Array<{ content: string; index: number }>,
  options: {
    rephrase?: boolean;
    shorten?: boolean;
    improveStructure?: boolean;
    suggestLayouts?: boolean;
    addVisuals?: boolean;
    tone?: "professional" | "casual" | "academic" | "creative";
  } = {}
): Promise<{
  success: boolean;
  data?: SlideEnhancementResult[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const results = await AISlideEnhancer.enhanceMultipleSlides(
      slides,
      options
    );

    logger.info("Multiple slides enhanced", {
      userId: session.user.id,
      count: slides.length,
    });

    return { success: true, data: results };
  } catch (error) {
    logger.error("Enhance multiple slides action error", error as Error);
    return { success: false, error: "Failed to enhance slides" };
  }
}
