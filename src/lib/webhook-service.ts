import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import crypto from "crypto";
import { sign } from "jsonwebtoken";

export type WebhookEvent =
  | "presentation.created"
  | "presentation.updated"
  | "presentation.deleted"
  | "presentation.shared"
  | "collaboration.started"
  | "collaboration.ended"
  | "comment.added"
  | "export.completed";

interface WebhookPayload {
  event: WebhookEvent;
  data: unknown;
  timestamp: string;
  presentationId?: string;
  userId?: string;
}

/**
 * Webhook Service for Third-Party Integrations
 * Allows external systems to receive real-time updates
 */
export class WebhookService {
  /**
   * Register a new webhook
   */
  static async registerWebhook(
    userId: string,
    url: string,
    events: WebhookEvent[]
  ): Promise<{ success: boolean; webhookId?: string; secret?: string; error?: string }> {
    try {
      // Validate URL
      new URL(url);

      // Generate a secret for signing payloads
      const secret = crypto.randomBytes(32).toString("hex");

      const webhook = await db.webhook.create({
        data: {
          userId,
          url,
          events,
          secret,
        },
      });

      logger.info("Webhook registered", { webhookId: webhook.id, userId, url });

      return {
        success: true,
        webhookId: webhook.id,
        secret,
      };
    } catch (error) {
      logger.error("Register webhook error", error as Error, { userId, url });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Trigger webhooks for an event
   */
  static async trigger(
    event: WebhookEvent,
    data: unknown,
    userId?: string,
    presentationId?: string
  ): Promise<void> {
    try {
      const webhooks = await db.webhook.findMany({
        where: {
          isActive: true,
          events: {
            has: event,
          },
          ...(userId && { userId }),
        },
      });

      if (webhooks.length === 0) {
        return;
      }

      const payload: WebhookPayload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        presentationId,
        userId,
      };

      // Send webhooks in parallel
      await Promise.allSettled(
        webhooks.map(webhook => this.sendWebhook(webhook.id, webhook.url, webhook.secret, payload))
      );

      logger.info("Webhooks triggered", {
        event,
        count: webhooks.length,
        presentationId,
      });
    } catch (error) {
      logger.error("Trigger webhook error", error as Error, { event, userId });
    }
  }

  /**
   * Send a webhook HTTP request
   */
  private static async sendWebhook(
    webhookId: string,
    url: string,
    secret: string,
    payload: WebhookPayload
  ): Promise<void> {
    try {
      // Sign the payload
      const signature = sign(payload, secret, { algorithm: "HS256" });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "User-Agent": "DeckShala-Webhook/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Update success metrics
      await db.webhook.update({
        where: { id: webhookId },
        data: {
          lastTriggeredAt: new Date(),
          failureCount: 0, // Reset on success
        },
      });

      logger.debug("Webhook sent successfully", { webhookId, url });
    } catch (error) {
      logger.error("Send webhook error", error as Error, { webhookId, url });

      // Increment failure count
      const webhook = await db.webhook.update({
        where: { id: webhookId },
        data: {
          failureCount: { increment: 1 },
        },
        select: { failureCount: true },
      });

      // Disable webhook after 10 consecutive failures
      if (webhook.failureCount >= 10) {
        await db.webhook.update({
          where: { id: webhookId },
          data: { isActive: false },
        });

        logger.warn("Webhook disabled after repeated failures", {
          webhookId,
          failureCount: webhook.failureCount,
        });
      }
    }
  }

  /**
   * Get user's webhooks
   */
  static async getUserWebhooks(userId: string): Promise<
    Array<{
      id: string;
      url: string;
      events: string[];
      isActive: boolean;
      lastTriggeredAt?: Date;
      failureCount: number;
      createdAt: Date;
    }>
  > {
    try {
      const webhooks = await db.webhook.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      return webhooks.map(webhook => ({
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        lastTriggeredAt: webhook.lastTriggeredAt ?? undefined,
        failureCount: webhook.failureCount,
        createdAt: webhook.createdAt,
      }));
    } catch (error) {
      logger.error("Get user webhooks error", error as Error, { userId });
      return [];
    }
  }

  /**
   * Delete a webhook
   */
  static async deleteWebhook(webhookId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await db.webhook.delete({
        where: {
          id: webhookId,
          userId, // Ensure user owns this webhook
        },
      });

      logger.info("Webhook deleted", { webhookId, userId });
      return { success: true };
    } catch (error) {
      logger.error("Delete webhook error", error as Error, { webhookId, userId });
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Update webhook settings
   */
  static async updateWebhook(
    webhookId: string,
    userId: string,
    updates: {
      url?: string;
      events?: WebhookEvent[];
      isActive?: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db.webhook.update({
        where: {
          id: webhookId,
          userId, // Ensure user owns this webhook
        },
        data: updates,
      });

      logger.info("Webhook updated", { webhookId, userId, updates });
      return { success: true };
    } catch (error) {
      logger.error("Update webhook error", error as Error, { webhookId, userId });
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Test a webhook by sending a test event
   */
  static async testWebhook(webhookId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const webhook = await db.webhook.findUnique({
        where: {
          id: webhookId,
          userId,
        },
      });

      if (!webhook) {
        return { success: false, error: "Webhook not found" };
      }

      const testPayload: WebhookPayload = {
        event: "presentation.created",
        data: {
          test: true,
          message: "This is a test webhook event",
        },
        timestamp: new Date().toISOString(),
        userId,
      };

      await this.sendWebhook(webhookId, webhook.url, webhook.secret, testPayload);

      return { success: true };
    } catch (error) {
      logger.error("Test webhook error", error as Error, { webhookId, userId });
      return { success: false, error: (error as Error).message };
    }
  }
}
