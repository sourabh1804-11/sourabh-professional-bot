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

import { google } from "@ai-sdk/google";

/**
 * Returns the chat model for conversational responses.
 */
export function getChatModel() {
  return getGeminiClient().getGenerativeModel({
    model: "gemini-2.0-flash",
  });
}

/**
 * Returns the Vercel AI SDK compatible model for streamText.
 */
export function getVercelChatModel() {
  return google("gemini-2.0-flash");
}

/**
 * Returns the embedding model for vector generation.
 */
export function getEmbeddingModel() {
  return getGeminiClient().getGenerativeModel({
    model: "text-embedding-004",
  });
}

/**
 * Returns the lightweight model for fast classification tasks (Layer 3).
 */
export function getClassificationModel() {
  return getGeminiClient().getGenerativeModel({
    model: "gemini-2.0-flash-lite",
  });
}
