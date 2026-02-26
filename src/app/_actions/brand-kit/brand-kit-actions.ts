"use server";

import { auth } from "@/server/auth";
import { BrandKitService, type BrandKitData } from "@/lib/brand-kit-service";
import { logger } from "@/lib/logger";

/**
 * Brand Kit Server Actions
 * Secure server-side operations for managing brand kits
 */

/**
 * Create a new brand kit
 */
export async function createBrandKitAction(data: BrandKitData) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate required fields
    if (!data.organizationName || !data.primaryColor) {
      return { success: false, error: "Organization name and primary color are required" };
    }

    const result = await BrandKitService.createBrandKit(session.user.id, data);

    if (result.success) {
      logger.info("Brand kit created via action", {
        brandKitId: result.brandKitId,
        userId: session.user.id
      });
    }

    return result;
  } catch (error) {
    logger.error("Brand kit creation action failed", error as Error);
    return { success: false, error: "Failed to create brand kit" };
  }
}

/**
 * Get all brand kits for the current user
 */
export async function getUserBrandKitsAction() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", brandKits: [] };
    }

    const result = await BrandKitService.getUserBrandKits(session.user.id);
    return result;
  } catch (error) {
    logger.error("Failed to fetch user brand kits", error as Error);
    return { success: false, error: "Failed to fetch brand kits", brandKits: [] };
  }
}

/**
 * Get the default brand kit for the current user
 */
export async function getDefaultBrandKitAction() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", brandKit: null };
    }

    const result = await BrandKitService.getDefaultBrandKit(session.user.id);
    return result;
  } catch (error) {
    logger.error("Failed to fetch default brand kit", error as Error);
    return { success: false, error: "Failed to fetch default brand kit", brandKit: null };
  }
}

/**
 * Get a specific brand kit by ID
 */
export async function getBrandKitByIdAction(brandKitId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await BrandKitService.getBrandKitById(brandKitId, session.user.id);
    return result;
  } catch (error) {
    logger.error("Failed to fetch brand kit", error as Error, { brandKitId });
    return { success: false, error: "Failed to fetch brand kit" };
  }
}

/**
 * Update an existing brand kit
 */
export async function updateBrandKitAction(
  brandKitId: string,
  data: Partial<BrandKitData>
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await BrandKitService.updateBrandKit(
      brandKitId,
      session.user.id,
      data
    );

    if (result.success) {
      logger.info("Brand kit updated via action", {
        brandKitId,
        userId: session.user.id
      });
    }

    return result;
  } catch (error) {
    logger.error("Brand kit update action failed", error as Error, { brandKitId });
    return { success: false, error: "Failed to update brand kit" };
  }
}

/**
 * Delete a brand kit
 */
export async function deleteBrandKitAction(brandKitId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await BrandKitService.deleteBrandKit(brandKitId, session.user.id);

    if (result.success) {
      logger.info("Brand kit deleted via action", {
        brandKitId,
        userId: session.user.id
      });
    }

    return result;
  } catch (error) {
    logger.error("Brand kit deletion action failed", error as Error, { brandKitId });
    return { success: false, error: "Failed to delete brand kit" };
  }
}

/**
 * Set a brand kit as default
 */
export async function setDefaultBrandKitAction(brandKitId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Update the brand kit to set isDefault = true
    // The service will automatically unset other defaults
    const result = await BrandKitService.updateBrandKit(
      brandKitId,
      session.user.id,
      { isDefault: true }
    );

    return result;
  } catch (error) {
    logger.error("Failed to set default brand kit", error as Error, { brandKitId });
    return { success: false, error: "Failed to set default brand kit" };
  }
}

/**
 * Get brand kit usage statistics
 */
export async function getBrandKitStatsAction(brandKitId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await BrandKitService.getBrandKitStats(brandKitId, session.user.id);
    return result;
  } catch (error) {
    logger.error("Failed to fetch brand kit stats", error as Error, { brandKitId });
    return { success: false, error: "Failed to fetch statistics" };
  }
}

/**
 * Validate brand kit colors
 */
export async function validateBrandColorsAction(colors: {
  primary: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
}) {
  try {
    const validation = BrandKitService.validateBrandColors(colors);
    return { success: true, validation };
  } catch (error) {
    logger.error("Failed to validate brand colors", error as Error);
    return {
      success: false,
      error: "Failed to validate colors",
      validation: { isValid: false, warnings: [], suggestions: [] }
    };
  }
}
