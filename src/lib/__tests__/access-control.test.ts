import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AccessControl,
  UserRole,
  ResourceType,
  Action,
  OwnershipValidator,
  PermissionHelpers,
} from '@/lib/access-control';

describe('Access Control System', () => {
  describe('hasPermission', () => {
    it('should allow admin full access to all resources', () => {
      const resources = Object.values(ResourceType);
      const actions = Object.values(Action);

      resources.forEach(resource => {
        actions.forEach(action => {
          const result = AccessControl.hasPermission(
            UserRole.ADMIN,
            resource,
            action
          );
          expect(result).toBe(true);
        });
      });
    });

    it('should allow USER to manage their own presentations', () => {
      expect(
        AccessControl.hasPermission(UserRole.USER, ResourceType.PRESENTATION, Action.CREATE)
      ).toBe(true);

      expect(
        AccessControl.hasPermission(UserRole.USER, ResourceType.PRESENTATION, Action.READ)
      ).toBe(true);

      expect(
        AccessControl.hasPermission(UserRole.USER, ResourceType.PRESENTATION, Action.UPDATE)
      ).toBe(true);

      expect(
        AccessControl.hasPermission(UserRole.USER, ResourceType.PRESENTATION, Action.DELETE)
      ).toBe(true);
    });

    it('should prevent VIEWER from modifying resources', () => {
      expect(
        AccessControl.hasPermission(UserRole.VIEWER, ResourceType.PRESENTATION, Action.CREATE)
      ).toBe(false);

      expect(
        AccessControl.hasPermission(UserRole.VIEWER, ResourceType.PRESENTATION, Action.UPDATE)
      ).toBe(false);

      expect(
        AccessControl.hasPermission(UserRole.VIEWER, ResourceType.PRESENTATION, Action.DELETE)
      ).toBe(false);
    });

    it('should allow VIEWER to read and export', () => {
      expect(
        AccessControl.hasPermission(UserRole.VIEWER, ResourceType.PRESENTATION, Action.READ)
      ).toBe(true);

      expect(
        AccessControl.hasPermission(UserRole.VIEWER, ResourceType.PRESENTATION, Action.EXPORT)
      ).toBe(true);
    });

    it('should prevent EDITOR from deleting', () => {
      expect(
        AccessControl.hasPermission(UserRole.EDITOR, ResourceType.PRESENTATION, Action.DELETE)
      ).toBe(false);
    });

    it('should allow EDITOR to create and update', () => {
      expect(
        AccessControl.hasPermission(UserRole.EDITOR, ResourceType.PRESENTATION, Action.CREATE)
      ).toBe(true);

      expect(
        AccessControl.hasPermission(UserRole.EDITOR, ResourceType.PRESENTATION, Action.UPDATE)
      ).toBe(true);
    });

    it('should restrict GUEST access', () => {
      expect(
        AccessControl.hasPermission(UserRole.GUEST, ResourceType.PRESENTATION, Action.CREATE)
      ).toBe(false);

      expect(
        AccessControl.hasPermission(UserRole.GUEST, ResourceType.PRESENTATION, Action.READ)
      ).toBe(true);
    });

    it('should handle USER role settings access', () => {
      expect(
        AccessControl.hasPermission(UserRole.USER, ResourceType.SETTINGS, Action.READ)
      ).toBe(true);

      expect(
        AccessControl.hasPermission(UserRole.USER, ResourceType.SETTINGS, Action.UPDATE)
      ).toBe(true);

      expect(
        AccessControl.hasPermission(UserRole.USER, ResourceType.SETTINGS, Action.DELETE)
      ).toBe(false);
    });

    it('should restrict webhook management to specific roles', () => {
      expect(
        AccessControl.hasPermission(UserRole.ADMIN, ResourceType.WEBHOOK, Action.MANAGE)
      ).toBe(true);

      expect(
        AccessControl.hasPermission(UserRole.USER, ResourceType.WEBHOOK, Action.MANAGE)
      ).toBe(true);

      expect(
        AccessControl.hasPermission(UserRole.VIEWER, ResourceType.WEBHOOK, Action.MANAGE)
      ).toBe(false);
    });
  });

  describe('getAllowedActions', () => {
    it('should return all actions for ADMIN', () => {
      const actions = AccessControl.getAllowedActions(
        UserRole.ADMIN,
        ResourceType.PRESENTATION
      );

      expect(actions).toContain(Action.CREATE);
      expect(actions).toContain(Action.READ);
      expect(actions).toContain(Action.UPDATE);
      expect(actions).toContain(Action.DELETE);
      expect(actions).toContain(Action.SHARE);
      expect(actions).toContain(Action.EXPORT);
      expect(actions).toContain(Action.PUBLISH);
      expect(actions).toContain(Action.MANAGE);
    });

    it('should return limited actions for VIEWER', () => {
      const actions = AccessControl.getAllowedActions(
        UserRole.VIEWER,
        ResourceType.PRESENTATION
      );

      expect(actions).toContain(Action.READ);
      expect(actions).toContain(Action.EXPORT);
      expect(actions).not.toContain(Action.CREATE);
      expect(actions).not.toContain(Action.UPDATE);
      expect(actions).not.toContain(Action.DELETE);
    });

    it('should return correct actions for EDITOR', () => {
      const actions = AccessControl.getAllowedActions(
        UserRole.EDITOR,
        ResourceType.PRESENTATION
      );

      expect(actions).toContain(Action.CREATE);
      expect(actions).toContain(Action.READ);
      expect(actions).toContain(Action.UPDATE);
      expect(actions).toContain(Action.EXPORT);
      expect(actions).not.toContain(Action.DELETE);
    });
  });

  describe('canAccess', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {
        baseDocument: {
          findUnique: vi.fn(),
        },
        presentationTemplate: {
          findUnique: vi.fn(),
        },
        brandKit: {
          findUnique: vi.fn(),
        },
        webhook: {
          findUnique: vi.fn(),
        },
      };
    });

    it('should allow access without ownership check for ADMIN', async () => {
      const result = await AccessControl.canAccess(
        'admin-123',
        UserRole.ADMIN,
        ResourceType.PRESENTATION,
        Action.READ,
        'pres-456',
        mockDb
      );

      expect(result.allowed).toBe(true);
      expect(mockDb.baseDocument.findUnique).not.toHaveBeenCalled();
    });

    it('should check ownership for USER role', async () => {
      mockDb.baseDocument.findUnique.mockResolvedValue({
        id: 'pres-456',
        userId: 'user-123',
      });

      const result = await AccessControl.canAccess(
        'user-123',
        UserRole.USER,
        ResourceType.PRESENTATION,
        Action.UPDATE,
        'pres-456',
        mockDb
      );

      expect(result.allowed).toBe(true);
      expect(mockDb.baseDocument.findUnique).toHaveBeenCalledWith({
        where: { id: 'pres-456' },
        select: { userId: true },
      });
    });

    it('should deny access for non-owner USER', async () => {
      mockDb.baseDocument.findUnique.mockResolvedValue({
        id: 'pres-456',
        userId: 'other-user',
      });

      const result = await AccessControl.canAccess(
        'user-123',
        UserRole.USER,
        ResourceType.PRESENTATION,
        Action.UPDATE,
        'pres-456',
        mockDb
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('own');
    });

    it('should allow READ access for VIEWER without ownership', async () => {
      const result = await AccessControl.canAccess(
        'viewer-123',
        UserRole.VIEWER,
        ResourceType.PRESENTATION,
        Action.READ,
        'pres-456',
        mockDb
      );

      expect(result.allowed).toBe(true);
    });

    it('should handle missing resource gracefully', async () => {
      mockDb.baseDocument.findUnique.mockResolvedValue(null);

      const result = await AccessControl.canAccess(
        'user-123',
        UserRole.USER,
        ResourceType.PRESENTATION,
        Action.UPDATE,
        'nonexistent',
        mockDb
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('should handle database errors', async () => {
      mockDb.baseDocument.findUnique.mockRejectedValue(new Error('DB Error'));

      const result = await AccessControl.canAccess(
        'user-123',
        UserRole.USER,
        ResourceType.PRESENTATION,
        Action.UPDATE,
        'pres-456',
        mockDb
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Error');
    });
  });

  describe('checkOwnership', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {
        baseDocument: {
          findUnique: vi.fn(),
        },
        presentationTemplate: {
          findUnique: vi.fn(),
        },
        brandKit: {
          findUnique: vi.fn(),
        },
        webhook: {
          findUnique: vi.fn(),
        },
      };
    });

    it('should verify presentation ownership', async () => {
      mockDb.baseDocument.findUnique.mockResolvedValue({
        id: 'pres-123',
        userId: 'user-123',
      });

      const isOwner = await AccessControl.checkOwnership(
        'user-123',
        ResourceType.PRESENTATION,
        'pres-123',
        mockDb
      );

      expect(isOwner).toBe(true);
    });

    it('should verify template ownership', async () => {
      mockDb.presentationTemplate.findUnique.mockResolvedValue({
        id: 'template-123',
        createdBy: 'user-123',
      });

      const isOwner = await AccessControl.checkOwnership(
        'user-123',
        ResourceType.TEMPLATE,
        'template-123',
        mockDb
      );

      expect(isOwner).toBe(true);
    });

    it('should verify brand kit ownership', async () => {
      mockDb.brandKit.findUnique.mockResolvedValue({
        id: 'brand-123',
        userId: 'user-123',
      });

      const isOwner = await AccessControl.checkOwnership(
        'user-123',
        ResourceType.BRAND_KIT,
        'brand-123',
        mockDb
      );

      expect(isOwner).toBe(true);
    });

    it('should return false for non-owner', async () => {
      mockDb.baseDocument.findUnique.mockResolvedValue({
        id: 'pres-123',
        userId: 'other-user',
      });

      const isOwner = await AccessControl.checkOwnership(
        'user-123',
        ResourceType.PRESENTATION,
        'pres-123',
        mockDb
      );

      expect(isOwner).toBe(false);
    });

    it('should return false for nonexistent resource', async () => {
      mockDb.baseDocument.findUnique.mockResolvedValue(null);

      const isOwner = await AccessControl.checkOwnership(
        'user-123',
        ResourceType.PRESENTATION,
        'nonexistent',
        mockDb
      );

      expect(isOwner).toBe(false);
    });
  });

  describe('PermissionHelpers', () => {
    it('should identify admin users', () => {
      expect(PermissionHelpers.isAdmin(UserRole.ADMIN)).toBe(true);
      expect(PermissionHelpers.isAdmin(UserRole.USER)).toBe(false);
      expect(PermissionHelpers.isAdmin(UserRole.VIEWER)).toBe(false);
    });

    it('should check presentation creation permission', () => {
      expect(PermissionHelpers.canCreatePresentations(UserRole.ADMIN)).toBe(true);
      expect(PermissionHelpers.canCreatePresentations(UserRole.USER)).toBe(true);
      expect(PermissionHelpers.canCreatePresentations(UserRole.EDITOR)).toBe(true);
      expect(PermissionHelpers.canCreatePresentations(UserRole.VIEWER)).toBe(false);
      expect(PermissionHelpers.canCreatePresentations(UserRole.GUEST)).toBe(false);
    });

    it('should check presentation deletion permission', () => {
      expect(PermissionHelpers.canDeletePresentations(UserRole.ADMIN)).toBe(true);
      expect(PermissionHelpers.canDeletePresentations(UserRole.USER)).toBe(true);
      expect(PermissionHelpers.canDeletePresentations(UserRole.EDITOR)).toBe(false);
      expect(PermissionHelpers.canDeletePresentations(UserRole.VIEWER)).toBe(false);
    });

    it('should check settings management permission', () => {
      expect(PermissionHelpers.canManageSettings(UserRole.ADMIN)).toBe(true);
      expect(PermissionHelpers.canManageSettings(UserRole.USER)).toBe(false);
      expect(PermissionHelpers.canManageSettings(UserRole.VIEWER)).toBe(false);
    });

    it('should check webhook management permission', () => {
      expect(PermissionHelpers.canManageWebhooks(UserRole.ADMIN)).toBe(true);
      expect(PermissionHelpers.canManageWebhooks(UserRole.USER)).toBe(true);
      expect(PermissionHelpers.canManageWebhooks(UserRole.VIEWER)).toBe(false);
    });

    it('should check share permission', () => {
      expect(PermissionHelpers.canSharePresentations(UserRole.ADMIN)).toBe(true);
      expect(PermissionHelpers.canSharePresentations(UserRole.USER)).toBe(true);
      expect(PermissionHelpers.canSharePresentations(UserRole.EDITOR)).toBe(true);
      expect(PermissionHelpers.canSharePresentations(UserRole.VIEWER)).toBe(false);
    });

    it('should check export permission', () => {
      expect(PermissionHelpers.canExportPresentations(UserRole.ADMIN)).toBe(true);
      expect(PermissionHelpers.canExportPresentations(UserRole.USER)).toBe(true);
      expect(PermissionHelpers.canExportPresentations(UserRole.EDITOR)).toBe(true);
      expect(PermissionHelpers.canExportPresentations(UserRole.VIEWER)).toBe(true);
      expect(PermissionHelpers.canExportPresentations(UserRole.GUEST)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined role gracefully', () => {
      const result = AccessControl.hasPermission(
        undefined as any,
        ResourceType.PRESENTATION,
        Action.READ
      );

      expect(result).toBe(false);
    });

    it('should handle undefined resource type', () => {
      const result = AccessControl.hasPermission(
        UserRole.USER,
        undefined as any,
        Action.READ
      );

      expect(result).toBe(false);
    });

    it('should handle undefined action', () => {
      const result = AccessControl.hasPermission(
        UserRole.USER,
        ResourceType.PRESENTATION,
        undefined as any
      );

      expect(result).toBe(false);
    });
  });

  describe('ROLE_PERMISSIONS Matrix', () => {
    it('should have permissions defined for all roles', () => {
      const { ROLE_PERMISSIONS } = require('@/lib/access-control');
      const roles = Object.values(UserRole);

      roles.forEach(role => {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
        expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
      });
    });

    it('should have all resource types covered', () => {
      const { ROLE_PERMISSIONS } = require('@/lib/access-control');
      const resourceTypes = Object.values(ResourceType);

      // Admin should have all resource types
      const adminResources = ROLE_PERMISSIONS[UserRole.ADMIN].map(
        (p: any) => p.resource
      );

      resourceTypes.forEach(resource => {
        expect(adminResources).toContain(resource);
      });
    });
  });
});
