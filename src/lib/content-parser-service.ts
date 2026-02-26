import { logger } from "./logger";
import { OllamaService } from "./ollama-service";
import { type PlateSlide } from "@/components/presentation/utils/parser";

/**
 * Smart Content-to-Presentation Generator Service
 * Supports multiple input formats:
 * - Plain text
 * - PDF
 * - Word document
 * - URL / blog link
 * - YouTube video
 * - Research paper
 * - Meeting notes
 * - Voice transcript
 */

export interface ContentInput {
  type:
  | "text"
  | "pdf"
  | "word"
  | "url"
  | "youtube"
  | "research-paper"
  | "meeting-notes"
  | "voice-transcript";
  content: string; // Raw content or URL
  file?: File; // For file uploads
  metadata?: {
    title?: string;
    author?: string;
    date?: string;
    language?: string;
    targetAudience?: string;
  };
}

export interface ParsedContent {
  title: string;
  keyPoints: string[];
  sections: ContentSection[];
  metadata: {
    sourceType: string;
    wordCount: number;
    estimatedSlides: number;
    language: string;
    topics: string[];
  };
}

export interface ContentSection {
  heading: string;
  content: string;
  bullets: string[];
  importance: "high" | "medium" | "low";
  suggestedVisuals?: string[];
}

export interface GeneratedPresentation {
  title: string;
  slides: PlateSlide[];
  outline: string[];
  theme: string;
  style: string;
}

export class ContentParserService {
  /**
   * Main entry point: Parse any content type and generate presentation
   */
  static async parseAndGenerate(
    input: ContentInput
  ): Promise<GeneratedPresentation> {
    try {
      logger.info("ContentParser: Starting content parsing", {
        type: input.type,
      });

      // Step 1: Parse content based on type
      const parsedContent = await ContentParserService.parseContent(input);

      // Step 2: Extract key points and structure
      const structuredContent = await ContentParserService.structureContent(parsedContent);

      // Step 3: Generate presentation slides
      const presentation = await ContentParserService.generatePresentation(structuredContent);

      logger.info("ContentParser: Successfully generated presentation", {
        slidesCount: presentation.slides.length,
      });

      return presentation;
    } catch (error) {
      logger.error("ContentParser: Failed to parse content", error as Error);
      throw error;
    }
  }

  /**
   * Parse content based on input type
   */
  private static async parseContent(
    input: ContentInput
  ): Promise<ParsedContent> {
    switch (input.type) {
      case "text":
        return ContentParserService.parseTextContent(input.content);
      case "pdf":
        return ContentParserService.parsePDFContent(input);
      case "word":
        return ContentParserService.parseWordContent(input);
      case "url":
        return ContentParserService.parseURLContent(input.content);
      case "youtube":
        return ContentParserService.parseYouTubeContent(input.content);
      case "research-paper":
        return ContentParserService.parseResearchPaper(input);
      case "meeting-notes":
        return ContentParserService.parseMeetingNotes(input.content);
      case "voice-transcript":
        return ContentParserService.parseVoiceTranscript(input.content);
      default:
        throw new Error(`Unsupported content type: ${input.type}`);
    }
  }

  /**
   * Parse plain text content
   */
  private static async parseTextContent(
    content: string
  ): Promise<ParsedContent> {
    const prompt = `
You are an expert content analyzer. Analyze the following text and extract:
1. A clear title
2. Key points (5-10 main ideas)
3. Logical sections with headings
4. Bullet points for each section

Text:
${content}

Respond in JSON format:
{
  "title": "string",
  "keyPoints": ["string"],
  "sections": [
    {
      "heading": "string",
      "content": "string",
      "bullets": ["string"],
      "importance": "high|medium|low",
      "suggestedVisuals": ["string"]
    }
  ],
  "topics": ["string"]
}
`;

    const response = await OllamaService.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 2000,
    });

    const parsed = JSON.parse(response);

    return {
      ...parsed,
      metadata: {
        sourceType: "text",
        wordCount: content.split(/\s+/).length,
        estimatedSlides: Math.ceil(parsed.sections.length * 1.5),
        language: "en",
        topics: parsed.topics || [],
      },
    };
  }

  /**
   * Parse PDF content
   */
  private static async parsePDFContent(
    input: ContentInput
  ): Promise<ParsedContent> {
    try {
      // Use pdf-lib to extract text
      const pdfLib = await import("pdf-lib");

      if (!input.file) {
        throw new Error("PDF file is required");
      }

      const arrayBuffer = await input.file.arrayBuffer();
      const pdfDoc = await pdfLib.PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      let extractedText = "";
      // Note: pdf-lib doesn't extract text directly, we need to use a different library
      // For now, we'll prompt the user to use text extraction or OCR

      // If we have content passed directly (pre-extracted)
      if (input.content) {
        extractedText = input.content;
      } else {
        throw new Error(
          "PDF text extraction requires additional processing. Please provide extracted text."
        );
      }

      return ContentParserService.parseTextContent(extractedText);
    } catch (error) {
      logger.error("Failed to parse PDF", error as Error);
      throw error;
    }
  }

  /**
   * Parse Word document
   */
  private static async parseWordContent(
    input: ContentInput
  ): Promise<ParsedContent> {
    // For Word documents, we'd need mammoth or similar library
    // For now, use pre-extracted text
    if (!input.content) {
      throw new Error("Word document text content is required");
    }

    return ContentParserService.parseTextContent(input.content);
  }

  /**
   * Parse URL/blog content
   */
  private static async parseURLContent(url: string): Promise<ParsedContent> {
    try {
      // Fetch and parse webpage content
      const response = await fetch(url);
      const html = await response.text();

      // Extract main content (simplified - you might want to use a library like cheerio)
      const textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      return ContentParserService.parseTextContent(textContent);
    } catch (error) {
      logger.error("Failed to parse URL", error as Error);
      throw error;
    }
  }

  /**
   * Parse YouTube video content
   */
  private static async parseYouTubeContent(
    url: string
  ): Promise<ParsedContent> {
    // Extract video ID
    const videoId = ContentParserService.extractYouTubeVideoId(url);

    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    // Note: You'd need to integrate with YouTube API or transcript services
    // For now, we'll use a placeholder that expects the transcript to be provided

    const prompt = `
Analyze this YouTube video URL and create a presentation structure.
URL: ${url}
Video ID: ${videoId}

Generate a comprehensive presentation outline with:
- Title based on the video topic
- Key takeaways
- Main sections with content

Respond in JSON format as specified.
`;

    const response = await OllamaService.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 2000,
    });

    const parsed = JSON.parse(response);

    return {
      ...parsed,
      metadata: {
        sourceType: "youtube",
        wordCount: 0,
        estimatedSlides: parsed.sections?.length || 5,
        language: "en",
        topics: parsed.topics || [],
      },
    };
  }

  /**
   * Parse research paper
   */
  private static async parseResearchPaper(
    input: ContentInput
  ): Promise<ParsedContent> {
    const prompt = `
You are analyzing a research paper. Extract and structure:
1. Title and abstract
2. Introduction and background
3. Methodology
4. Key findings
5. Results and discussion
6. Conclusions

Content:
${input.content}

Focus on creating a clear, accessible presentation that explains the research.

Respond in JSON format.
`;

    const response = await OllamaService.generateText(prompt, {
      temperature: 0.2,
      maxTokens: 2500,
    });

    const parsed = JSON.parse(response);

    return {
      ...parsed,
      metadata: {
        sourceType: "research-paper",
        wordCount: input.content.split(/\s+/).length,
        estimatedSlides: 8,
        language: "en",
        topics: parsed.topics || [],
      },
    };
  }

  /**
   * Parse meeting notes
   */
  private static async parseMeetingNotes(
    content: string
  ): Promise<ParsedContent> {
    const prompt = `
Analyze these meeting notes and create a presentation:
1. Meeting title/topic
2. Key decisions made
3. Action items
4. Important discussions
5. Next steps

Meeting Notes:
${content}

Create a clear, actionable presentation structure.

Respond in JSON format.
`;

    const response = await OllamaService.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 2000,
    });

    const parsed = JSON.parse(response);

    return {
      ...parsed,
      metadata: {
        sourceType: "meeting-notes",
        wordCount: content.split(/\s+/).length,
        estimatedSlides: parsed.sections?.length || 5,
        language: "en",
        topics: parsed.topics || [],
      },
    };
  }

  /**
   * Parse voice transcript
   */
  private static async parseVoiceTranscript(
    content: string
  ): Promise<ParsedContent> {
    const prompt = `
Analyze this voice transcript and create a structured presentation:
1. Clean up filler words and repetitions
2. Identify main topics
3. Extract key messages
4. Create logical flow

Transcript:
${content}

Transform this into a professional presentation structure.

Respond in JSON format.
`;

    const response = await OllamaService.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 2000,
    });

    const parsed = JSON.parse(response);

    return {
      ...parsed,
      metadata: {
        sourceType: "voice-transcript",
        wordCount: content.split(/\s+/).length,
        estimatedSlides: parsed.sections?.length || 5,
        language: "en",
        topics: parsed.topics || [],
      },
    };
  }

  /**
   * Structure content into logical presentation flow
   */
  private static async structureContent(
    parsed: ParsedContent
  ): Promise<ParsedContent> {
    // Apply intelligent structuring logic
    // Ensure good flow: intro -> main content -> conclusion

    const sections = parsed.sections || [];

    // Add intro slide if not present
    if (!sections.some((s) => s.heading.toLowerCase().includes("intro"))) {
      sections.unshift({
        heading: "Introduction",
        content: `Overview of ${parsed.title}`,
        bullets: parsed.keyPoints.slice(0, 3),
        importance: "high" as const,
        suggestedVisuals: ["diagram", "icon"],
      });
    }

    // Add conclusion if not present
    if (
      !sections.some((s) => s.heading.toLowerCase().includes("conclusion"))
    ) {
      sections.push({
        heading: "Conclusion",
        content: "Key takeaways and next steps",
        bullets: parsed.keyPoints.slice(-3),
        importance: "high" as const,
        suggestedVisuals: ["checkmark", "arrow"],
      });
    }

    return {
      ...parsed,
      sections,
    };
  }

  /**
   * Generate presentation slides from structured content
   */
  private static async generatePresentation(
    content: ParsedContent
  ): Promise<GeneratedPresentation> {
    const slides: PlateSlide[] = [];

    // Title slide
    slides.push({
      id: `slide-0`,
      content: [
        {
          type: "h1",
          children: [{ text: content.title }],
        },
        {
          type: "p",
          children: [
            {
              text: content.metadata.sourceType
                ? `Source: ${content.metadata.sourceType}`
                : "",
            },
          ],
        },
      ],
      layoutType: "left",
      alignment: "center",
    });

    // Content slides
    content.sections.forEach((section, index) => {
      slides.push({
        id: `slide-${index + 1}`,
        content: [
          {
            type: "h2",
            children: [{ text: section.heading }],
          },
          {
            type: "p",
            children: [{ text: section.content }],
          },
          {
            type: "ul",
            children: section.bullets.map((bullet) => ({
              type: "li",
              children: [{ text: bullet }],
            })),
          },
        ],
        layoutType: "left",
        alignment: "start",
      });
    });

    // Generate outline
    const outline = content.sections.map((s) => s.heading);

    return {
      title: content.title,
      slides,
      outline,
      theme: "default",
      style: "professional",
    };
  }

  /**
   * Utility: Extract YouTube video ID from URL
   */
  private static extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Validate content input
   */
  static validateInput(input: ContentInput): boolean {
    if (!input.type) {
      throw new Error("Content type is required");
    }

    if (
      !input.content &&
      !input.file &&
      !["pdf", "word"].includes(input.type)
    ) {
      throw new Error("Content or file is required");
    }

    return true;
  }

  /**
   * Estimate slide count from content
   */
  static estimateSlideCount(content: string): number {
    const wordCount = content.split(/\s+/).length;

    // Heuristic: ~100-150 words per slide
    const estimatedSlides = Math.ceil(wordCount / 125);

    // Add title and conclusion
    return Math.max(estimatedSlides + 2, 3);
  }
}
