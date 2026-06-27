/**
 * ============================================================================
 * LAYER 4: RAG PIPELINE (The Knowledge) — Tier 2 (Data Feed)
 * ============================================================================
 *
 * 📚 EDUCATIONAL CONTEXT:
 * This is the heart of the RAG system. It transforms a user's natural
 * language question into a mathematical vector (embedding), then searches
 * a database of pre-computed vectors to find the most semantically similar
 * chunks of Sourabh's professional data.
 *
 * KEY CONCEPTS:
 *
 * 1. EMBEDDINGS: A way to convert text into a list of 768 numbers (a vector).
 *    These numbers capture the *meaning* of the text. Two sentences with
 *    similar meanings will produce vectors that are mathematically close.
 *
 * 2. COSINE SIMILARITY: The math that measures "closeness" between vectors.
 *    A score of 1.0 = identical meaning, 0.0 = completely unrelated.
 *    We use the <=> operator in PostgreSQL which computes cosine distance
 *    (1 - similarity), so lower distance = more similar.
 *
 * 3. SIMILARITY THRESHOLD: We set a minimum of 0.3. Without this, the DB
 *    always returns K results even if NONE are relevant (e.g., "What's the
 *    weather?"). The threshold ensures we only inject context that actually
 *    matches. If nothing passes, the system falls back gracefully.
 *
 * 4. HNSW INDEX: Hierarchical Navigable Small World — a graph-based index
 *    that's faster and more accurate than IVFFlat for datasets under 100K
 *    rows. No training step needed. Perfect for our ~500 chunks.
 * ============================================================================
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";
import type { DocumentCategory } from "./scope";

// ── Types ─────────────────────────────────────────────────────────────────

export type RetrievedChunk = {
  id: number;
  content: string;
  category: string;
  source: string | null;
  metadata: Record<string, unknown>;
  similarity: number;
};

// ── Embedding Generation ──────────────────────────────────────────────────

/**
 * Converts a text query into a 768-dimensional vector using Gemini's
 * text-embedding-004 model.
 *
 * 📚 WHY text-embedding-004?
 * - 768 dimensions (good balance of precision vs. storage)
 * - Strong multilingual understanding
 * - Same API key as the chat model — unified billing
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  const result = await model.embedContent(text);
  return result.embedding.values;
}

// ── Vector Search ─────────────────────────────────────────────────────────

/**
 * Performs semantic search against the Supabase pgvector database.
 *
 * 📚 HOW IT WORKS:
 * 1. Convert the user's question to a vector (embedding)
 * 2. Call the match_documents RPC function in Supabase
 * 3. PostgreSQL uses the HNSW index to find the nearest vectors
 * 4. Only chunks with similarity > 0.3 are returned
 * 5. Results are ordered by relevance (highest similarity first)
 */
export async function searchDocuments(
  query: string,
  categories: DocumentCategory[] | null = null,
  matchCount: number = 8,
  similarityThreshold: number = 0.3
): Promise<RetrievedChunk[]> {
  try {
    // Step 1: Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Step 2: Call Supabase RPC function
    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_count: matchCount,
      filter_categories: categories,
      similarity_threshold: similarityThreshold,
    });

    if (error) {
      console.error("[RAG] Supabase RPC error:", error);
      return [];
    }

    return (data as RetrievedChunk[]) || [];
  } catch (error) {
    console.error("[RAG] Search failed:", error);
    return [];
  }
}
