import { modelPicker } from "@/lib/model-picker";
import { auth } from "@/server/auth";
import { PresentationInputSchema, rateLimiter, sanitizeForXML } from "@/lib/validation";
import { logger } from "@/lib/logger";
import { streamText } from "ai";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

interface OutlineRequest {
  prompt: string;
  numberOfCards: number;
  language: string;
  modelProvider?: string;
  modelId?: string;
}

const outlineTemplate = `Given the following presentation topic and requirements, generate a structured outline with {numberOfCards} main topics in markdown format.
The outline should be in {language} language and it very important.

Current Date: {currentDate}
Topic: {prompt}

First, generate an appropriate title for the presentation, then create exactly {numberOfCards} main topics that would make for an engaging and well-structured presentation.

Format the response starting with the title in XML tags, followed by markdown content with each topic as a heading and 2-3 bullet points.

Example format:
<TITLE>Your Generated Presentation Title Here</TITLE>

# First Main Topic
- Key point about this topic
- Another important aspect
- Brief conclusion or impact

# Second Main Topic
- Main insight for this section
- Supporting detail or example
- Practical application or takeaway

# Third Main Topic 
- Primary concept to understand
- Evidence or data point
- Conclusion or future direction

Make sure the topics:
1. Flow logically from one to another
2. Cover the key aspects of the main topic
3. Are clear and concise
4. Are engaging for the audience
5. ALWAYS use bullet points (not paragraphs) and format each point as "- point text"
6. Do not use bold, italic or underline
7. Keep each bullet point brief - just one sentence per point
8. Include exactly 2-3 bullet points per topic (not more, not less)`;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const allowed = rateLimiter.isAllowed(
      `outline:${session.user.id}`,
      5, // 5 requests
      60000, // per minute
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const body = (await req.json()) as OutlineRequest;

    // Validate input
    let validatedData;
    try {
      validatedData = PresentationInputSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: validationError.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 },
        );
      }
      throw validationError;
    }

    const {
      prompt,
      numberOfCards,
      language,
      modelProvider = "ollama",
      modelId,
    } = validatedData;

    // Sanitize prompt for XML usage
    const sanitizedPrompt = sanitizeForXML(prompt);
    const languageMap: Record<string, string> = {
      "en-US": "English (US)",
      pt: "Portuguese",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      ja: "Japanese",
      ko: "Korean",
      zh: "Chinese",
      ru: "Russian",
      hi: "Hindi",
      ar: "Arabic",
    };

    const actualLanguage = languageMap[language] ?? language; // Fallback to the original if not found
    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let model;
    try {
      // Use async model picker with health checks
      model = await modelPicker(modelProvider, modelId);
    } catch (modelError) {
      logger.error("Model initialization error", modelError as Error);
      return NextResponse.json(
        {
          error: "AI model unavailable",
          details: modelError instanceof Error ? modelError.message : "Unknown error",
          suggestion: "Please ensure Ollama is running and models are downloaded. Try running 'ollama serve' and 'ollama pull llama3.2'"
        },
        { status: 503 }, // Service Unavailable
      );
    }

    // Format the prompt with template variables
    const formattedPrompt = outlineTemplate
      .replace(/{numberOfCards}/g, numberOfCards.toString())
      .replace(/{language}/g, actualLanguage)
      .replace(/{currentDate}/g, currentDate)
      .replace(/{prompt}/g, sanitizedPrompt);

    const result = streamText({
      model,
      prompt: formattedPrompt,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    logger.error("Error in outline generation", error as Error);
    return NextResponse.json(
      {
        error: "Failed to generate outline",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 },
    );
  }
}
