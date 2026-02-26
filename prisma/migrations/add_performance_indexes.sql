-- Performance Optimization Indexes
-- This migration adds indexes to improve query performance across the application

-- BaseDocument indexes for common queries
CREATE INDEX IF NOT EXISTS "BaseDocument_isPublic_createdAt_idx" ON "BaseDocument"("isPublic", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "BaseDocument_type_updatedAt_idx" ON "BaseDocument"("type", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "BaseDocument_documentType_idx" ON "BaseDocument"("documentType");

-- Presentation indexes
CREATE INDEX IF NOT EXISTS "Presentation_templateId_idx" ON "Presentation"("templateId");
CREATE INDEX IF NOT EXISTS "Presentation_customThemeId_idx" ON "Presentation"("customThemeId");
CREATE INDEX IF NOT EXISTS "Presentation_brandKitId_idx" ON "Presentation"("brandKitId");
CREATE INDEX IF NOT EXISTS "Presentation_templateCategory_idx" ON "Presentation"("templateCategory");
CREATE INDEX IF NOT EXISTS "Presentation_aiGenerationMode_idx" ON "Presentation"("aiGenerationMode");

-- CustomTheme indexes
CREATE INDEX IF NOT EXISTS "CustomTheme_isPublic_createdAt_idx" ON "CustomTheme"("isPublic", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "CustomTheme_userId_isPublic_idx" ON "CustomTheme"("userId", "isPublic");

-- FavoriteDocument indexes
CREATE INDEX IF NOT EXISTS "FavoriteDocument_userId_documentId_idx" ON "FavoriteDocument"("userId", "documentId");

-- AIGenerationCache indexes
CREATE INDEX IF NOT EXISTS "AIGenerationCache_model_provider_idx" ON "AIGenerationCache"("model", "provider");
CREATE INDEX IF NOT EXISTS "AIGenerationCache_createdAt_idx" ON "AIGenerationCache"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AIGenerationCache_lastAccessedAt_idx" ON "AIGenerationCache"("lastAccessedAt" DESC);

-- PresentationTemplate indexes
CREATE INDEX IF NOT EXISTS "PresentationTemplate_isPublic_featured_idx" ON "PresentationTemplate"("isPublic", "featured");
CREATE INDEX IF NOT EXISTS "PresentationTemplate_isPremium_idx" ON "PresentationTemplate"("isPremium");
CREATE INDEX IF NOT EXISTS "PresentationTemplate_createdAt_idx" ON "PresentationTemplate"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "PresentationTemplate_industryType_idx" ON "PresentationTemplate"("industryType");

-- BrandKit indexes
CREATE INDEX IF NOT EXISTS "BrandKit_userId_isDefault_idx" ON "BrandKit"("userId", "isDefault");
CREATE INDEX IF NOT EXISTS "BrandKit_isPremium_isEnterprise_idx" ON "BrandKit"("isPremium", "isEnterprise");
CREATE INDEX IF NOT EXISTS "BrandKit_createdAt_idx" ON "BrandKit"("createdAt" DESC);

-- BrandKitUsage indexes
CREATE INDEX IF NOT EXISTS "BrandKitUsage_userId_usedAt_idx" ON "BrandKitUsage"("userId", "usedAt" DESC);

-- Webhook indexes
CREATE INDEX IF NOT EXISTS "Webhook_isActive_lastTriggeredAt_idx" ON "Webhook"("isActive", "lastTriggeredAt" DESC);

-- ModelPerformanceMetric indexes
CREATE INDEX IF NOT EXISTS "ModelPerformanceMetric_provider_model_idx" ON "ModelPerformanceMetric"("provider", "model");

-- PresentationComment indexes
CREATE INDEX IF NOT EXISTS "PresentationComment_userId_createdAt_idx" ON "PresentationComment"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "PresentationComment_slideId_resolved_idx" ON "PresentationComment"("slideId", "resolved");

-- PresentationShare indexes
CREATE INDEX IF NOT EXISTS "PresentationShare_sharedBy_createdAt_idx" ON "PresentationShare"("sharedBy", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "PresentationShare_expiresAt_isActive_idx" ON "PresentationShare"("expiresAt", "isActive") WHERE "expiresAt" IS NOT NULL;

-- ContentGenerationHistory indexes
CREATE INDEX IF NOT EXISTS "ContentGenerationHistory_success_createdAt_idx" ON "ContentGenerationHistory"("success", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ContentGenerationHistory_presentationId_idx" ON "ContentGenerationHistory"("presentationId") WHERE "presentationId" IS NOT NULL;

-- CopilotSuggestionHistory indexes
CREATE INDEX IF NOT EXISTS "CopilotSuggestionHistory_applied_createdAt_idx" ON "CopilotSuggestionHistory"("applied", "createdAt" DESC);

-- SpeakerNotes indexes
CREATE INDEX IF NOT EXISTS "SpeakerNotes_generatedByAI_idx" ON "SpeakerNotes"("generatedByAI");

-- AutoDesignHistory indexes
CREATE INDEX IF NOT EXISTS "AutoDesignHistory_success_createdAt_idx" ON "AutoDesignHistory"("success", "createdAt" DESC);

-- SmartFeatureUsage indexes
CREATE INDEX IF NOT EXISTS "SmartFeatureUsage_success_createdAt_idx" ON "SmartFeatureUsage"("success", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "SmartFeatureUsage_presentationId_idx" ON "SmartFeatureUsage"("presentationId") WHERE "presentationId" IS NOT NULL;

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS "User_role_hasAccess_createdAt_idx" ON "User"("role", "hasAccess", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "BaseDocument_userId_type_updatedAt_idx" ON "BaseDocument"("userId", "type", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "PresentationAnalytics_userId_eventType_createdAt_idx" ON "PresentationAnalytics"("userId", "eventType", "createdAt" DESC);

-- GIN indexes for array searches (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS "User_interests_gin_idx" ON "User" USING GIN ("interests");
CREATE INDEX IF NOT EXISTS "PresentationTemplate_tags_gin_idx" ON "PresentationTemplate" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS "Webhook_events_gin_idx" ON "Webhook" USING GIN ("events");

-- Full-text search indexes (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS "BaseDocument_title_trgm_idx" ON "BaseDocument" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PresentationTemplate_name_trgm_idx" ON "PresentationTemplate" USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PresentationTemplate_description_trgm_idx" ON "PresentationTemplate" USING GIN (description gin_trgm_ops);

-- Enable pg_trgm extension for full-text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add comments for documentation
COMMENT ON INDEX "BaseDocument_isPublic_createdAt_idx" IS 'Optimize public document listing queries';
COMMENT ON INDEX "User_role_hasAccess_createdAt_idx" IS 'Optimize user access control queries';
COMMENT ON INDEX "AIGenerationCache_hitCount_idx" IS 'Optimize cache hit rate analytics';
COMMENT ON INDEX "PresentationTemplate_downloads_idx" IS 'Optimize popular template queries';
