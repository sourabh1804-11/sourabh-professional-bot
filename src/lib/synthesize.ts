/**
 * ============================================================================
 * LAYER 5: SYNTHESIS & COMPRESSION (The Optimizer) — Tier 3 (Post-Processing)
 * ============================================================================
 *
 * 📚 EDUCATIONAL CONTEXT:
 * This layer solves the "Lost in the Middle" phenomenon.
 *
 * Research (Liu et al., 2023) showed that LLMs exhibit a U-shaped attention
 * curve: they pay the MOST attention to the beginning and end of a prompt,
 * and tend to IGNORE content in the middle. This means if your most important
 * RAG chunk lands in the middle of the context, the LLM might skip over it.
 *
 * This layer cleans, deduplicates, and strategically ORDERS the final
 * prompt payload to exploit this attention pattern:
 *
 *   Position 1 (Top — High Attention):    System Instructions + PII Rules
 *   Position 2 (Upper-Middle):            Conversation history
 *   Position 3 (Middle — Low Attention):  Lower-relevance chunks (ranked 3-5)
 *   Position 4 (Bottom — Highest Attn):   Top 2 chunks + user's question
 *
 * ADDITIONAL TECHNIQUES:
 * - Similarity Gate: Skip context if nothing relevant was found
 * - Jaccard Deduplication: Remove near-duplicate chunks
 * - Source Attribution: Tag chunks so the LLM can cite sources
 * ============================================================================
 */

import type { RetrievedChunk } from "./rag";

// ── Types ─────────────────────────────────────────────────────────────────

export type SynthesizedContext = {
  contextBlock: string;    // Formatted context string ready for the prompt
  chunksUsed: number[];    // IDs of chunks that made the final cut
  isEmpty: boolean;        // True if no relevant chunks were found
};

// ── Jaccard Similarity ────────────────────────────────────────────────────

/**
 * Computes Jaccard similarity between two text strings.
 *
 * 📚 WHY JACCARD?
 * It's a set-based similarity metric: |A ∩ B| / |A ∪ B|
 * - Fast to compute (just word sets, no embeddings needed)
 * - Good enough for deduplication (we're not doing semantic comparison here)
 * - Score of 1.0 = identical word sets, 0.0 = no overlap
 */
function jaccardSimilarity(textA: string, textB: string): number {
  const setA = new Set(textA.toLowerCase().split(/\s+/));
  const setB = new Set(textB.toLowerCase().split(/\s+/));

  const intersection = new Set([...setA].filter((word) => setB.has(word)));
  const union = new Set([...setA, ...setB]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

// ── Deduplication ─────────────────────────────────────────────────────────

/**
 * Removes chunks with >85% content overlap.
 * Keeps the chunk with the higher similarity score.
 */
function deduplicateChunks(chunks: RetrievedChunk[]): RetrievedChunk[] {
  const deduplicated: RetrievedChunk[] = [];

  for (const chunk of chunks) {
    const isDuplicate = deduplicated.some(
      (existing) => jaccardSimilarity(existing.content, chunk.content) > 0.85
    );

    if (!isDuplicate) {
      deduplicated.push(chunk);
    }
  }

  return deduplicated;
}

// ── Source Attribution ─────────────────────────────────────────────────────

/**
 * Formats a chunk with its source label for the LLM to reference.
 */
function formatChunkWithSource(chunk: RetrievedChunk, index: number): string {
  const sourceLabel = chunk.category.charAt(0).toUpperCase() + chunk.category.slice(1);
  return `[Source: ${sourceLabel}${chunk.source ? ` — ${chunk.source}` : ""}] (Relevance: ${(chunk.similarity * 100).toFixed(0)}%)\n${chunk.content}`;
}

// ── Main Synthesis Function ───────────────────────────────────────────────

/**
 * Takes raw retrieved chunks and produces an optimized context payload
 * arranged according to the U-shaped attention pattern.
 */
export function synthesizeContext(chunks: RetrievedChunk[]): SynthesizedContext {
  // Step 1: Similarity Gate
  // If no chunks were retrieved (all below threshold), skip context entirely
  if (chunks.length === 0) {
    return {
      contextBlock: "",
      chunksUsed: [],
      isEmpty: true,
    };
  }

  // Step 2: Deduplicate (remove >85% overlapping chunks)
  const unique = deduplicateChunks(chunks);

  // Step 3: Trim to top 5 by similarity score
  const topChunks = unique
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  // Step 4: Strategic Layout (exploiting U-shaped attention)
  // Lower-relevance chunks go in the middle (positions 3-5)
  // Highest-relevance chunks go at the bottom (positions 1-2)
  const middleChunks = topChunks.slice(2); // ranks 3-5 (low attention zone)
  const topTwoChunks = topChunks.slice(0, 2); // ranks 1-2 (high attention zone)

  const formattedMiddle = middleChunks
    .map((chunk, i) => formatChunkWithSource(chunk, i + 3))
    .join("\n\n---\n\n");

  const formattedTop = topTwoChunks
    .map((chunk, i) => formatChunkWithSource(chunk, i + 1))
    .join("\n\n---\n\n");

  // Assemble: middle chunks first (low attention), then top chunks (high attention at bottom)
  const sections = [formattedMiddle, formattedTop].filter(Boolean);

  const contextBlock = `=== RETRIEVED CONTEXT ABOUT SOURABH ===\nThe following information is retrieved from Sourabh's verified knowledge base. Use it to answer the user's question.\n\n${sections.join("\n\n---\n\n")}\n\n=== END OF CONTEXT ===`;

  return {
    contextBlock,
    chunksUsed: topChunks.map((c) => c.id),
    isEmpty: false,
  };
}
