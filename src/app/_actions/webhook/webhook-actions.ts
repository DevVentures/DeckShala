"use server";

import { auth } from "@/server/auth";
import { WebhookService, type WebhookEvent } from "@/lib/webhook-service";
import { logger } from "@/lib/logger";

/**
 * Register a new webhook
 */
export async function registerWebhook(url: string, events: WebhookEvent[]) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const result = await WebhookService.registerWebhook(
      session.user.id,
      url,
      events
    );

    return result;
  } catch (error) {
    logger.error("Register webhook error", error as Error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get user's webhooks
 */
export async function getUserWebhooks() {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const webhooks = await WebhookService.getUserWebhooks(session.user.id);

    return {
      success: true,
      webhooks,
    };
  } catch (error) {
    logger.error("Get user webhooks error", error as Error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(webhookId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const result = await WebhookService.deleteWebhook(
      webhookId,
      session.user.id
    );

    return result;
  } catch (error) {
    logger.error("Delete webhook error", error as Error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update webhook settings
 */
export async function updateWebhook(
  webhookId: string,
  updates: {
    url?: string;
    events?: WebhookEvent[];
    isActive?: boolean;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const result = await WebhookService.updateWebhook(
      webhookId,
      session.user.id,
      updates
    );

    return result;
  } catch (error) {
    logger.error("Update webhook error", error as Error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Test a webhook
 */
export async function testWebhook(webhookId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const result = await WebhookService.testWebhook(webhookId, session.user.id);

    return result;
  } catch (error) {
    logger.error("Test webhook error", error as Error);
    return { success: false, error: (error as Error).message };
  }
}
