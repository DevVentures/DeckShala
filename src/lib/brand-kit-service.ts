import { db } from "@/server/db";
import { logger } from "./logger";
import { type TemplateCategory } from "@prisma/client";

/**
 * Brand Kit Service
 * Enterprise feature for managing company branding across presentations
 */

export interface BrandKitData {
  organizationName: string;
  isDefault?: boolean;
  logoUrl?: string;
  logoSecondaryUrl?: string;
  logoIconUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  colorPalette?: { name: string; hex: string }[];
  headingFont?: string;
  bodyFont?: string;
  fontPairings?: { heading: string; body: string }[];
  templateIds?: string[];
  customTemplates?: any;
  isPremium?: boolean;
  isEnterprise?: boolean;
  allowCustomization?: boolean;
}

export interface BrandColors {
  primary: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
  palette?: { name: string; hex: string }[];
}

export interface BrandTypography {
  heading?: string;
  body?: string;
  pairings?: { heading: string; body: string }[];
}

export class BrandKitService {
  /**
   * Create a new brand kit for a user/organization
   */
  static async createBrandKit(
    userId: string,
    data: BrandKitData
  ): Promise<{ success: boolean; brandKitId?: string; error?: string }> {
    try {
      // If this is set as default, unset any existing defaults for this user
      if (data.isDefault) {
        await db.brandKit.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const brandKit = await db.brandKit.create({
        data: {
          userId,
          organizationName: data.organizationName,
          isDefault: data.isDefault ?? false,
          logoUrl: data.logoUrl,
          logoSecondaryUrl: data.logoSecondaryUrl,
          logoIconUrl: data.logoIconUrl,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          accentColor: data.accentColor,
          backgroundColor: data.backgroundColor,
          textColor: data.textColor,
          colorPalette: data.colorPalette as any,
          headingFont: data.headingFont,
          bodyFont: data.bodyFont,
          fontPairings: data.fontPairings as any,
          templateIds: data.templateIds ?? [],
          customTemplates: data.customTemplates as any,
          isPremium: data.isPremium ?? false,
          isEnterprise: data.isEnterprise ?? false,
          allowCustomization: data.allowCustomization ?? true,
        },
      });

      logger.info("Brand kit created", { brandKitId: brandKit.id, userId });

      return { success: true, brandKitId: brandKit.id };
    } catch (error) {
      logger.error("Failed to create brand kit", error as Error, { userId });
      return { success: false, error: "Failed to create brand kit" };
    }
  }

  /**
   * Get all brand kits for a user
   */
  static async getUserBrandKits(userId: string) {
    try {
      const brandKits = await db.brandKit.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      });

      return { success: true, brandKits };
    } catch (error) {
      logger.error("Failed to fetch brand kits", error as Error, { userId });
      return { success: false, brandKits: [], error: "Failed to fetch brand kits" };
    }
  }

  /**
   * Get default brand kit for a user
   */
  static async getDefaultBrandKit(userId: string) {
    try {
      const brandKit = await db.brandKit.findFirst({
        where: { userId, isDefault: true },
      });

      return { success: true, brandKit };
    } catch (error) {
      logger.error("Failed to fetch default brand kit", error as Error, { userId });
      return { success: false, brandKit: null };
    }
  }

  /**
   * Get a specific brand kit by ID
   */
  static async getBrandKitById(brandKitId: string, userId: string) {
    try {
      const brandKit = await db.brandKit.findFirst({
        where: { id: brandKitId, userId },
      });

      if (!brandKit) {
        return { success: false, error: "Brand kit not found" };
      }

      return { success: true, brandKit };
    } catch (error) {
      logger.error("Failed to fetch brand kit", error as Error, { brandKitId });
      return { success: false, error: "Failed to fetch brand kit" };
    }
  }

  /**
   * Update an existing brand kit
   */
  static async updateBrandKit(
    brandKitId: string,
    userId: string,
    data: Partial<BrandKitData>
  ) {
    try {
      // If setting as default, unset other defaults
      if (data.isDefault) {
        await db.brandKit.updateMany({
          where: { userId, isDefault: true, NOT: { id: brandKitId } },
          data: { isDefault: false },
        });
      }

      const brandKit = await db.brandKit.update({
        where: { id: brandKitId, userId },
        data: {
          ...data,
          colorPalette: data.colorPalette as any,
          fontPairings: data.fontPairings as any,
          customTemplates: data.customTemplates as any,
        },
      });

      logger.info("Brand kit updated", { brandKitId, userId });

      return { success: true, brandKit };
    } catch (error) {
      logger.error("Failed to update brand kit", error as Error, { brandKitId });
      return { success: false, error: "Failed to update brand kit" };
    }
  }

  /**
   * Delete a brand kit
   */
  static async deleteBrandKit(brandKitId: string, userId: string) {
    try {
      await db.brandKit.delete({
        where: { id: brandKitId, userId },
      });

      logger.info("Brand kit deleted", { brandKitId, userId });

      return { success: true };
    } catch (error) {
      logger.error("Failed to delete brand kit", error as Error, { brandKitId });
      return { success: false, error: "Failed to delete brand kit" };
    }
  }

  /**
   * Apply brand kit to presentation theme
   * Generates a custom theme based on brand kit colors and fonts
   */
  static applyBrandKitToTheme(brandKit: any): {
    colors: BrandColors;
    typography: BrandTypography;
    theme: any;
  } {
    const colors: BrandColors = {
      primary: brandKit.primaryColor,
      secondary: brandKit.secondaryColor,
      accent: brandKit.accentColor,
      background: brandKit.backgroundColor || "#FFFFFF",
      text: brandKit.textColor || "#000000",
      palette: brandKit.colorPalette as any,
    };

    const typography: BrandTypography = {
      heading: brandKit.headingFont || "Inter",
      body: brandKit.bodyFont || "Inter",
      pairings: brandKit.fontPairings as any,
    };

    // Generate theme object that can be used in presentation
    const theme = {
      name: `${brandKit.organizationName} Brand`,
      colors: {
        primary: colors.primary,
        secondary: colors.secondary || colors.primary,
        accent: colors.accent || colors.primary,
        background: colors.background,
        text: colors.text,
        ...(colors.palette && {
          palette: colors.palette.reduce(
            (acc, color) => ({ ...acc, [color.name]: color.hex }),
            {}
          ),
        }),
      },
      fonts: {
        heading: typography.heading,
        body: typography.body,
      },
      logos: {
        primary: brandKit.logoUrl,
        secondary: brandKit.logoSecondaryUrl,
        icon: brandKit.logoIconUrl,
      },
    };

    return { colors, typography, theme };
  }

  /**
   * Track brand kit usage for analytics
   */
  static async trackBrandKitUsage(
    brandKitId: string,
    presentationId: string,
    userId: string
  ) {
    try {
      await db.brandKitUsage.create({
        data: {
          brandKitId,
          presentationId,
          userId,
        },
      });

      logger.info("Brand kit usage tracked", { brandKitId, presentationId });
    } catch (error) {
      logger.error("Failed to track brand kit usage", error as Error);
      // Don't fail the main operation if tracking fails
    }
  }

  /**
   * Get brand kit usage statistics
   */
  static async getBrandKitStats(brandKitId: string, userId: string) {
    try {
      const usageCount = await db.brandKitUsage.count({
        where: { brandKitId },
      });

      const recentUsage = await db.brandKitUsage.findMany({
        where: { brandKitId },
        orderBy: { usedAt: "desc" },
        take: 10,
      });

      return { success: true, usageCount, recentUsage };
    } catch (error) {
      logger.error("Failed to fetch brand kit stats", error as Error);
      return { success: false, error: "Failed to fetch statistics" };
    }
  }

  /**
   * Validate brand kit colors (accessibility, contrast, etc.)
   */
  static validateBrandColors(colors: BrandColors): {
    isValid: boolean;
    warnings: string[];
    suggestions: string[];
  } {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check if colors are valid hex codes
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

    if (!hexPattern.test(colors.primary)) {
      warnings.push("Primary color is not a valid hex code");
    }

    // Check contrast ratio (simplified - would use proper WCAG algorithm in production)
    if (colors.background && colors.text) {
      const bgLuminance = BrandKitService.getRelativeLuminance(colors.background);
      const textLuminance = BrandKitService.getRelativeLuminance(colors.text);
      const contrast = (Math.max(bgLuminance, textLuminance) + 0.05) /
        (Math.min(bgLuminance, textLuminance) + 0.05);

      if (contrast < 4.5) {
        warnings.push("Text and background colors may not have sufficient contrast");
        suggestions.push("Consider using darker text or lighter background for better readability");
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      suggestions,
    };
  }

  /**
   * Calculate relative luminance (simplified)
   */
  private static getRelativeLuminance(hex: string): number {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
}
