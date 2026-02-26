/**
 * Role-Based Access Control (RBAC) System
 * Comprehensive authorization and privilege management
 * 
 * Features:
 * - Role-based permissions
 * - Resource-level access control
 * - Permission inheritance
 * - Dynamic permission checking
 * - Audit logging
 */

import { logger } from "@/lib/logger";
import { SecurityAuditLogger } from "@/lib/security";

/**
 * User roles in the system
 */
export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
  VIEWER = "VIEWER",
  EDITOR = "EDITOR",
  GUEST = "GUEST",
}

/**
 * Resource types in the system
 */
export enum ResourceType {
  PRESENTATION = "PRESENTATION",
  TEMPLATE = "TEMPLATE",
  THEME = "THEME",
  BRAND_KIT = "BRAND_KIT",
  WEBHOOK = "WEBHOOK",
  USER = "USER",
  SETTINGS = "SETTINGS",
}

/**
 * Action types
 */
export enum Action {
  CREATE = "CREATE",
  READ = "READ",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  SHARE = "SHARE",
  EXPORT = "EXPORT",
  PUBLISH = "PUBLISH",
  MANAGE = "MANAGE",
}

/**
 * Permission definition
 */
interface Permission {
  resource: ResourceType;
  actions: Action[];
  conditions?: PermissionCondition[];
}

/**
 * Permission conditions
 */
interface PermissionCondition {
  field: string;
  operator: "eq" | "ne" | "in" | "nin" | "gt" | "lt";
  value: any;
}

/**
 * Role-Permission mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Admins have full access to everything
    { resource: ResourceType.PRESENTATION, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.SHARE, Action.EXPORT, Action.PUBLISH, Action.MANAGE] },
    { resource: ResourceType.TEMPLATE, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.SHARE, Action.PUBLISH, Action.MANAGE] },
    { resource: ResourceType.THEME, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.PUBLISH, Action.MANAGE] },
    { resource: ResourceType.BRAND_KIT, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.MANAGE] },
    { resource: ResourceType.WEBHOOK, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.MANAGE] },
    { resource: ResourceType.USER, actions: [Action.READ, Action.UPDATE, Action.DELETE, Action.MANAGE] },
    { resource: ResourceType.SETTINGS, actions: [Action.READ, Action.UPDATE, Action.MANAGE] },
  ],

  [UserRole.USER]: [
    // Users can manage their own resources
    { resource: ResourceType.PRESENTATION, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.SHARE, Action.EXPORT] },
    { resource: ResourceType.TEMPLATE, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE] },
    { resource: ResourceType.THEME, actions: [Action.READ, Action.UPDATE] },
    { resource: ResourceType.BRAND_KIT, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE] },
    { resource: ResourceType.WEBHOOK, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE] },
    { resource: ResourceType.USER, actions: [Action.READ, Action.UPDATE] }, // Own profile only
    { resource: ResourceType.SETTINGS, actions: [Action.READ, Action.UPDATE] }, // Own settings only
  ],

  [UserRole.EDITOR]: [
    // Editors can create and edit, but not delete
    { resource: ResourceType.PRESENTATION, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.EXPORT] },
    { resource: ResourceType.TEMPLATE, actions: [Action.READ, Action.UPDATE] },
    { resource: ResourceType.THEME, actions: [Action.READ] },
    { resource: ResourceType.BRAND_KIT, actions: [Action.READ, Action.UPDATE] },
    { resource: ResourceType.USER, actions: [Action.READ, Action.UPDATE] },
    { resource: ResourceType.SETTINGS, actions: [Action.READ, Action.UPDATE] },
  ],

  [UserRole.VIEWER]: [
    // Viewers can only read
    { resource: ResourceType.PRESENTATION, actions: [Action.READ, Action.EXPORT] },
    { resource: ResourceType.TEMPLATE, actions: [Action.READ] },
    { resource: ResourceType.THEME, actions: [Action.READ] },
    { resource: ResourceType.BRAND_KIT, actions: [Action.READ] },
    { resource: ResourceType.USER, actions: [Action.READ] },
    { resource: ResourceType.SETTINGS, actions: [Action.READ] },
  ],

  [UserRole.GUEST]: [
    // Guests have minimal access
    { resource: ResourceType.PRESENTATION, actions: [Action.READ] },
    { resource: ResourceType.TEMPLATE, actions: [Action.READ] },
    { resource: ResourceType.THEME, actions: [Action.READ] },
  ],
};

/**
 * Access Control Service
 */
export class AccessControl {
  /**
   * Check if user has permission
   */
  static hasPermission(
    userRole: UserRole,
    resource: ResourceType,
    action: Action,
    resourceOwnerId?: string,
    userId?: string
  ): boolean {
    // Admin always has permission
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    // Get role permissions
    const rolePermissions = ROLE_PERMISSIONS[userRole];
    if (!rolePermissions) {
      return false;
    }

    // Find permission for resource
    const permission = rolePermissions.find(p => p.resource === resource);
    if (!permission) {
      return false;
    }

    // Check if action is allowed
    if (!permission.actions.includes(action)) {
      return false;
    }

    // Check ownership for non-admin actions on USER and SETTINGS resources
    if (
      [ResourceType.USER, ResourceType.SETTINGS].includes(resource) &&
      resourceOwnerId &&
      userId &&
      resourceOwnerId !== userId
    ) {
      return false;
    }

    return true;
  }

  /**
   * Check if user can access resource
   */
  static async canAccess(
    userId: string,
    userRole: UserRole,
    resource: ResourceType,
    action: Action,
    resourceId?: string,
    db?: any
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check basic permission
      const hasBasicPermission = this.hasPermission(userRole, resource, action);
      if (!hasBasicPermission) {
        SecurityAuditLogger.logAccess(resource, action, userId, false);
        return { allowed: false, reason: "Insufficient permissions" };
      }

      // Check resource ownership for certain resources
      if (resourceId && db) {
        const ownershipCheck = await this.checkOwnership(
          userId,
          userRole,
          resource,
          resourceId,
          db
        );

        if (!ownershipCheck.allowed) {
          SecurityAuditLogger.logAccess(resource, action, userId, false);
          return ownershipCheck;
        }
      }

      SecurityAuditLogger.logAccess(resource, action, userId, true);
      return { allowed: true };
    } catch (error) {
      logger.error("Access control check failed", error as Error, { userId, resource, action });
      return { allowed: false, reason: "Access control error" };
    }
  }

  /**
   * Check resource ownership
   */
  private static async checkOwnership(
    userId: string,
    userRole: UserRole,
    resource: ResourceType,
    resourceId: string,
    db: any
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Admin can access everything
    if (userRole === UserRole.ADMIN) {
      return { allowed: true };
    }

    try {
      switch (resource) {
        case ResourceType.PRESENTATION:
          const presentation = await db.baseDocument.findUnique({
            where: { id: resourceId },
            select: { userId: true },
          });

          if (!presentation) {
            return { allowed: false, reason: "Resource not found" };
          }

          if (presentation.userId !== userId) {
            return { allowed: false, reason: "Not the owner" };
          }
          break;

        case ResourceType.TEMPLATE:
          const template = await db.presentationTemplate.findUnique({
            where: { id: resourceId },
            select: { createdBy: true, isPublic: true },
          });

          if (!template) {
            return { allowed: false, reason: "Resource not found" };
          }

          // Allow access to public templates
          if (template.isPublic) {
            return { allowed: true };
          }

          if (template.createdBy !== userId) {
            return { allowed: false, reason: "Not the owner" };
          }
          break;

        case ResourceType.BRAND_KIT:
          const brandKit = await db.brandKit.findUnique({
            where: { id: resourceId },
            select: { userId: true },
          });

          if (!brandKit) {
            return { allowed: false, reason: "Resource not found" };
          }

          if (brandKit.userId !== userId) {
            return { allowed: false, reason: "Not the owner" };
          }
          break;

        case ResourceType.WEBHOOK:
          const webhook = await db.webhook.findUnique({
            where: { id: resourceId },
            select: { userId: true },
          });

          if (!webhook) {
            return { allowed: false, reason: "Resource not found" };
          }

          if (webhook.userId !== userId) {
            return { allowed: false, reason: "Not the owner" };
          }
          break;

        default:
          // For other resources, allow if user has permission
          return { allowed: true };
      }

      return { allowed: true };
    } catch (error) {
      logger.error("Ownership check failed", error as Error, { userId, resource, resourceId });
      return { allowed: false, reason: "Ownership check error" };
    }
  }

  /**
   * Get user permissions
   */
  static getUserPermissions(userRole: UserRole): Permission[] {
    return ROLE_PERMISSIONS[userRole] || [];
  }

  /**
   * Check if user can perform action on own resource
   */
  static canModifyOwnResource(
    userRole: UserRole,
    resource: ResourceType,
    action: Action
  ): boolean {
    return this.hasPermission(userRole, resource, action);
  }

  /**
   * Get allowed actions for resource
   */
  static getAllowedActions(userRole: UserRole, resource: ResourceType): Action[] {
    const permissions = ROLE_PERMISSIONS[userRole];
    if (!permissions) return [];

    const permission = permissions.find(p => p.resource === resource);
    return permission?.actions || [];
  }
}

/**
 * Authorization middleware for server actions
 */
export function requireAuth(action: Action, resource: ResourceType) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Extract session from args (assume first arg or context)
      const session = args[0]?.session;

      if (!session || !session.user) {
        throw new Error("Unauthorized: No active session");
      }

      const userRole = session.user.role as UserRole;
      const userId = session.user.id;

      // Check permission
      const hasPermission = AccessControl.hasPermission(userRole, resource, action);
      if (!hasPermission) {
        SecurityAuditLogger.logAccess(resource, action, userId, false);
        throw new Error(`Forbidden: Insufficient permissions for ${action} on ${resource}`);
      }

      SecurityAuditLogger.logAccess(resource, action, userId, true);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Resource ownership validator
 */
export class OwnershipValidator {
  /**
   * Validate presentation ownership
   */
  static async validatePresentationOwnership(
    userId: string,
    presentationId: string,
    db: any
  ): Promise<boolean> {
    try {
      const presentation = await db.baseDocument.findUnique({
        where: { id: presentationId },
        select: { userId: true },
      });

      return presentation?.userId === userId;
    } catch (error) {
      logger.error("Presentation ownership validation failed", error as Error);
      return false;
    }
  }

  /**
   * Validate template ownership
   */
  static async validateTemplateOwnership(
    userId: string,
    templateId: string,
    db: any
  ): Promise<boolean> {
    try {
      const template = await db.presentationTemplate.findUnique({
        where: { id: templateId },
        select: { createdBy: true, isPublic: true },
      });

      // Public templates can be accessed by anyone
      if (template?.isPublic) return true;

      return template?.createdBy === userId;
    } catch (error) {
      logger.error("Template ownership validation failed", error as Error);
      return false;
    }
  }

  /**
   * Validate brand kit ownership
   */
  static async validateBrandKitOwnership(
    userId: string,
    brandKitId: string,
    db: any
  ): Promise<boolean> {
    try {
      const brandKit = await db.brandKit.findUnique({
        where: { id: brandKitId },
        select: { userId: true },
      });

      return brandKit?.userId === userId;
    } catch (error) {
      logger.error("Brand kit ownership validation failed", error as Error);
      return false;
    }
  }
}

/**
 * Permission helper functions
 */
export const PermissionHelpers = {
  /**
   * Check if user is admin
   */
  isAdmin(userRole: string): boolean {
    return userRole === UserRole.ADMIN;
  },

  /**
   * Check if user can create presentations
   */
  canCreatePresentations(userRole: string): boolean {
    return AccessControl.hasPermission(
      userRole as UserRole,
      ResourceType.PRESENTATION,
      Action.CREATE
    );
  },

  /**
   * Check if user can delete presentations
   */
  canDeletePresentations(userRole: string): boolean {
    return AccessControl.hasPermission(
      userRole as UserRole,
      ResourceType.PRESENTATION,
      Action.DELETE
    );
  },

  /**
   * Check if user can manage webhooks
   */
  canManageWebhooks(userRole: string): boolean {
    return AccessControl.hasPermission(
      userRole as UserRole,
      ResourceType.WEBHOOK,
      Action.MANAGE
    );
  },

  /**
   * Check if user can publish templates
   */
  canPublishTemplates(userRole: string): boolean {
    return AccessControl.hasPermission(
      userRole as UserRole,
      ResourceType.TEMPLATE,
      Action.PUBLISH
    );
  },
};
