/**
 * Gemini Client
 * Centralized configuration for the Google Generative AI SDK.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

let genAIInstance: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set.");
    }
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
}

import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Returns the Vercel AI SDK compatible model for streamText.
 */
export function getVercelChatModel() {
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  return google("gemini-2.5-flash");
}

/**
 * Returns the embedding model for vector generation.
 */
export function getEmbeddingModel() {
  return getGeminiClient().getGenerativeModel({
    model: "gemini-embedding-2",
  });
}

/**
 * Returns the lightweight model for fast classification tasks (Layer 3).
 */
export function getClassificationModel() {
  return getGeminiClient().getGenerativeModel({
    model: "gemini-2.5-flash-lite",
  });
}
