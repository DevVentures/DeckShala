import { logger } from "./logger";
import { OllamaService } from "./ollama-service";
import { type PlateSlide } from "@/components/presentation/utils/parser";

/**
 * Auto Design & Theme Engine
 * "One Click Beautiful Slides"
 *
 * AI automatically:
 * - Chooses optimal layouts
 * - Applies professional typography
 * - Matches colors and branding
 * - Generates relevant icons
 * - Ensures smart spacing
 * - Makes users look like design professionals
 */

export interface DesignTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    heading: string;
  };
  fonts: {
    heading: string;
    body: string;
    code?: string;
  };
  spacing: {
    slide: number;
    section: number;
    paragraph: number;
  };
  layouts: LayoutTemplate[];
}

export interface LayoutTemplate {
  id: string;
  name: string;
  type:
  | "title"
  | "content"
  | "two-column"
  | "image-focus"
  | "quote"
  | "timeline"
  | "comparison";
  structure: {
    areas: LayoutArea[];
    grid: string;
  };
}

export interface LayoutArea {
  name: string;
  type: "heading" | "text" | "image" | "icon" | "chart" | "list";
  position: {
    row: string;
    column: string;
  };
  style: Record<string, string>;
}

export interface DesignSuggestions {
  layout: LayoutTemplate;
  colors: string[];
  typography: {
    headingSize: string;
    bodySize: string;
    lineHeight: string;
  };
  icons: IconSuggestion[];
  spacing: SpacingSuggestion;
  images: ImageSuggestion[];
}

export interface IconSuggestion {
  context: string;
  iconName: string;
  position: "inline" | "header" | "bullet";
  color?: string;
}

export interface SpacingSuggestion {
  contentPadding: string;
  elementGap: string;
  lineHeight: string;
}

export interface ImageSuggestion {
  context: string;
  type: "photo" | "illustration" | "diagram" | "chart";
  placement: "full" | "half" | "thumbnail";
  description: string;
}

export interface BrandingRules {
  companyName?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  style?: "modern" | "classic" | "minimal" | "creative";
}

export class AutoDesignEngine {
  // Predefined professional themes
  private static readonly THEMES: DesignTheme[] = [
    {
      id: "modern-blue",
      name: "Modern Blue",
      colors: {
        primary: "#2563eb",
        secondary: "#3b82f6",
        accent: "#60a5fa",
        background: "#ffffff",
        text: "#1e293b",
        heading: "#0f172a",
      },
      fonts: {
        heading: "Inter, sans-serif",
        body: "Inter, sans-serif",
      },
      spacing: {
        slide: 40,
        section: 24,
        paragraph: 16,
      },
      layouts: [],
    },
    {
      id: "elegant-purple",
      name: "Elegant Purple",
      colors: {
        primary: "#7c3aed",
        secondary: "#8b5cf6",
        accent: "#a78bfa",
        background: "#ffffff",
        text: "#374151",
        heading: "#1f2937",
      },
      fonts: {
        heading: "Poppins, sans-serif",
        body: "Inter, sans-serif",
      },
      spacing: {
        slide: 48,
        section: 28,
        paragraph: 18,
      },
      layouts: [],
    },
    {
      id: "minimal-black",
      name: "Minimal Black",
      colors: {
        primary: "#000000",
        secondary: "#404040",
        accent: "#737373",
        background: "#ffffff",
        text: "#525252",
        heading: "#000000",
      },
      fonts: {
        heading: "Helvetica, sans-serif",
        body: "Arial, sans-serif",
      },
      spacing: {
        slide: 56,
        section: 32,
        paragraph: 20,
      },
      layouts: [],
    },
    {
      id: "vibrant-gradient",
      name: "Vibrant Gradient",
      colors: {
        primary: "#ec4899",
        secondary: "#8b5cf6",
        accent: "#3b82f6",
        background: "#ffffff",
        text: "#334155",
        heading: "#0f172a",
      },
      fonts: {
        heading: "Montserrat, sans-serif",
        body: "Inter, sans-serif",
      },
      spacing: {
        slide: 44,
        section: 26,
        paragraph: 18,
      },
      layouts: [],
    },
    {
      id: "corporate-gray",
      name: "Corporate Gray",
      colors: {
        primary: "#475569",
        secondary: "#64748b",
        accent: "#94a3b8",
        background: "#f8fafc",
        text: "#334155",
        heading: "#1e293b",
      },
      fonts: {
        heading: "Roboto, sans-serif",
        body: "Roboto, sans-serif",
      },
      spacing: {
        slide: 40,
        section: 24,
        paragraph: 16,
      },
      layouts: [],
    },
  ];

  /**
   * Main entry: Automatically design entire presentation
   */
  static async autoDesignPresentation(
    slides: PlateSlide[],
    options: {
      branding?: BrandingRules;
      targetAudience?: string;
      presentationType?: string;
      preferredStyle?: string;
    } = {}
  ): Promise<{
    designedSlides: PlateSlide[];
    theme: DesignTheme;
    appliedDesigns: DesignSuggestions[];
  }> {
    try {
      logger.info("AutoDesign: Starting auto-design process", {
        slidesCount: slides.length,
      });

      // Step 1: Analyze content and select appropriate theme
      const theme = await AutoDesignEngine.selectTheme(slides, options);

      // Step 2: Apply layout to each slide
      const designedSlides: PlateSlide[] = [];
      const appliedDesigns: DesignSuggestions[] = [];

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        if (!slide) continue;
        const design = await AutoDesignEngine.designSlide(slide, theme, i, options);

        designedSlides.push(design.slide);
        appliedDesigns.push(design.suggestions);
      }

      logger.info("AutoDesign: Completed auto-design", {
        themeName: theme.name,
      });

      return {
        designedSlides,
        theme,
        appliedDesigns,
      };
    } catch (error) {
      logger.error("AutoDesign: Failed to design presentation", error as Error);
      throw error;
    }
  }

  /**
   * Select optimal theme based on content analysis
   */
  private static async selectTheme(
    slides: PlateSlide[],
    options: {
      branding?: BrandingRules;
      targetAudience?: string;
      presentationType?: string;
    }
  ): Promise<DesignTheme> {
    // Extract text from slides for analysis
    const slideTexts = slides
      .map((slide) => AutoDesignEngine.extractTextFromSlide(slide))
      .join("\n");

    const prompt = `
Analyze this presentation content and recommend the best design theme:

Content:
${slideTexts.slice(0, 2000)}

Target Audience: ${options.targetAudience || "general"}
Presentation Type: ${options.presentationType || "business"}

Available themes:
${AutoDesignEngine.THEMES.map((t) => `- ${t.name}: ${t.id}`).join("\n")}

Consider:
1. Content formality
2. Target audience
3. Industry/context
4. Branding requirements

Respond with only the theme ID (e.g., "modern-blue").
`;

    const response = await OllamaService.generateText(prompt, {
      temperature: 0.2,
      maxTokens: 50,
    });

    const themeId = response.trim().toLowerCase().replace(/['"]/g, "");
    const selectedTheme =
      AutoDesignEngine.THEMES.find((t) => t.id === themeId) || AutoDesignEngine.THEMES[0];

    if (!selectedTheme) {
      throw new Error("No theme available");
    }

    // Apply branding overrides if provided
    if (options.branding) {
      return AutoDesignEngine.applyBranding(selectedTheme, options.branding);
    }

    return selectedTheme;
  }

  /**
   * Design individual slide
   */
  private static async designSlide(
    slide: PlateSlide,
    theme: DesignTheme,
    index: number,
    options: Record<string, unknown>
  ): Promise<{
    slide: PlateSlide;
    suggestions: DesignSuggestions;
  }> {
    const slideText = AutoDesignEngine.extractTextFromSlide(slide);

    // Determine optimal layout
    const layout = AutoDesignEngine.selectLayout(slide, slideText);

    // Generate design suggestions
    const suggestions: DesignSuggestions = {
      layout,
      colors: [theme.colors.primary, theme.colors.secondary, theme.colors.accent],
      typography: {
        headingSize: index === 0 ? "3rem" : "2rem",
        bodySize: "1.125rem",
        lineHeight: "1.6",
      },
      icons: await AutoDesignEngine.suggestIcons(slideText),
      spacing: {
        contentPadding: `${theme.spacing.slide}px`,
        elementGap: `${theme.spacing.section}px`,
        lineHeight: "1.6",
      },
      images: await AutoDesignEngine.suggestImages(slideText),
    };

    // Apply design to slide
    const designedSlide = AutoDesignEngine.applyDesignToSlide(slide, theme, suggestions);

    return {
      slide: designedSlide,
      suggestions,
    };
  }

  /**
   * Select optimal layout for slide
   */
  private static selectLayout(
    slide: PlateSlide,
    text: string
  ): LayoutTemplate {
    // Analyze slide content to determine best layout
    const hasImage = text.toLowerCase().includes("image");
    const hasList = text.includes("•") || text.includes("-") || text.includes("*");
    const hasComparison =
      text.toLowerCase().includes("vs") ||
      text.toLowerCase().includes("versus");
    const isTitle = slide.layoutType === "left";

    if (isTitle) {
      return {
        id: "title-center",
        name: "Centered Title",
        type: "title",
        structure: {
          areas: [
            {
              name: "main",
              type: "heading",
              position: { row: "1", column: "1" },
              style: { textAlign: "center" },
            },
          ],
          grid: "1fr / 1fr",
        },
      };
    }

    if (hasComparison) {
      return {
        id: "two-column",
        name: "Two Column Comparison",
        type: "two-column",
        structure: {
          areas: [
            {
              name: "left",
              type: "text",
              position: { row: "1", column: "1" },
              style: {},
            },
            {
              name: "right",
              type: "text",
              position: { row: "1", column: "2" },
              style: {},
            },
          ],
          grid: "1fr / 1fr 1fr",
        },
      };
    }

    if (hasImage) {
      return {
        id: "image-text",
        name: "Image with Text",
        type: "image-focus",
        structure: {
          areas: [
            {
              name: "content",
              type: "text",
              position: { row: "1", column: "1" },
              style: {},
            },
            {
              name: "media",
              type: "image",
              position: { row: "1", column: "2" },
              style: {},
            },
          ],
          grid: "1fr / 1fr 1fr",
        },
      };
    }

    // Default content layout
    return {
      id: "standard-content",
      name: "Standard Content",
      type: "content",
      structure: {
        areas: [
          {
            name: "header",
            type: "heading",
            position: { row: "1", column: "1" },
            style: {},
          },
          {
            name: "body",
            type: "text",
            position: { row: "2", column: "1" },
            style: {},
          },
        ],
        grid: "auto 1fr / 1fr",
      },
    };
  }

  /**
   * Suggest icons for slide content
   */
  private static async suggestIcons(text: string): Promise<IconSuggestion[]> {
    const prompt = `
Suggest relevant icons for this slide content:
${text.slice(0, 500)}

Provide 2-3 icon suggestions in JSON format:
[
  {
    "context": "string describing what this represents",
    "iconName": "lucide-react icon name",
    "position": "inline|header|bullet",
    "color": "optional color"
  }
]

Use common lucide-react icons like: CheckCircle, ArrowRight, Lightbulb, Target, TrendingUp, Users, etc.
`;

    try {
      const response = await OllamaService.generateText(prompt, {
        temperature: 0.4,
        maxTokens: 300,
      });

      return JSON.parse(response);
    } catch {
      // Return default icons if AI fails
      return [
        {
          context: "general",
          iconName: "Circle",
          position: "bullet",
        },
      ];
    }
  }

  /**
   * Suggest images for slide content
   */
  private static async suggestImages(
    text: string
  ): Promise<ImageSuggestion[]> {
    const prompt = `
Suggest relevant images for this slide content:
${text.slice(0, 500)}

Provide 1-2 image suggestions in JSON format:
[
  {
    "context": "what this image should represent",
    "type": "photo|illustration|diagram|chart",
    "placement": "full|half|thumbnail",
    "description": "detailed description for image generation"
  }
]
`;

    try {
      const response = await OllamaService.generateText(prompt, {
        temperature: 0.4,
        maxTokens: 300,
      });

      return JSON.parse(response);
    } catch {
      return [];
    }
  }

  /**
   * Apply design to slide
   */
  private static applyDesignToSlide(
    slide: PlateSlide,
    theme: DesignTheme,
    suggestions: DesignSuggestions
  ): PlateSlide {
    // Clone slide
    const designedSlide = { ...slide };

    // Apply theme colors and typography to content
    if (designedSlide.content) {
      designedSlide.content = designedSlide.content.map((child: any) => {
        if (child.type === "h1" || child.type === "h2") {
          return {
            ...child,
            style: {
              color: theme.colors.heading,
              fontFamily: theme.fonts.heading,
              fontSize: suggestions.typography.headingSize,
              marginBottom: suggestions.spacing.elementGap,
            },
          };
        }

        if (child.type === "p") {
          return {
            ...child,
            style: {
              color: theme.colors.text,
              fontFamily: theme.fonts.body,
              fontSize: suggestions.typography.bodySize,
              lineHeight: suggestions.typography.lineHeight,
            },
          };
        }

        return child;
      });
    }

    // Apply background color
    if (!designedSlide.bgColor) {
      designedSlide.bgColor = theme.colors.background;
    }

    return designedSlide;
  }

  /**
   * Apply branding rules to theme
   */
  private static applyBranding(
    theme: DesignTheme,
    branding: BrandingRules
  ): DesignTheme {
    const customTheme = { ...theme };

    if (branding.primaryColor) {
      customTheme.colors.primary = branding.primaryColor;
    }

    if (branding.secondaryColor) {
      customTheme.colors.secondary = branding.secondaryColor;
    }

    if (branding.fontFamily) {
      customTheme.fonts.heading = branding.fontFamily;
      customTheme.fonts.body = branding.fontFamily;
    }

    return customTheme;
  }

  /**
   * Extract text from slide for analysis
   */
  private static extractTextFromSlide(slide: PlateSlide): string {
    const extractText = (node: any): string => {
      if (typeof node === "string") return node;
      if (node.text) return node.text;
      if (node.children) {
        return node.children.map(extractText).join(" ");
      }
      return "";
    };

    if (slide.content) {
      return slide.content.map(extractText).join(" ");
    }

    return "";
  }

  /**
   * Get all available themes
   */
  static getAvailableThemes(): DesignTheme[] {
    return AutoDesignEngine.THEMES;
  }

  /**
   * Apply smart spacing to presentation
   */
  static applySmartSpacing(
    slide: PlateSlide,
    theme: DesignTheme
  ): PlateSlide {
    // Apply consistent spacing rules by setting background color
    // Spacing is handled by the renderer
    return {
      ...slide,
      bgColor: slide.bgColor || theme.colors.background,
    };
  }
}
