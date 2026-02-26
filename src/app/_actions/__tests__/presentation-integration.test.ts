/**
 * Integration Tests for Presentation API Endpoints
 * 
 * These tests verify the end-to-end functionality of presentation-related
 * server actions including creation, retrieval, update, and deletion.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { db } from '@/server/db';
import { type Session } from 'next-auth';

// Mock the auth module
vi.mock('@/server/auth', () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: {
        id: 'test-user-123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'USER',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    } as Session),
  ),
}));

describe('Presentation API Integration Tests', () => {
  let testPresentationId: string;
  const testUserId = 'test-user-123';

  beforeAll(async () => {
    // Setup: Ensure test database is clean
    await db.baseDocument.deleteMany({
      where: { userId: testUserId },
    });
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    await db.baseDocument.deleteMany({
      where: { userId: testUserId },
    });
    await db.$disconnect();
  });

  describe('Presentation Creation', () => {
    it('should create a new presentation with valid data', async () => {
      const mockPresentationData = {
        title: 'Integration Test Presentation',
        description: 'Created during integration testing',
        topic: 'Testing',
        numberOfSlides: 5,
        targetAudience: 'Developers',
      };

      // Create presentation via database (simulating server action)
      const presentation = await db.baseDocument.create({
        data: {
          title: mockPresentationData.title,
          userId: testUserId,
          type: 'PRESENTATION',
          documentType: 'presentation',
        },
      });

      expect(presentation).toBeDefined();
      expect(presentation.id).toBeDefined();
      expect(presentation.title).toBe(mockPresentationData.title);
      expect(presentation.userId).toBe(testUserId);

      testPresentationId = presentation.id;
    });

    it('should fail to create presentation without required fields', async () => {
      await expect(
        db.baseDocument.create({
          data: {
            // Missing required 'title' field
            authorId: testUserId,
            type: 'presentation',
          } as any,
        }),
      ).rejects.toThrow();
    });

    it('should create presentation with default values', async () => {
      const presentation = await db.baseDocument.create({
        data: {
          title: 'Minimal Presentation',
          userId: testUserId,
          type: 'PRESENTATION',
          documentType: 'presentation',
        },
      });

      expect(presentation).toBeDefined();
      expect(presentation.isPublic).toBe(false);
      expect(presentation.isPublic).toBe(false);
      expect(presentation.createdAt).toBeDefined();
      expect(presentation.updatedAt).toBeDefined();

      // Cleanup
      await db.baseDocument.delete({ where: { id: presentation.id } });
    });
  });

  describe('Presentation Retrieval', () => {
    it('should retrieve presentation by ID', async () => {
      const presentation = await db.baseDocument.findUnique({
        where: { id: testPresentationId },
      });

      expect(presentation).toBeDefined();
      expect(presentation?.id).toBe(testPresentationId);
      expect(presentation?.userId).toBe(testUserId);
    });

    it('should return null for non-existent presentation', async () => {
      const presentation = await db.baseDocument.findUnique({
        where: { id: 'non-existent-id' },
      });

      expect(presentation).toBeNull();
    });

    it('should list all presentations for user', async () => {
      const presentations = await db.baseDocument.findMany({
        where: {
          userId: testUserId,
          type: 'PRESENTATION',
        },
        orderBy: { updatedAt: 'desc' },
      });

      expect(presentations).toBeDefined();
      expect(Array.isArray(presentations)).toBe(true);
      expect(presentations.length).toBeGreaterThan(0);
      expect(presentations[0]?.userId).toBe(testUserId);
    });

    it('should filter presentations by public status', async () => {
      const publicPresentations = await db.baseDocument.findMany({
        where: {
          type: 'PRESENTATION',
          isPublic: true,
        },
      });

      expect(Array.isArray(publicPresentations)).toBe(true);
      publicPresentations.forEach((p) => {
        expect(p.isPublic).toBe(true);
      });
    });
  });

  describe('Presentation Update', () => {
    it('should update presentation title', async () => {
      const updatedData = {
        title: 'Updated Title',
      };

      const updated = await db.baseDocument.update({
        where: { id: testPresentationId },
        data: updatedData,
      });

      expect(updated.title).toBe(updatedData.title);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(updated.createdAt.getTime());
    });

    it('should update presentation public status', async () => {
      const updated = await db.baseDocument.update({
        where: { id: testPresentationId },
        data: { isPublic: true },
      });

      expect(updated.isPublic).toBe(true);
    });

    it('should fail to update non-existent presentation', async () => {
      await expect(
        db.baseDocument.update({
          where: { id: 'non-existent-id' },
          data: { title: 'New Title' },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Presentation Sharing and Permissions', () => {
    it('should update presentation public status', async () => {
      const updated = await db.baseDocument.update({
        where: { id: testPresentationId },
        data: { isPublic: true },
      });

      expect(updated.isPublic).toBe(true);
    });

    it('should verify owner can access presentation', async () => {
      const presentation = await db.baseDocument.findFirst({
        where: {
          id: testPresentationId,
          userId: testUserId,
        },
      });

      expect(presentation).toBeDefined();
      expect(presentation?.userId).toBe(testUserId);
    });
  });

  describe('Presentation Search and Filtering', () => {
    beforeEach(async () => {
      // Create multiple test presentations
      await db.baseDocument.createMany({
        data: [
          {
            title: 'AI Technology Presentation',
            userId: testUserId,
            type: 'PRESENTATION',
            documentType: 'presentation',
            isPublic: true,
          },
          {
            title: 'Machine Learning Overview',
            userId: testUserId,
            type: 'PRESENTATION',
            documentType: 'presentation',
            isPublic: false,
          },
        ],
      });
    });

    it('should search presentations by title', async () => {
      const results = await db.baseDocument.findMany({
        where: {
          title: { contains: 'AI', mode: 'insensitive' },
          type: 'PRESENTATION',
        },
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((p) => {
        expect(p.title.toLowerCase()).toContain('ai');
      });
    });

    it('should filter presentations by date range', async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentPresentations = await db.baseDocument.findMany({
        where: {
          type: 'PRESENTATION',
          userId: testUserId,
          createdAt: { gte: oneDayAgo },
        },
      });

      expect(Array.isArray(recentPresentations)).toBe(true);
      recentPresentations.forEach((p) => {
        expect(p.createdAt.getTime()).toBeGreaterThanOrEqual(oneDayAgo.getTime());
      });
    });
  });

  describe('Presentation Deletion', () => {
    it('should soft delete presentation (if applicable)', async () => {
      // Create a temporary presentation for deletion
      const tempPresentation = await db.baseDocument.create({
        data: {
          title: 'To Be Deleted',
          userId: testUserId,
          type: 'PRESENTATION',
          documentType: 'presentation',
        },
      });

      // Delete the presentation
      await db.baseDocument.delete({
        where: { id: tempPresentation.id },
      });

      // Verify deletion
      const deleted = await db.baseDocument.findUnique({
        where: { id: tempPresentation.id },
      });

      expect(deleted).toBeNull();
    });

    it('should fail to delete non-existent presentation', async () => {
      await expect(
        db.baseDocument.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Presentation Versioning', () => {
    it('should create version history entry', async () => {
      // Using PresentationVersion from schema with correct fields
      const version = await db.presentationVersion.create({
        data: {
          presentationId: testPresentationId,
          createdBy: testUserId,
          versionNumber: 1,
          content: {},
        },
      });

      expect(version).toBeDefined();
      expect(version.presentationId).toBe(testPresentationId);
      expect(version.versionNumber).toBe(1);

      // Cleanup
      await db.presentationVersion.delete({ where: { id: version.id } });
    });

    it('should list all versions for presentation', async () => {
      // Create multiple versions
      await db.presentationVersion.createMany({
        data: [
          {
            presentationId: testPresentationId,
            createdBy: testUserId,
            versionNumber: 1,
            content: {},
          },
          {
            presentationId: testPresentationId,
            createdBy: testUserId,
            versionNumber: 2,
            content: {},
          },
        ],
      });

      const versions = await db.presentationVersion.findMany({
        where: { presentationId: testPresentationId },
        orderBy: { versionNumber: 'desc' },
      });

      expect(versions.length).toBeGreaterThanOrEqual(2);
      expect(versions[0]?.versionNumber).toBeGreaterThan(versions[1]?.versionNumber ?? 0);

      // Cleanup
      await db.presentationVersion.deleteMany({
        where: { presentationId: testPresentationId },
      });
    });
  });

  describe('Performance and Pagination', () => {
    it('should paginate presentation list', async () => {
      const pageSize = 10;
      const page = await db.baseDocument.findMany({
        where: { type: 'PRESENTATION', userId: testUserId },
        take: pageSize,
        skip: 0,
        orderBy: { updatedAt: 'desc' },
      });

      expect(page.length).toBeLessThanOrEqual(pageSize);
    });

    it('should count total presentations efficiently', async () => {
      const count = await db.baseDocument.count({
        where: { type: 'PRESENTATION', userId: testUserId },
      });

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
