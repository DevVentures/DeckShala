# 🚀 Quick Start Guide - Smart AI Features

## ⚡ Instant Setup (5 Minutes)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Setup Environment

```env
# .env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
DATABASE_URL="postgresql://..."
```

### 3. Run Database Migration

```bash
pnpm prisma generate
pnpm prisma db push
```

### 4. Start Development Server

```bash
pnpm dev
```

## 🎯 Use Cases & Examples

### Example 1: Generate from Text (Students/Professionals)

```tsx
import { useSmartPresentation } from "@/hooks/presentation/use-smart-features";

function MyComponent() {
  const { createSmartPresentationComplete, isProcessing } =
    useSmartPresentation();

  const handleGenerate = async () => {
    const result = await createSmartPresentationComplete(
      {
        type: "text",
        content: `
          Climate Change Impact Analysis
          
          Global temperatures have risen 1.1°C since pre-industrial times.
          Key impacts include:
          - Rising sea levels threatening coastal cities
          - Extreme weather events increasing in frequency
          - Biodiversity loss accelerating
          
          Solutions:
          - Renewable energy transition
          - Carbon capture technologies
          - Sustainable practices
        `,
      },
      {
        autoDesign: true,
        analyzeCopilot: true,
        presentationType: "academic",
      },
    );

    console.log("Generated presentation:", result);
  };

  return (
    <button onClick={handleGenerate} disabled={isProcessing}>
      Generate Smart Presentation
    </button>
  );
}
```

### Example 2: Generate from URL (Marketers)

```tsx
import { parseURLContent } from "@/app/_actions/presentation/smart-generation-actions";

const result = await parseURLContent("https://yourblog.com/article");
// Automatically extracts content and creates slides
```

### Example 3: Auto-Design Existing Slides (Everyone)

```tsx
import { autoDesignPresentation } from "@/app/_actions/presentation/smart-generation-actions";

const result = await autoDesignPresentation(existingSlides, {
  branding: {
    primaryColor: "#2563eb",
    secondaryColor: "#3b82f6",
  },
  targetAudience: "investors",
  presentationType: "pitch-deck",
});
```

### Example 4: Real-Time Co-Pilot (Quality Improvement)

```tsx
import { AICopilotPanel } from "@/components/presentation/ai-copilot-panel";

<AICopilotPanel
  slide={currentSlide}
  slideIndex={0}
  onApplySuggestion={(updated) => updateSlide(updated)}
  onUpdateSpeakerNotes={(notes) => saveNotes(notes)}
/>;
```

### Example 5: All-in-One Component

```tsx
import { SmartFeaturesIntegration } from "@/components/presentation/smart-features-integration";

function PresentationEditor() {
  return (
    <SmartFeaturesIntegration
      currentSlides={slides}
      currentSlideIndex={0}
      onSlidesUpdate={(newSlides) => setSlides(newSlides)}
      onSlideUpdate={(slide, idx) => updateSlideAt(idx, slide)}
    />
  );
}
```

## 🎨 Feature Integration Workflow

### Complete Workflow (Recommended)

```
1. User inputs content (text/URL/file)
   ↓
2. Smart Content Generator parses and creates structure
   ↓
3. Auto Design Engine applies theme and layouts
   ↓
4. AI Co-Pilot analyzes and suggests improvements
   ↓
5. User reviews and accepts suggestions
   ↓
6. Professional presentation ready!
```

### Minimal Workflow

```
1. Generate from content → 2. Done! (auto-design included)
```

## 📊 Real-World Scenarios

### Scenario 1: Student Research Paper → Presentation

```tsx
const result = await createSmartPresentationComplete(
  {
    type: "research-paper",
    content: yourResearchPaperText,
  },
  {
    autoDesign: true,
    presentationType: "academic",
    targetAudience: "professors",
  },
);
// Creates academic-style presentation with proper structure
```

### Scenario 2: Meeting Notes → Team Presentation

```tsx
const result = await createSmartPresentationComplete(
  {
    type: "meeting-notes",
    content: meetingTranscript,
  },
  {
    autoDesign: true,
    presentationType: "business",
  },
);
// Extracts decisions, action items, and creates clear slides
```

### Scenario 3: YouTube Video → Educational Slides

```tsx
const result = await parseYouTubeVideo("https://youtube.com/watch?v=...");
// Analyzes video and creates teaching slides
```

### Scenario 4: Blog Post → Marketing Deck

```tsx
const result = await parseURLContent("https://yourblog.com/product-launch");
// Converts blog content to sales-ready presentation
```

## 🔧 Advanced Customization

### Custom Theme Creation

```typescript
// Add to src/lib/auto-design-engine.ts
private static readonly THEMES = [
  ...existing themes,
  {
    id: "startup-green",
    name: "Startup Green",
    colors: {
      primary: "#10b981",
      secondary: "#34d399",
      accent: "#6ee7b7",
      background: "#ffffff",
      text: "#1f2937",
      heading: "#111827",
    },
    fonts: {
      heading: "Space Grotesk, sans-serif",
      body: "Inter, sans-serif",
    },
    spacing: { slide: 44, section: 26, paragraph: 18 },
    layouts: [],
  },
];
```

### Custom Content Parser

```typescript
// Extend ContentParserService for custom formats
export async function parseCustomFormat(content: string) {
  return ContentParserService.parseAndGenerate({
    type: "text", // or add custom type
    content: processedContent,
    metadata: {
      title: "Custom Format",
      // ...
    },
  });
}
```

## 🎯 Performance Tips

### 1. Batch Processing

```tsx
// Analyze multiple slides at once
const results = await analyzePresentationBatch(allSlides, {
  checkGrammar: true,
  generateSpeakerNotes: true,
});
```

### 2. Selective Features

```tsx
// Disable expensive features for faster processing
await analyzeSlideWithCopilot(slide, index, {
  checkGrammar: true,
  generateSpeakerNotes: false, // Disable for speed
  suggestImages: false, // Disable for speed
});
```

### 3. Caching

```tsx
// Results are automatically cached in AIGenerationCache table
// Reusing same content will be instant!
```

## 📈 Analytics Integration

```typescript
// Usage is automatically tracked
// Query analytics:
const usage = await prisma.smartFeatureUsage.findMany({
  where: { userId: currentUser.id },
  orderBy: { createdAt: "desc" },
});

const contentGenHistory = await prisma.contentGenerationHistory.findMany({
  where: { userId: currentUser.id },
});
```

## 🐛 Common Issues & Solutions

### Issue: "No models available"

**Solution:** Ensure Ollama is running:

```bash
ollama serve
ollama pull llama3.2
```

### Issue: Slow generation

**Solution:**

1. Check Ollama is running locally (not remote)
2. Use smaller models for development
3. Reduce maxTokens in options

### Issue: Design not applying

**Solution:**

```tsx
// Verify theme availability first
const themes = await getAvailableThemes();
console.log("Available themes:", themes);
```

### Issue: Suggestions not appearing

**Solution:**

```tsx
// Check if content is sufficient
const text = extractTextFromSlide(slide);
if (text.length < 20) {
  // Add more content
}
```

## 🎓 Best Practices

### 1. Content Generation

- Provide clear, well-structured input
- Use appropriate content type
- Include metadata for better results

### 2. Auto Design

- Let AI choose theme first
- Apply custom branding only when needed
- Test different audiences for variety

### 3. Co-Pilot

- Run analysis after major edits
- Review all suggestions before applying
- Use speaker notes for preparation

### 4. Performance

- Generate content once, design multiple times
- Cache results for repeated use
- Batch analyze when possible

## 🚀 Production Deployment

### Environment Variables

```env
# Production
OLLAMA_BASE_URL=https://your-ollama-instance.com
OLLAMA_MODEL=llama3.2
DATABASE_URL="postgresql://prod..."

# Optional: API Keys for enhanced features
OPENAI_API_KEY=sk-...
```

### Database

```bash
# Run migrations
pnpm prisma migrate deploy

# Generate client
pnpm prisma generate
```

### Build

```bash
pnpm build
pnpm start
```

## 📚 Additional Resources

- **Full Documentation**: [SMART_FEATURES.md](./SMART_FEATURES.md)
- **API Reference**: See service files in `src/lib/`
- **Examples**: See component files in `src/components/presentation/`
- **Hooks**: `src/hooks/presentation/use-smart-features.tsx`

## 🤝 Support

- Check inline documentation
- Review error messages
- Enable verbose logging for debugging
- Create GitHub issues for bugs

## 🎉 Success Metrics

After implementation, track:

- **Time saved**: Compare manual vs AI creation
- **Quality improvement**: Before/after design comparison
- **User engagement**: Retention and feature usage
- **Business impact**: Conversion rates on presentations

---

**Ready to transform your presentation workflow? Start with Example 1 above!**

For questions or issues, check [SMART_FEATURES.md](./SMART_FEATURES.md) for detailed documentation.
