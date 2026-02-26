-- Advanced Analytics and Monitoring
CREATE TABLE IF NOT EXISTS "PresentationAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "presentationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL, -- view, edit, share, export, collaborate
    "eventData" JSONB,
    "sessionId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("presentationId") REFERENCES "BaseDocument"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "PresentationAnalytics_presentationId_createdAt_idx" ON "PresentationAnalytics"("presentationId", "createdAt");
CREATE INDEX "PresentationAnalytics_userId_eventType_idx" ON "PresentationAnalytics"("userId", "eventType");
CREATE INDEX "PresentationAnalytics_sessionId_idx" ON "PresentationAnalytics"("sessionId");

-- Presentation Versioning
CREATE TABLE IF NOT EXISTS "PresentationVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "presentationId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "changes" JSONB, -- Delta/diff from previous version
    "createdBy" TEXT NOT NULL,
    "comment" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("presentationId") REFERENCES "BaseDocument"("id") ON DELETE CASCADE,
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "PresentationVersion_presentationId_versionNumber_idx" ON "PresentationVersion"("presentationId", "versionNumber");
CREATE INDEX "PresentationVersion_createdAt_idx" ON "PresentationVersion"("createdAt");

-- AI Cache for faster generation
CREATE TABLE IF NOT EXISTS "AIGenerationCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cacheKey" TEXT NOT NULL UNIQUE,
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "tokensUsed" INTEGER,
    "latencyMs" INTEGER,
    "hitCount" INTEGER DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AIGenerationCache_cacheKey_idx" ON "AIGenerationCache"("cacheKey");
CREATE INDEX "AIGenerationCache_expiresAt_idx" ON "AIGenerationCache"("expiresAt");
CREATE INDEX "AIGenerationCache_hitCount_idx" ON "AIGenerationCache"("hitCount" DESC);

-- Presentation Templates
CREATE TABLE IF NOT EXISTS "PresentationTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL, -- business, education, marketing, etc
    "tags" TEXT[],
    "content" JSONB NOT NULL,
    "thumbnailUrl" TEXT,
    "previewImages" TEXT[],
    "isPremium" BOOLEAN DEFAULT false,
    "price" DECIMAL(10,2) DEFAULT 0,
    "downloads" INTEGER DEFAULT 0,
    "rating" DECIMAL(3,2) DEFAULT 0,
    "ratingCount" INTEGER DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "isPublic" BOOLEAN DEFAULT true,
    "featured" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "PresentationTemplate_category_featured_idx" ON "PresentationTemplate"("category", "featured");
CREATE INDEX "PresentationTemplate_downloads_idx" ON "PresentationTemplate"("downloads" DESC);
CREATE INDEX "PresentationTemplate_rating_idx" ON "PresentationTemplate"("rating" DESC);

-- Webhooks for integrations
CREATE TABLE IF NOT EXISTS "Webhook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[] NOT NULL, -- presentation.created, presentation.updated, etc
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "failureCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "Webhook_userId_isActive_idx" ON "Webhook"("userId", "isActive");

-- AI Model Performance Metrics
CREATE TABLE IF NOT EXISTS "ModelPerformanceMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "totalRequests" INTEGER DEFAULT 0,
    "successfulRequests" INTEGER DEFAULT 0,
    "failedRequests" INTEGER DEFAULT 0,
    "averageLatencyMs" DECIMAL(10,2),
    "averageTokens" DECIMAL(10,2),
    "totalCost" DECIMAL(10,4) DEFAULT 0,
    "lastRequestAt" TIMESTAMP(3),
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "ModelPerformanceMetric_provider_model_date_idx" ON "ModelPerformanceMetric"("provider", "model", "date");
CREATE INDEX "ModelPerformanceMetric_date_idx" ON "ModelPerformanceMetric"("date" DESC);

-- Presentation Comments and Feedback
CREATE TABLE IF NOT EXISTS "PresentationComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "presentationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slideId" TEXT,
    "content" TEXT NOT NULL,
    "position" JSONB, -- x, y coordinates if comment is positioned on slide
    "resolved" BOOLEAN DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "parentId" TEXT, -- for threaded comments
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("presentationId") REFERENCES "BaseDocument"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL,
    FOREIGN KEY ("parentId") REFERENCES "PresentationComment"("id") ON DELETE CASCADE
);

CREATE INDEX "PresentationComment_presentationId_resolved_idx" ON "PresentationComment"("presentationId", "resolved");
CREATE INDEX "PresentationComment_slideId_idx" ON "PresentationComment"("slideId");
CREATE INDEX "PresentationComment_parentId_idx" ON "PresentationComment"("parentId");

-- Presentation Shares and Permissions
CREATE TABLE IF NOT EXISTS "PresentationShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "presentationId" TEXT NOT NULL,
    "sharedBy" TEXT NOT NULL,
    "sharedWith" TEXT, -- null for public share links
    "shareToken" TEXT NOT NULL UNIQUE,
    "permission" TEXT NOT NULL, -- view, comment, edit
    "expiresAt" TIMESTAMP(3),
    "password" TEXT,
    "viewCount" INTEGER DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("presentationId") REFERENCES "BaseDocument"("id") ON DELETE CASCADE,
    FOREIGN KEY ("sharedBy") REFERENCES "User"("id") ON DELETE CASCADE,
    FOREIGN KEY ("sharedWith") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "PresentationShare_shareToken_idx" ON "PresentationShare"("shareToken");
CREATE INDEX "PresentationShare_presentationId_isActive_idx" ON "PresentationShare"("presentationId", "isActive");
CREATE INDEX "PresentationShare_sharedWith_idx" ON "PresentationShare"("sharedWith");
