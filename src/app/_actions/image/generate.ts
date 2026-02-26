"use server";

import { utapi } from "@/app/api/uploadthing/core";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { UTFile } from "uploadthing/server";

// Ollama image generation models (if using Stable Diffusion via Ollama)
export type ImageModelList =
  | "stable-diffusion"
  | "sdxl"
  | "dall-e-mini"
  | "unsplash-fallback";

async function generateImageWithOllama(
  prompt: string,
  model: string,
): Promise<Buffer> {
  const ollamaBaseURL = env.OLLAMA_BASE_URL || "http://localhost:11434";

  try {
    // Try to generate image using Ollama's image generation endpoint
    // Note: This requires Ollama to have image generation models installed
    const response = await fetch(`${ollamaBaseURL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        prompt: `Generate an image: ${prompt}`,
        stream: false,
        format: "json",
        options: {
          seed: Math.floor(Math.random() * 10000),
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Ollama image generation failed");
    }

    const data = await response.json();

    // If Ollama returns base64 image data
    if (data.images?.[0]) {
      const base64Image = data.images[0];
      return Buffer.from(base64Image, "base64");
    }

    throw new Error("No image data returned from Ollama");
  } catch (error) {
    logger.error("Ollama image generation error", error as Error, { prompt, model });
    throw error;
  }
}

async function generateImageWithUnsplash(prompt: string): Promise<Buffer> {
  // Fallback to Unsplash for stock images
  const searchQuery = encodeURIComponent(prompt);
  const unsplashURL = `https://api.unsplash.com/photos/random?query=${searchQuery}&orientation=landscape`;

  const response = await fetch(unsplashURL, {
    headers: {
      Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch image from Unsplash");
  }

  const data = await response.json();
  const imageUrl = data.urls?.regular;

  if (!imageUrl) {
    throw new Error("No image URL from Unsplash");
  }

  // Download the image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error("Failed to download image from Unsplash");
  }

  const imageBlob = await imageResponse.blob();
  const imageBuffer = await imageBlob.arrayBuffer();
  return Buffer.from(imageBuffer);
}

export async function generateImageAction(
  prompt: string,
  model: ImageModelList = "unsplash-fallback",
) {
  // Get the current session
  const session = await auth();

  // Check if user is authenticated
  if (!session?.user?.id) {
    throw new Error("You must be logged in to generate images");
  }

  try {
    let imageData: Buffer;

    // Try Ollama first for actual AI models, fallback to Unsplash
    if (model === "unsplash-fallback") {
      imageData = await generateImageWithUnsplash(prompt);
    } else {
      try {
        imageData = await generateImageWithOllama(prompt, model);
      } catch (_ollamaError) {
        // Silently fallback to Unsplash if Ollama fails
        imageData = await generateImageWithUnsplash(prompt);
      }
    }

    // Generate a filename based on the prompt
    const filename = `${prompt.substring(0, 20).replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.png`;

    // Create a UTFile from the image data (convert Buffer to Uint8Array for compatibility)
    const uint8Array = new Uint8Array(imageData);
    const blob = new Blob([uint8Array], { type: "image/png" });
    const file = new File([blob], filename, { type: "image/png" });
    const utFile = new UTFile([file], filename);

    // Upload to UploadThing
    const uploadResult = await utapi.uploadFiles([utFile]);

    if (!uploadResult[0]?.data?.ufsUrl) {
      logger.error("Upload error", new Error("Upload failed"), { error: uploadResult[0]?.error });
      throw new Error("Failed to upload image to UploadThing");
    }

    const permanentUrl = uploadResult[0].data.ufsUrl;

    // Store in database with the permanent URL
    const generatedImage = await db.generatedImage.create({
      data: {
        url: permanentUrl,
        prompt: prompt,
        userId: session.user.id,
      },
    });

    return {
      success: true,
      image: generatedImage,
    };
  } catch (error) {
    logger.error("Error generating image", error as Error, { prompt, model });
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}
