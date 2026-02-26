"use server";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { BrandKitService } from "@/lib/brand-kit-service";
import { TemplateService } from "@/lib/template-service";
import { generateEnhancedModePrompt } from "@/lib/ai-mode-prompts";
import { logger } from "@/lib/logger";
import { type TemplateCategory } from "@prisma/client";

/**
 * Get enhanced prompt with template structure and brand kit guidelines
 * This action prepares the AI prompt with industry-specific requirements
 */
export async function getEnhancedPromptAction(
  presentationId: string,
  userInput: string
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get presentation to check for template category
    const presentation = await db.presentation.findUnique({
      where: { id: presentationId },
      select: {
        templateCategory: true,
        brandKitId: true,
      },
    });

    if (!presentation) {
      return { success: false, error: "Presentation not found" };
    }

    // Get user's default brand kit if not specified
    let brandKit = null as Awaited<ReturnType<typeof BrandKitService.getBrandKitById>>['brandKit'] | null;
    if (presentation.brandKitId) {
      const result = await BrandKitService.getBrandKitById(
        presentation.brandKitId,
        session.user.id
      );
      brandKit = result.brandKit ?? null;
    } else {
      const result = await BrandKitService.getDefaultBrandKit(session.user.id);
      brandKit = result.brandKit ?? null;

      // Update presentation with default brand kit
      if (brandKit) {
        await db.presentation.update({
          where: { id: presentationId },
          data: { brandKitId: brandKit.id },
        });
      }
    }

    // Generate advanced AI mode prompt with sophisticated instructions
    let enhancedPrompt = userInput;
    if (presentation.templateCategory) {
      // Use advanced AI mode prompts for structured, industry-specific generation
      enhancedPrompt = generateEnhancedModePrompt(
        presentation.templateCategory,
        userInput,
        brandKit
      );

      logger.info("Using advanced AI mode prompt", {
        presentationId,
        templateCategory: presentation.templateCategory,
        promptLength: enhancedPrompt.length,
      });
    } else if (brandKit) {
      // Add brand guidelines even without template
      enhancedPrompt += `\n\nBRAND GUIDELINES - STRICTLY FOLLOW:\n`;
      enhancedPrompt += `Organization: ${brandKit.organizationName}\n`;
      enhancedPrompt += `Primary Color: ${brandKit.primaryColor}\n`;
      if (brandKit.secondaryColor) enhancedPrompt += `Secondary Color: ${brandKit.secondaryColor}\n`;
      if (brandKit.headingFont) enhancedPrompt += `Heading Font: ${brandKit.headingFont}\n`;
      if (brandKit.bodyFont) enhancedPrompt += `Body Font: ${brandKit.bodyFont}\n`;
      enhancedPrompt += `\nMake sure all generated content aligns with ${brandKit.organizationName}'s brand identity.\n`;
    }

    // Get template structure if available
    let templateStructure = null as Awaited<ReturnType<typeof TemplateService.getTemplateStructure>> | null;
    if (presentation.templateCategory) {
      templateStructure = await TemplateService.getTemplateStructure(
        presentation.templateCategory
      ) ?? null;
    }

    // Apply brand theme if brand kit exists
    let brandTheme = null as ReturnType<typeof BrandKitService.applyBrandKitToTheme> | null;
    if (brandKit) {
      brandTheme = BrandKitService.applyBrandKitToTheme(brandKit);

      // Track brand kit usage
      await BrandKitService.trackBrandKitUsage(
        brandKit.id,
        presentationId,
        session.user.id
      );
    }

    logger.info("Enhanced prompt generated", {
      presentationId,
      templateCategory: presentation.templateCategory,
      hasBrandKit: !!brandKit,
      userId: session.user.id,
    });

    return {
      success: true,
      enhancedPrompt,
      templateStructure,
      brandTheme,
      templateCategory: presentation.templateCategory,
    };
  } catch (error) {
    logger.error("Failed to generate enhanced prompt", error as Error);
    return { success: false, error: "Failed to generate enhanced prompt" };
  }
}

/**
 * Get template info for a presentation
 */
export async function getTemplateInfoAction(presentationId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const presentation = await db.presentation.findUnique({
      where: { id: presentationId },
      select: {
        templateCategory: true,
        brandKitId: true,
        brandKit: {
          select: {
            organizationName: true,
            primaryColor: true,
            secondaryColor: true,
            logoUrl: true,
            headingFont: true,
            bodyFont: true,
          },
        },
      },
    });

    if (!presentation) {
      return { success: false, error: "Presentation not found" };
    }

    // Get template details
    let templateDetails = null as ReturnType<typeof TemplateService.getIndustryTemplates>[number] | undefined | null;
    if (presentation.templateCategory) {
      const templates = TemplateService.getIndustryTemplates();
      templateDetails = templates.find(
        (t) => t.category === presentation.templateCategory
      ) ?? null;
    }

    return {
      success: true,
      templateCategory: presentation.templateCategory,
      templateDetails,
      brandKit: presentation.brandKit,
    };
  } catch (error) {
    logger.error("Failed to get template info", error as Error);
    return { success: false, error: "Failed to get template info" };
  }
}
