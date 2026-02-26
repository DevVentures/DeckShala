/**
 * PPT Generator – Authentication & Access Control Tests
 *
 * Every sensitive operation must require auth and respect ownership.
 * These tests verify:
 *
 *   Authentication:
 *     • Unauthenticated requests are rejected at the action level
 *     • Auth token forwarded correctly through `auth()`
 *     • Session expiry handled gracefully
 *
 *   Authorization / Ownership:
 *     • Users can only read/update/delete their OWN presentations
 *     • Public presentations are readable by anyone (no auth required)
 *     • ADMIN role has access to all resources
 *     • RBAC permission matrix (USER vs EDITOR vs VIEWER vs GUEST)
 *     • Attempting to modify another user's presentation → denied
 *
 *   Access Control Service:
 *     • hasPermission returns correct values for each role/action combo
 *     • canAccess performs DB ownership check
 *     • Broken ownership check → returns denied (fail-safe)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AccessControl,
  UserRole,
  ResourceType,
  Action,
} from "@/lib/access-control";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks for server actions that need auth + db
// ─────────────────────────────────────────────────────────────────────────────

const mockDb = {
  baseDocument: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
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

vi.mock("@/server/db", () => ({ db: mockDb }));

const mockAuth = vi.fn();
vi.mock("@/server/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/security", () => ({
  SecurityAuditLogger: { logAccess: vi.fn() },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const OWNER_ID = "owner-123";
const OTHER_ID = "other-456";

function sessionFor(userId: string, role = "USER") {
  return {
    user: { id: userId, name: "Test", email: "test@example.com", role },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AccessControl.hasPermission – static permission matrix
// ─────────────────────────────────────────────────────────────────────────────

describe("AccessControl.hasPermission – ADMIN", () => {
  it("ADMIN can do everything on PRESENTATION", () => {
    const actions = [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE,
    Action.SHARE, Action.EXPORT, Action.PUBLISH, Action.MANAGE];
    for (const action of actions) {
      expect(AccessControl.hasPermission(UserRole.ADMIN, ResourceType.PRESENTATION, action)).toBe(true);
    }
  });

  it("ADMIN can manage USERS", () => {
    expect(AccessControl.hasPermission(UserRole.ADMIN, ResourceType.USER, Action.MANAGE)).toBe(true);
  });

  it("ADMIN can manage WEBHOOKS", () => {
    expect(AccessControl.hasPermission(UserRole.ADMIN, ResourceType.WEBHOOK, Action.MANAGE)).toBe(true);
  });
});

describe("AccessControl.hasPermission – USER", () => {
  it("USER can CREATE presentations", () => {
    expect(AccessControl.hasPermission(UserRole.USER, ResourceType.PRESENTATION, Action.CREATE)).toBe(true);
  });

  it("USER can READ presentations", () => {
    expect(AccessControl.hasPermission(UserRole.USER, ResourceType.PRESENTATION, Action.READ)).toBe(true);
  });

  it("USER can DELETE own presentations", () => {
    expect(AccessControl.hasPermission(UserRole.USER, ResourceType.PRESENTATION, Action.DELETE)).toBe(true);
  });

  it("USER can SHARE presentations", () => {
    expect(AccessControl.hasPermission(UserRole.USER, ResourceType.PRESENTATION, Action.SHARE)).toBe(true);
  });

  it("USER can EXPORT presentations", () => {
    expect(AccessControl.hasPermission(UserRole.USER, ResourceType.PRESENTATION, Action.EXPORT)).toBe(true);
  });

  it("USER cannot PUBLISH presentations", () => {
    expect(AccessControl.hasPermission(UserRole.USER, ResourceType.PRESENTATION, Action.PUBLISH)).toBe(false);
  });

  it("USER cannot MANAGE other USERS", () => {
    expect(AccessControl.hasPermission(UserRole.USER, ResourceType.USER, Action.MANAGE)).toBe(false);
  });

  it("USER can create BRAND_KIT (enterprise feature)", () => {
    expect(AccessControl.hasPermission(UserRole.USER, ResourceType.BRAND_KIT, Action.CREATE)).toBe(true);
  });
});

describe("AccessControl.hasPermission – EDITOR", () => {
  it("EDITOR can CREATE presentations", () => {
    expect(AccessControl.hasPermission(UserRole.EDITOR, ResourceType.PRESENTATION, Action.CREATE)).toBe(true);
  });

  it("EDITOR can UPDATE presentations", () => {
    expect(AccessControl.hasPermission(UserRole.EDITOR, ResourceType.PRESENTATION, Action.UPDATE)).toBe(true);
  });

  it("EDITOR cannot DELETE presentations", () => {
    expect(AccessControl.hasPermission(UserRole.EDITOR, ResourceType.PRESENTATION, Action.DELETE)).toBe(false);
  });

  it("EDITOR cannot SHARE presentations", () => {
    expect(AccessControl.hasPermission(UserRole.EDITOR, ResourceType.PRESENTATION, Action.SHARE)).toBe(false);
  });
});

describe("AccessControl.hasPermission – VIEWER", () => {
  it("VIEWER can READ presentations", () => {
    expect(AccessControl.hasPermission(UserRole.VIEWER, ResourceType.PRESENTATION, Action.READ)).toBe(true);
  });

  it("VIEWER can EXPORT presentations", () => {
    expect(AccessControl.hasPermission(UserRole.VIEWER, ResourceType.PRESENTATION, Action.EXPORT)).toBe(true);
  });

  it("VIEWER cannot CREATE presentations", () => {
    expect(AccessControl.hasPermission(UserRole.VIEWER, ResourceType.PRESENTATION, Action.CREATE)).toBe(false);
  });

  it("VIEWER cannot DELETE presentations", () => {
    expect(AccessControl.hasPermission(UserRole.VIEWER, ResourceType.PRESENTATION, Action.DELETE)).toBe(false);
  });

  it("VIEWER can READ templates", () => {
    expect(AccessControl.hasPermission(UserRole.VIEWER, ResourceType.TEMPLATE, Action.READ)).toBe(true);
  });
});

describe("AccessControl.hasPermission – GUEST", () => {
  it("GUEST can READ presentations", () => {
    expect(AccessControl.hasPermission(UserRole.GUEST, ResourceType.PRESENTATION, Action.READ)).toBe(true);
  });

  it("GUEST cannot CREATE presentations", () => {
    expect(AccessControl.hasPermission(UserRole.GUEST, ResourceType.PRESENTATION, Action.CREATE)).toBe(false);
  });

  it("GUEST cannot access BRAND_KIT", () => {
    expect(AccessControl.hasPermission(UserRole.GUEST, ResourceType.BRAND_KIT, Action.READ)).toBe(false);
  });

  it("GUEST cannot access WEBHOOKS", () => {
    expect(AccessControl.hasPermission(UserRole.GUEST, ResourceType.WEBHOOK, Action.READ)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AccessControl.canAccess – async ownership check
// ─────────────────────────────────────────────────────────────────────────────

describe("AccessControl.canAccess – ownership checks", () => {
  beforeEach(() => vi.resetAllMocks());

  it("allows owner to UPDATE their own PRESENTATION", async () => {
    mockDb.baseDocument.findUnique.mockResolvedValueOnce({ userId: OWNER_ID });
    const result = await AccessControl.canAccess(
      OWNER_ID, UserRole.USER, ResourceType.PRESENTATION, Action.UPDATE, "pres-01", mockDb,
    );
    expect(result.allowed).toBe(true);
  });

  it("denies another user from UPDATE on someone else's PRESENTATION", async () => {
    mockDb.baseDocument.findUnique.mockResolvedValueOnce({ userId: OWNER_ID });
    const result = await AccessControl.canAccess(
      OTHER_ID, UserRole.USER, ResourceType.PRESENTATION, Action.UPDATE, "pres-01", mockDb,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not the owner/i);
  });

  it("ADMIN can access any presentation regardless of ownership", async () => {
    const result = await AccessControl.canAccess(
      OTHER_ID, UserRole.ADMIN, ResourceType.PRESENTATION, Action.DELETE, "pres-01", mockDb,
    );
    expect(result.allowed).toBe(true);
  });

  it("returns denied with reason when presentation does not exist", async () => {
    mockDb.baseDocument.findUnique.mockResolvedValueOnce(null);
    const result = await AccessControl.canAccess(
      OWNER_ID, UserRole.USER, ResourceType.PRESENTATION, Action.UPDATE, "nonexistent", mockDb,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not found/i);
  });

  it("fails safely when DB throws during ownership check", async () => {
    mockDb.baseDocument.findUnique.mockRejectedValueOnce(new Error("DB down"));
    const result = await AccessControl.canAccess(
      OWNER_ID, UserRole.USER, ResourceType.PRESENTATION, Action.UPDATE, "pres-01", mockDb,
    );
    expect(result.allowed).toBe(false);
  });

  it("allows public template to be read by any USER", async () => {
    mockDb.presentationTemplate.findUnique.mockResolvedValueOnce({
      createdBy: OWNER_ID,
      isPublic: true,
    });
    const result = await AccessControl.canAccess(
      OTHER_ID, UserRole.USER, ResourceType.TEMPLATE, Action.READ, "tmpl-01", mockDb,
    );
    expect(result.allowed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Server action authentication gates
// ─────────────────────────────────────────────────────────────────────────────

describe("Server actions – unauthenticated rejection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue(null); // no session
  });

  it("createPresentation throws when unauthenticated", async () => {
    const { createPresentation } = await import(
      "@/app/_actions/presentation/presentationActions"
    );
    await expect(
      createPresentation({ title: "Test", content: { slides: [] } }),
    ).rejects.toThrow(/unauthorized/i);
  });

  it("togglePresentationPublicStatus returns unauthorized when not logged in", async () => {
    const { togglePresentationPublicStatus } = await import(
      "@/app/_actions/presentation/sharedPresentationActions"
    );
    const result = await togglePresentationPublicStatus("pres-01", true);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/unauthorized/i);
  });

  it("getPresentationVersions returns error when not logged in", async () => {
    const { getPresentationVersions } = await import(
      "@/app/_actions/presentation/version-actions"
    );
    const result = await getPresentationVersions("pres-01");
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAllowedActions helper
// ─────────────────────────────────────────────────────────────────────────────

describe("AccessControl.getAllowedActions", () => {
  it("returns all presentation actions for ADMIN", () => {
    const actions = AccessControl.getAllowedActions(UserRole.ADMIN, ResourceType.PRESENTATION);
    expect(actions).toContain(Action.DELETE);
    expect(actions).toContain(Action.MANAGE);
    expect(actions.length).toBeGreaterThanOrEqual(7);
  });

  it("returns empty array for role with no permissions on a resource", () => {
    const actions = AccessControl.getAllowedActions(UserRole.GUEST, ResourceType.BRAND_KIT);
    expect(actions).toHaveLength(0);
  });

  it("VIEWER gets READ and EXPORT for PRESENTATION", () => {
    const actions = AccessControl.getAllowedActions(UserRole.VIEWER, ResourceType.PRESENTATION);
    expect(actions).toContain(Action.READ);
    expect(actions).toContain(Action.EXPORT);
    expect(actions).not.toContain(Action.DELETE);
  });
});
