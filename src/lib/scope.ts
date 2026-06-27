/**
 * ============================================================================
 * LAYER 3: SCOPE MANAGEMENT (The Filter) — Tier 2
 * ============================================================================
 *
 * 📚 EDUCATIONAL CONTEXT:
 * Scope prevents "context bloat" by dynamically narrowing down the problem
 * domain. Instead of searching ALL your documents for every query, Scope
 * acts as a router that identifies what the user is actually asking about
 * and focuses the vector search on just those categories.
 *
 * Example:
 * - "What are Sourabh's skills?" → Search only 'resume' and 'portfolio'
 * - "Tell me about his blog posts" → Search only 'blog'
 * - "What projects has he built?" → Search 'portfolio' and 'github'
 *
 * MODERN APPROACH (2026):
 * We use Gemini itself as the intent classifier with structured output,
 * instead of brittle keyword matching. Keywords fail on paraphrasing —
 * "What does Sourabh do for a living?" has zero keyword overlap with
 * 'experience' or 'work', but Gemini instantly understands the intent.
 *
 * The cost is negligible — a ~50-token classification call is ~0.001¢.
 * ============================================================================
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Types ─────────────────────────────────────────────────────────────────

export type DocumentCategory = "resume" | "portfolio" | "blog" | "linkedin" | "github";

export type ScopeResult = {
  categories: DocumentCategory[] | null; // null = search all categories
  confidence: number;
};

// ── Valid Categories ──────────────────────────────────────────────────────

const VALID_CATEGORIES: DocumentCategory[] = [
  "resume",
  "portfolio",
  "blog",
  "linkedin",
  "github",
];

// ── Intent Classification Prompt ──────────────────────────────────────────

const CLASSIFICATION_PROMPT = `You are an intent classifier for a personal chatbot about a software engineer named Sourabh.

Given the user's question, determine which data categories are most relevant.

Available categories:
- "resume": Work history, job titles, dates, skills, education, certifications
- "portfolio": Projects, milestones, personal journey, achievements, curiosity items
- "blog": Technical articles, philosophical essays, writing, thought leadership
- "linkedin": Detailed job descriptions, professional recommendations, posts
- "github": Code repositories, open-source contributions, tech stack preferences

Respond with a JSON object containing:
- "categories": array of 1-3 most relevant category strings
- "confidence": a number between 0 and 1 indicating how confident you are

If the question is generic, greeting, or unrelated to any specific category, set confidence to 0.5 and categories to null.

IMPORTANT: Respond with ONLY the JSON object, no markdown or explanation.`;

// ── Main Scope Function ──────────────────────────────────────────────────

/**
 * Classifies user intent and returns category filters for the vector search.
 * Falls back to searching all categories if classification confidence is low.
 */
export async function classifyIntent(query: string): Promise<ScopeResult> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[Scope] Gemini API key not configured. Searching all categories.");
      return { categories: null, confidence: 0 };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite", // Lightweight model for fast classification
    });

    const result = await model.generateContent([
      CLASSIFICATION_PROMPT,
      `User question: "${query}"`,
    ]);

    const responseText = result.response.text().trim();

    // Parse the JSON response
    const parsed = JSON.parse(responseText);

    // Validate categories
    const validCategories = (parsed.categories as string[])?.filter((c) =>
      VALID_CATEGORIES.includes(c as DocumentCategory)
    ) as DocumentCategory[] | undefined;

    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;

    // If confidence is too low, search all categories
    if (confidence < 0.85 || !validCategories || validCategories.length === 0) {
      return { categories: null, confidence };
    }

    return { categories: validCategories, confidence };
  } catch (error) {
    console.error("[Scope] Intent classification failed:", error);
    // Graceful degradation: search all categories
    return { categories: null, confidence: 0 };
  }
}
