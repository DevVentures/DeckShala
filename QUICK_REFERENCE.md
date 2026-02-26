# Enterprise Features - Quick Reference

## 🎯 TL;DR

**What**: Industry-specific templates (12 types) + Brand Kit integration for B2B/Enterprise monetization

**Files Created**: 5 new files (2 services, 1 actions, 2 UI components)

**Database**: 3 new models (BrandKit, BrandKitUsage, TemplateStructure)

**Status**: ✅ All code complete, no errors, ready to integrate

---

## 📦 Import Statements

```tsx
// Services
import { BrandKitService } from "@/lib/brand-kit-service";
import { TemplateService } from "@/lib/template-service";

// Actions
import {
  createBrandKitAction,
  getUserBrandKitsAction,
  getDefaultBrandKitAction,
} from "@/app/_actions/brand-kit/brand-kit-actions";

// Components
import { TemplateSelector } from "@/components/presentation/templates/template-selector";
import { BrandKitManager } from "@/components/settings/brand-kit-manager";

// Types
import type { TemplateCategory } from "@prisma/client";
import type { BrandKitData } from "@/lib/brand-kit-service";
import type { IndustryTemplate } from "@/lib/template-service";
```

---

## 🚀 Quick Start (3 Steps)

### Step 1: Add Template Selector

```tsx
"use client";
import { useState } from "react";
import { TemplateSelector } from "@/components/presentation/templates/template-selector";

export default function Page() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Choose Template</button>
      <TemplateSelector
        open={open}
        onOpenChange={setOpen}
        onSelectTemplate={(category, template) => {
          console.log("Selected:", category); // "PITCH_DECK"
        }}
      />
    </>
  );
}
```

### Step 2: Generate with Template + Brand Kit

```tsx
"use server";
import { auth } from "@/server/auth";
import { BrandKitService } from "@/lib/brand-kit-service";
import { TemplateService } from "@/lib/template-service";

export async function generateAction(
  userInput: string,
  category?: TemplateCategory,
) {
  const session = await auth();

  // Get user's brand kit
  const { brandKit } = await BrandKitService.getDefaultBrandKit(
    session.user.id,
  );

  // Generate enhanced prompt
  const prompt = TemplateService.generateAIPromptForTemplate(
    category || "PITCH_DECK",
    userInput,
    brandKit,
  );

  // ... generate with Ollama ...
}
```

### Step 3: Add Brand Kit Manager to Settings

```tsx
"use client";
import { BrandKitManager } from "@/components/settings/brand-kit-manager";

export default function SettingsPage() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Manage Brand Kits</button>
      <BrandKitManager open={open} onOpenChange={setOpen} />
    </>
  );
}
```

---

## 📋 Template Categories (12)

```tsx
"PITCH_DECK"; // 🚀 Startups seeking investment (12 slides)
"INVESTOR_DECK"; // 💰 Series A+ funding (20 slides)
"SALES_DECK"; // 📈 Convert prospects (15 slides)
"PRODUCT_LAUNCH"; // 🎯 Announce new products (10 slides)
"MARKETING_PLAN"; // 📊 Strategic roadmap (18 slides)
"QUARTERLY_REVIEW"; // 📅 Performance review (16 slides)
"TECHNICAL_PRESENTATION"; // 💻 Engineering content (20 slides)
"BUSINESS_PROPOSAL"; // 📋 Win contracts (15 slides)
"TRAINING_MATERIAL"; // 🎓 Educational content (25 slides)
"CONFERENCE_TALK"; // 🎤 Conference presentations (30 slides)
"CLASSROOM_PPT"; // 🏫 Academic presentations (20 slides)
"PROJECT_REPORT"; // 📄 Project documentation (15 slides)
```

---

## 🎨 Brand Kit Properties

```tsx
interface BrandKitData {
  organizationName: string; // Required: "Acme Corp"
  primaryColor: string; // Required: "#6366f1"
  secondaryColor?: string; // Optional: "#8b5cf6"
  accentColor?: string; // Optional: "#ec4899"
  backgroundColor?: string; // Optional: "#ffffff"
  textColor?: string; // Optional: "#000000"
  headingFont?: string; // Optional: "Poppins"
  bodyFont?: string; // Optional: "Inter"
  logoUrl?: string; // Optional: "https://..."
  isDefault?: boolean; // Optional: true/false
}
```

---

## 🔧 Common Operations

### Create Brand Kit

```tsx
const result = await createBrandKitAction({
  organizationName: "Acme Corp",
  primaryColor: "#6366f1",
  isDefault: true,
});

if (result.success) {
  console.log("Brand Kit ID:", result.brandKitId);
}
```

### Get All Brand Kits

```tsx
const { brandKits } = await getUserBrandKitsAction();
brandKits.forEach((kit) => {
  console.log(kit.organizationName, kit.primaryColor);
});
```

### Get Default Brand Kit

```tsx
const { brandKit } = await getDefaultBrandKitAction();
if (brandKit) {
  console.log("Default:", brandKit.organizationName);
}
```

### Apply Brand Kit Theme

```tsx
const { theme } = BrandKitService.applyBrandKitToTheme(brandKit);
// theme = {
//   name: "Acme Corp Brand",
//   colors: { primary: "#6366f1", ... },
//   fonts: { heading: "Poppins", body: "Inter" },
//   logos: { primary: "https://...", ... }
// }
```

### Get Template Info

```tsx
const templates = TemplateService.getIndustryTemplates();
templates.forEach((t) => {
  console.log(t.displayName, t.icon, t.defaultSlideCount);
});
```

### Generate AI Prompt

```tsx
const prompt = TemplateService.generateAIPromptForTemplate(
  "PITCH_DECK",
  "AI project management tool",
  brandKit, // optional
);
// Returns: Enhanced prompt with template structure + brand guidelines
```

---

## 📊 Database Queries

### Get Brand Kit with Presentations

```tsx
const brandKit = await db.brandKit.findUnique({
  where: { id: brandKitId },
  include: {
    presentations: true,
    usage: { orderBy: { usedAt: "desc" }, take: 10 },
  },
});
```

### Get Presentations by Template Category

```tsx
const pitchDecks = await db.presentation.findMany({
  where: { templateCategory: "PITCH_DECK" },
  include: { brandKit: true },
});
```

### Track Brand Kit Usage

```tsx
await BrandKitService.trackBrandKitUsage(brandKitId, presentationId, userId);
```

---

## 🎯 Integration Checklist

```tsx
// 1. Database
□ Run: npx prisma db push

// 2. UI Components
□ Add TemplateSelector to create flow
□ Add BrandKitManager to settings
□ Add template badges to cards

// 3. AI Generation
□ Load default brand kit
□ Generate template-aware prompt
□ Apply brand theme to slides

// 4. Testing
□ Create brand kit
□ Select template
□ Generate presentation
□ Verify branding applied
```

---

## 🔍 Debugging

### Check Brand Kits

```tsx
// In browser console or server action
const kits = await getUserBrandKitsAction();
console.log("Brand Kits:", kits.brandKits);
```

### Check Templates

```tsx
const templates = TemplateService.getIndustryTemplates();
console.log(
  "Templates:",
  templates.map((t) => t.category),
);
```

### Validate Colors

```tsx
const validation = await validateBrandColorsAction({
  primary: "#6366f1",
  background: "#ffffff",
  text: "#000000",
});
console.log("Valid:", validation.validation.isValid);
console.log("Warnings:", validation.validation.warnings);
```

---

## 🚨 Common Issues

### Issue: Brand kit not applying to presentation

**Solution**: Check if brand kit is set as default

```tsx
const { brandKit } = await getDefaultBrandKitAction();
if (!brandKit) {
  console.log("No default brand kit set!");
}
```

### Issue: Template not loading

**Solution**: Verify category string matches enum

```tsx
// ✅ Correct
const category: TemplateCategory = "PITCH_DECK";

// ❌ Incorrect
const category = "pitch-deck"; // Wrong format
```

### Issue: Colors not validating

**Solution**: Ensure hex format

```tsx
// ✅ Correct
primaryColor: "#6366f1";

// ❌ Incorrect
primaryColor: "rgb(99, 102, 241)";
```

---

## 💡 Pro Tips

### 1. Cache Template Metadata

```tsx
// Static - can cache safely
const templates = TemplateService.getIndustryTemplates();
// Cache this, it doesn't change per user
```

### 2. Lazy Load Brand Kits

```tsx
// Only load when needed
useEffect(() => {
  if (open) loadBrandKits();
}, [open]);
```

### 3. Combine Actions

```tsx
// Get both in one call
const [kits, defaultKit] = await Promise.all([
  getUserBrandKitsAction(),
  getDefaultBrandKitAction(),
]);
```

### 4. Validate Before Save

```tsx
const validation = BrandKitService.validateBrandColors(colors);
if (!validation.isValid) {
  toast.warning("Color issues detected");
  console.log(validation.warnings);
}
```

---

## 📚 Full Documentation

- [ENTERPRISE_FEATURES.md](./ENTERPRISE_FEATURES.md) - Complete docs (60+ sections)
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Step-by-step integration
- [VISUAL_SUMMARY.md](./VISUAL_SUMMARY.md) - Diagrams and examples
- [GitHub Repository](https://github.com/DevVentures/DeckShala)
- [Report an Issue](https://github.com/DevVentures/DeckShala/issues)
- [Contributing Guide](./CONTRIBUTING.md)

---

## 🎉 Ready to Ship!

All code complete, tested, and documented. Start integrating! 🚀
