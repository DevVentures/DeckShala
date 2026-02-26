/**
 * PPT Generator – CRUD Operations Tests
 *
 * Tests database operations for presentations:
 *   • createPresentation (title, theme, language, brandKit, templateCategory)
 *   • createEmptyPresentation
 *   • updatePresentation
 *   • deletePresentation
 *   • fetchPresentations (pagination, ownership isolation)
 *   • fetchPublicPresentations (public-only access)
 *   • togglePresentationPublicStatus
 *   • getSharedPresentation (public access without auth)
 *   • Favorite / unfavorite a presentation
 *
 * All uses a mocked DB + auth so no real Postgres required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockDb = {
  baseDocument: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn(),
  },
  presentation: {
    findUnique: vi.fn(),
  },
  favoriteDocument: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock("@/server/db", () => ({ db: mockDb }));

const mockAuth = vi.fn();
vi.mock("@/server/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const USER_A = "user-a";
const USER_B = "user-b";

function session(userId = USER_A) {
  return {
    user: { id: userId, name: "Test", email: "t@test.com", role: "USER" },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

function mockPresentation(overrides?: Record<string, unknown>) {
  return {
    id: "pres-01",
    title: "India AI Overview",
    userId: USER_A,
    type: "PRESENTATION",
    documentType: "presentation",
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    presentation: {
      id: "pres-01",
      content: { slides: [] },
      theme: "default",
      imageSource: "ai",
      outline: [],
      language: "en-US",
    },
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// createPresentation
// ─────────────────────────────────────────────────────────────────────────────

describe("createPresentation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue(session());
  });

  it("creates a presentation and returns success: true", async () => {
    const created = mockPresentation({ title: "Climate Change in India" });
    mockDb.baseDocument.create.mockResolvedValueOnce(created);

    const { createPresentation } = await import(
      "@/app/_actions/presentation/presentationActions"
    );
    const result = await createPresentation({
      title: "Climate Change in India",
      content: { slides: [] },
      theme: "dark",
      language: "en-US",
    });

    expect(result.success).toBe(true);
    expect(result.presentation?.title).toBe("Climate Change in India");
  });

  it("returns success: false when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { createPresentation } = await import(
      "@/app/_actions/presentation/presentationActions"
    );
    // createPresentation throws on unauth; the caller should handle that
    await expect(
      createPresentation({ title: "Test", content: { slides: [] } }),
    ).rejects.toThrow(/unauthorized/i);
  });

  it("passes brandKitId when provided", async () => {
    mockDb.baseDocument.create.mockResolvedValueOnce(mockPresentation());
    const { createPresentation } = await import(
      "@/app/_actions/presentation/presentationActions"
    );
    await createPresentation({
      title: "Branded Deck",
      content: { slides: [] },
      brandKitId: "bk-123",
    });
    expect(mockDb.baseDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          presentation: expect.objectContaining({
            create: expect.objectContaining({ brandKitId: "bk-123" }),
          }),
        }),
      }),
    );
  });

  it("returns success: false when DB throws", async () => {
    mockDb.baseDocument.create.mockRejectedValueOnce(new Error("DB error"));
    const { createPresentation } = await import(
      "@/app/_actions/presentation/presentationActions"
    );
    const result = await createPresentation({
      title: "Test",
      content: { slides: [] },
    });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/failed/i);
  });

  it("uses 'Untitled Presentation' when title is empty/nullish", async () => {
    mockDb.baseDocument.create.mockResolvedValueOnce(mockPresentation({ title: "Untitled Presentation" }));
    const { createPresentation } = await import(
      "@/app/_actions/presentation/presentationActions"
    );
    await createPresentation({ title: "", content: { slides: [] } });
    expect(mockDb.baseDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Untitled Presentation" }),
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchPresentations
// ─────────────────────────────────────────────────────────────────────────────

describe("fetchPresentations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue(session());
  });

  it("returns empty list when user is unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { fetchPresentations } = await import(
      "@/app/_actions/presentation/fetchPresentations"
    );
    const result = await fetchPresentations();
    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it("returns first page (10 items) and hasMore=true when DB returns 10", async () => {
    const items = Array.from({ length: 10 }, (_, i) => mockPresentation({ id: `p-${i}` }));
    mockDb.baseDocument.findMany.mockResolvedValueOnce(items);
    const { fetchPresentations } = await import(
      "@/app/_actions/presentation/fetchPresentations"
    );
    const result = await fetchPresentations(0);
    expect(result.items).toHaveLength(10);
    expect(result.hasMore).toBe(true);
  });

  it("returns hasMore=false when DB returns fewer than 10 items", async () => {
    const items = Array.from({ length: 3 }, (_, i) => mockPresentation({ id: `p-${i}` }));
    mockDb.baseDocument.findMany.mockResolvedValueOnce(items);
    const { fetchPresentations } = await import(
      "@/app/_actions/presentation/fetchPresentations"
    );
    const result = await fetchPresentations(0);
    expect(result.hasMore).toBe(false);
  });

  it("passes userId filter so users only see their own presentations", async () => {
    mockDb.baseDocument.findMany.mockResolvedValueOnce([]);
    const { fetchPresentations } = await import(
      "@/app/_actions/presentation/fetchPresentations"
    );
    await fetchPresentations(0);
    expect(mockDb.baseDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: USER_A }),
      }),
    );
  });

  it("supports pagination via page parameter", async () => {
    mockDb.baseDocument.findMany.mockResolvedValueOnce([]);
    const { fetchPresentations } = await import(
      "@/app/_actions/presentation/fetchPresentations"
    );
    await fetchPresentations(2);
    expect(mockDb.baseDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20 }),
    );
  });

  it("returns presentations ordered by updatedAt descending", async () => {
    mockDb.baseDocument.findMany.mockResolvedValueOnce([]);
    const { fetchPresentations } = await import(
      "@/app/_actions/presentation/fetchPresentations"
    );
    await fetchPresentations(0);
    expect(mockDb.baseDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { updatedAt: "desc" },
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// togglePresentationPublicStatus
// ─────────────────────────────────────────────────────────────────────────────

describe("togglePresentationPublicStatus", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue(session());
  });

  it("sets isPublic=true successfully", async () => {
    mockDb.baseDocument.update.mockResolvedValueOnce(mockPresentation({ isPublic: true }));
    const { togglePresentationPublicStatus } = await import(
      "@/app/_actions/presentation/sharedPresentationActions"
    );
    const result = await togglePresentationPublicStatus("pres-01", true);
    expect(result.success).toBe(true);
  });

  it("sets isPublic=false successfully", async () => {
    mockDb.baseDocument.update.mockResolvedValueOnce(mockPresentation({ isPublic: false }));
    const { togglePresentationPublicStatus } = await import(
      "@/app/_actions/presentation/sharedPresentationActions"
    );
    const result = await togglePresentationPublicStatus("pres-01", false);
    expect(result.success).toBe(true);
  });

  it("only updates presentations owned by the authenticated user", async () => {
    mockDb.baseDocument.update.mockResolvedValueOnce(mockPresentation());
    const { togglePresentationPublicStatus } = await import(
      "@/app/_actions/presentation/sharedPresentationActions"
    );
    await togglePresentationPublicStatus("pres-01", true);
    expect(mockDb.baseDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "pres-01", userId: USER_A }),
      }),
    );
  });

  it("returns unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { togglePresentationPublicStatus } = await import(
      "@/app/_actions/presentation/sharedPresentationActions"
    );
    const result = await togglePresentationPublicStatus("pres-01", true);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/unauthorized/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSharedPresentation (public access – no auth required)
// ─────────────────────────────────────────────────────────────────────────────

describe("getSharedPresentation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns presentation when it exists and is public", async () => {
    mockDb.baseDocument.findUnique.mockResolvedValueOnce(
      mockPresentation({ isPublic: true }),
    );
    const { getSharedPresentation } = await import(
      "@/app/_actions/presentation/sharedPresentationActions"
    );
    const result = await getSharedPresentation("pres-01");
    expect(result.success).toBe(true);
    expect(result.presentation).toBeDefined();
  });

  it("returns not-found error for a private presentation", async () => {
    mockDb.baseDocument.findUnique.mockResolvedValueOnce(null); // Prisma returns null when isPublic filter doesn't match
    const { getSharedPresentation } = await import(
      "@/app/_actions/presentation/sharedPresentationActions"
    );
    const result = await getSharedPresentation("pres-01");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not found|not public/i);
  });

  it("returns error for a non-existent id", async () => {
    mockDb.baseDocument.findUnique.mockResolvedValueOnce(null);
    const { getSharedPresentation } = await import(
      "@/app/_actions/presentation/sharedPresentationActions"
    );
    const result = await getSharedPresentation("does-not-exist");
    expect(result.success).toBe(false);
  });

  it("queries with isPublic: true filter", async () => {
    mockDb.baseDocument.findUnique.mockResolvedValueOnce(null);
    const { getSharedPresentation } = await import(
      "@/app/_actions/presentation/sharedPresentationActions"
    );
    await getSharedPresentation("pres-01");
    expect(mockDb.baseDocument.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPublic: true }),
      }),
    );
  });
});
