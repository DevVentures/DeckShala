-- Brand Kit System for Enterprise
-- Allows companies to maintain consistent branding across presentations

-- Brand Kit table
CREATE TABLE IF NOT EXISTS "BrandKit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    
    -- Branding Assets
    "logoUrl" TEXT,
    "logoSecondaryUrl" TEXT,
    "logoIconUrl" TEXT,
    
    -- Color Palette
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "backgroundColor" TEXT,
    "textColor" TEXT,
    "colorPalette" JSONB, -- Additional colors as JSON array
    
    -- Typography
    "headingFont" TEXT,
    "bodyFont" TEXT,
    "fontPairings" JSONB,
    
    -- Templates
    "templateIds" TEXT[],
    "customTemplates" JSONB,
    
    -- Usage Settings
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isEnterprise" BOOLEAN NOT NULL DEFAULT false,
    "allowCustomization" BOOLEAN NOT NULL DEFAULT true,
    
    -- Metadata
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Template Categories and Industry-Specific Templates
CREATE TYPE "TemplateCategory" AS ENUM (
    'PITCH_DECK',
    'SALES_DECK',
    'INVESTOR_DECK',
    'CLASSROOM_PPT',
    'PROJECT_REPORT',
    'MARKETING_PLAN',
    'TECHNICAL_PRESENTATION',
    'BUSINESS_PROPOSAL',
    'QUARTERLY_REVIEW',
    'PRODUCT_LAUNCH',
    'TRAINING_MATERIAL',
    'CONFERENCE_TALK',
    'PORTFOLIO',
    'CASE_STUDY',
    'WEBINAR',
    'CUSTOM'
);

-- Update PresentationTemplate to include category enum
ALTER TABLE "PresentationTemplate" 
    ADD COLUMN IF NOT EXISTS "templateCategory" "TemplateCategory" DEFAULT 'CUSTOM',
    ADD COLUMN IF NOT EXISTS "industryType" TEXT,
    ADD COLUMN IF NOT EXISTS "structure" JSONB,
    ADD COLUMN IF NOT EXISTS "aiPromptTemplate" TEXT,
    ADD COLUMN IF NOT EXISTS "defaultSlideCount" INTEGER DEFAULT 10,
    ADD COLUMN IF NOT EXISTS "requiredSections" TEXT[],
    ADD COLUMN IF NOT EXISTS "brandKitCompatible" BOOLEAN DEFAULT true;

-- Brand Kit Usage Tracking
CREATE TABLE IF NOT EXISTS "BrandKitUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandKitId" TEXT NOT NULL,
    "presentationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY ("brandKitId") REFERENCES "BrandKit"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Template Structure Presets (for AI generation)
CREATE TABLE IF NOT EXISTS "TemplateStructure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateCategory" "TemplateCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slideStructure" JSONB NOT NULL, -- JSON defining slide order, types, content guidelines
    "aiGuidelines" TEXT, -- Instructions for AI when generating content
    "examplePrompts" TEXT[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "BrandKit_userId_idx" ON "BrandKit"("userId");
CREATE INDEX IF NOT EXISTS "BrandKit_isDefault_idx" ON "BrandKit"("isDefault");
CREATE INDEX IF NOT EXISTS "BrandKit_organizationName_idx" ON "BrandKit"("organizationName");
CREATE INDEX IF NOT EXISTS "BrandKitUsage_brandKitId_idx" ON "BrandKitUsage"("brandKitId");
CREATE INDEX IF NOT EXISTS "PresentationTemplate_templateCategory_idx" ON "PresentationTemplate"("templateCategory");
CREATE INDEX IF NOT EXISTS "TemplateStructure_templateCategory_idx" ON "TemplateStructure"("templateCategory");

-- Update Presentation table to track brand kit and template usage
ALTER TABLE "Presentation"
    ADD COLUMN IF NOT EXISTS "brandKitId" TEXT,
    ADD COLUMN IF NOT EXISTS "templateCategory" "TemplateCategory",
    ADD COLUMN IF NOT EXISTS "aiGenerationMode" TEXT;

-- Foreign key for brand kit
ALTER TABLE "Presentation"
    ADD CONSTRAINT IF NOT EXISTS "Presentation_brandKitId_fkey"
    FOREIGN KEY ("brandKitId") REFERENCES "BrandKit"("id") ON DELETE SET NULL;

-- Insert default template structures for each industry category
INSERT INTO "TemplateStructure" ("id", "templateCategory", "name", "description", "slideStructure", "aiGuidelines", "examplePrompts", "isDefault") VALUES
(
    'pitch-deck-default',
    'PITCH_DECK',
    'Standard Pitch Deck',
    'Classic pitch deck structure for startups and businesses',
    '[
        {"type": "cover", "title": "Company Name & Tagline", "duration": 30},
        {"type": "problem", "title": "Problem Statement", "duration": 60},
        {"type": "solution", "title": "Our Solution", "duration": 90},
        {"type": "market", "title": "Market Opportunity", "duration": 60},
        {"type": "product", "title": "Product Demo", "duration": 120},
        {"type": "traction", "title": "Traction & Metrics", "duration": 60},
        {"type": "business-model", "title": "Business Model", "duration": 60},
        {"type": "competition", "title": "Competitive Landscape", "duration": 60},
        {"type": "team", "title": "Team", "duration": 60},
        {"type": "financials", "title": "Financial Projections", "duration": 90},
        {"type": "ask", "title": "The Ask", "duration": 45},
        {"type": "closing", "title": "Contact", "duration": 30}
    ]'::jsonb,
    'Focus on storytelling. Use compelling statistics. Keep each slide concise. Emphasize unique value proposition.',
    ARRAY['Create a pitch deck for a SaaS startup', 'Generate an investor presentation for a fintech company'],
    true
),
(
    'investor-deck-default',
    'INVESTOR_DECK',
    'Investor Presentation',
    'Detailed investor deck for fundraising',
    '[
        {"type": "cover", "title": "Investment Opportunity", "duration": 30},
        {"type": "executive-summary", "title": "Executive Summary", "duration": 90},
        {"type": "problem", "title": "Market Problem", "duration": 60},
        {"type": "solution", "title": "Our Solution", "duration": 90},
        {"type": "market-analysis", "title": "Market Analysis", "duration": 120},
        {"type": "product", "title": "Product Overview", "duration": 90},
        {"type": "traction", "title": "Traction & Milestones", "duration": 90},
        {"type": "business-model", "title": "Revenue Model", "duration": 90},
        {"type": "go-to-market", "title": "Go-to-Market Strategy", "duration": 60},
        {"type": "competitive-analysis", "title": "Competitive Analysis", "duration": 60},
        {"type": "team", "title": "Leadership Team", "duration": 60},
        {"type": "financials", "title": "Financial Projections", "duration": 120},
        {"type": "funding", "title": "Funding Requirements", "duration": 60},
        {"type": "roi", "title": "Return on Investment", "duration": 60},
        {"type": "risks", "title": "Risk Mitigation", "duration": 60},
        {"type": "closing", "title": "Next Steps", "duration": 30}
    ]'::jsonb,
    'Professional tone. Data-driven. Focus on ROI and market validation. Include detailed financial metrics.',
    ARRAY['Create an investor deck for Series A funding', 'Generate a detailed investment presentation'],
    true
);

-- Add more default structures (truncated for brevity - would include all template types)
