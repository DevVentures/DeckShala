import { OllamaService } from "./ollama-service";
import { logger } from "./logger";
import { db } from "@/server/db";

/**
 * AI-Powered Presentation Insights Service
 * Provides intelligent analysis and suggestions for presentations
 */

export interface PresentationInsights {
  score: number; // 0-100
  readabilityScore: number;
  engagementScore: number;
  designScore: number;
  suggestions: string[];
  strengths: string[];
  improvements: string[];
  estimatedDuration: number; // in minutes
  targetAudience?: string;
  complexity: "beginner" | "intermediate" | "advanced";
}

export class AIInsightsService {
  /**
   * Analyze presentation and provide AI-powered insights
   */
  static async analyzePresentationContent(
    presentationId: string,
    content: {
      slides: Array<{ content: string; layout?: string }>;
      title: string;
      theme?: string;
    }
  ): Promise<PresentationInsights> {
    try {
      // Extract text content from slides
      const textContent = content.slides
        .map((slide, idx) => `Slide ${idx + 1}: ${slide.content}`)
        .join("\n\n");

      const analysisPrompt = `Analyze this presentation and provide a comprehensive assessment:

Title: ${content.title}
Total Slides: ${content.slides.length}

Content:
${textContent.substring(0, 5000)} ${textContent.length > 5000 ? "..." : ""}

Provide analysis in the following JSON format:
{
  "score": <overall score 0-100>,
  "readabilityScore": <readability 0-100>,
  "engagementScore": <engagement potential 0-100>,
  "designScore": <design quality 0-100>,
  "suggestions": [<array of specific improvement suggestions>],
  "strengths": [<array of key strengths>],
  "improvements": [<array of areas for improvement>],
  "estimatedDuration": <presentation duration in minutes>,
  "targetAudience": "<identified target audience>",
  "complexity": "<beginner|intermediate|advanced>"
}

Consider:
- Content clarity and organization
- Visual design and layout variety
- Engagement and storytelling
- Information density
- Call-to-action effectiveness
- Professional tone`;

      const result = await OllamaService.generateWithFallback(analysisPrompt, {
        temperature: 0.3, // Lower temperature for more consistent analysis
        maxTokens: 1500,
      });

      // Parse AI response
      const responseText = result.response;

      // Extract JSON from response (handle markdown code blocks)
      let jsonText = responseText;
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonText = jsonMatch[1];
      }

      const insights = JSON.parse(jsonText) as PresentationInsights;

      // Store insights in database
      await db.presentationAnalytics.create({
        data: {
          presentationId,
          userId: "", // Will be filled by caller
          eventType: "ai_insights",
          eventData: insights as any,
        },
      });

      logger.info("Presentation insights generated", {
        presentationId,
        score: insights.score,
        model: result.model,
      });

      return insights;
    } catch (error) {
      logger.error("Generate insights error", error as Error, { presentationId });

      // Return default insights on error
      return {
        score: 70,
        readabilityScore: 70,
        engagementScore: 70,
        designScore: 70,
        suggestions: ["Unable to generate detailed insights at this time"],
        strengths: ["Presentation created successfully"],
        improvements: ["Consider reviewing content for clarity"],
        estimatedDuration: content.slides.length * 1.5, // 1.5 min per slide
        complexity: "intermediate",
      };
    }
  }

  /**
   * Suggest improvements for specific slides
   */
  static async suggestSlideImprovements(
    slideContent: string,
    slideIndex: number,
    presentationContext?: string
  ): Promise<{
    suggestions: string[];
    alternativeLayouts?: string[];
    contentEnhancements?: string[];
  }> {
    try {
      const prompt = `Analyze this presentation slide and suggest improvements:

Slide ${slideIndex + 1}:
${slideContent}

${presentationContext ? `Presentation Context: ${presentationContext}` : ""}

Provide suggestions in JSON format:
{
  "suggestions": [<array of specific suggestions>],
  "alternativeLayouts": [<suggested alternative layouts>],
  "contentEnhancements": [<ways to enhance the content>]
}`;

      const result = await OllamaService.generateWithFallback(prompt, {
        temperature: 0.4,
        maxTokens: 800,
      });

      const jsonText = result.response.match(/```json\n([\s\S]*?)\n```/)?.[1] || result.response;
      const suggestions = JSON.parse(jsonText);

      return suggestions;
    } catch (error) {
      logger.error("Suggest slide improvements error", error as Error);
      return {
        suggestions: ["Unable to generate suggestions at this time"],
        alternativeLayouts: [],
        contentEnhancements: [],
      };
    }
  }

  /**
   * Generate speaker notes using AI
   */
  static async generateSpeakerNotes(
    slideContent: string,
    slideIndex: number,
    duration: number = 2 // minutes per slide
  ): Promise<string> {
    try {
      const prompt = `Generate professional speaker notes for this presentation slide:

Slide ${slideIndex + 1}:
${slideContent}

Target Duration: ${duration} minutes

Generate comprehensive speaker notes that include:
- Key talking points
- Transitions to next topic
- Questions to engage audience
- Important statistics or facts to emphasize
- Pacing suggestions

Keep it concise and actionable.`;

      const result = await OllamaService.generateWithFallback(prompt, {
        temperature: 0.5,
        maxTokens: 500,
      });

      return result.response;
    } catch (error) {
      logger.error("Generate speaker notes error", error as Error);
      return "Speaker notes could not be generated at this time.";
    }
  }

  /**
   * Suggest relevant images for slides
   */
  static async suggestImages(
    slideContent: string,
    theme?: string
  ): Promise<string[]> {
    try {
      const prompt = `Based on this slide content, suggest 3 specific image search queries that would complement the message:

Slide Content:
${slideContent}

${theme ? `Theme: ${theme}` : ""}

Return ONLY a JSON array of image search queries (detailed, 10+ words each):
["query 1", "query 2", "query 3"]`;

      const result = await OllamaService.generateWithFallback(prompt, {
        temperature: 0.6,
        maxTokens: 300,
      });

      const queries = JSON.parse(result.response) as string[];
      return queries;
    } catch (error) {
      logger.error("Suggest images error", error as Error);
      return [];
    }
  }

  /**
   * Check content for potential issues (bias, sensitivity, etc.)
   */
  static async checkContentQuality(
    content: string
  ): Promise<{
    issues: Array<{ type: string; description: string; severity: "low" | "medium" | "high" }>;
    recommendations: string[];
  }> {
    try {
      const prompt = `Review this presentation content for potential issues:

${content}

Check for:
- Bias or insensitive language
- Factual accuracy concerns
- Overly complex jargon
- Incomplete or unclear statements
- Accessibility issues

Return JSON:
{
  "issues": [
    {"type": "issue type", "description": "description", "severity": "low|medium|high"}
  ],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;

      const result = await OllamaService.generateWithFallback(prompt, {
        temperature: 0.2,
        maxTokens: 1000,
      });

      const jsonText = result.response.match(/```json\n([\s\S]*?)\n```/)?.[1] || result.response;
      const quality = JSON.parse(jsonText);

      return quality;
    } catch (error) {
      logger.error("Check content quality error", error as Error);
      return {
        issues: [],
        recommendations: ["Unable to perform quality check at this time"],
      };
    }
  }

  /**
   * Generate presentation summary/abstract
   */
  static async generateSummary(
    title: string,
    slides: Array<{ content: string }>
  ): Promise<string> {
    try {
      const content = slides
        .map((slide, idx) => `Slide ${idx + 1}: ${slide.content}`)
        .join("\n\n");

      const prompt = `Create a concise professional summary (150-200 words) for this presentation:

Title: ${title}

Content:
${content.substring(0, 3000)}${content.length > 3000 ? "..." : ""}

Summary should highlight:
- Main topics covered
- Key takeaways
- Target audience
- Value proposition`;

      const result = await OllamaService.generateWithFallback(prompt, {
        temperature: 0.5,
        maxTokens: 300,
      });

      return result.response;
    } catch (error) {
      logger.error("Generate summary error", error as Error);
      return `Summary of "${title}" presentation with ${slides.length} slides.`;
    }
  }
}
