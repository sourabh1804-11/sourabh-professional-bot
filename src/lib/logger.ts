/**
 * ============================================================================
 * LAYER 6: EVALUATION & MONITORING (The Feedback Loop) — Tier 4 (Outer Loop)
 * ============================================================================
 *
 * 📚 EDUCATIONAL CONTEXT:
 * You cannot optimize what you do not measure. This layer tracks how well
 * the context engineering stack is performing in production.
 *
 * THE RAG TRIAD — the 3 metrics that matter:
 *
 * 1. CONTEXT RELEVANCE: Are Layers 3+4 fetching data related to the query?
 *    → We track similarity scores of retrieved chunks.
 *    → Flag entries where avg similarity < 0.4.
 *
 * 2. GROUNDEDNESS (Faithfulness): Is the model's output strictly derived
 *    from the injected context, or is it hallucinating?
 *    → Flag responses where hit_fallback=false but chunks_used is empty.
 *
 * 3. ANSWER RELEVANCE: Did the output satisfy the user's intent?
 *    → Track follow-up rate: if the user immediately rephrases their
 *      question, the first answer likely failed.
 *
 * All logs are stored in a Supabase `chat_logs` table for offline analysis.
 * ============================================================================
 */

import { supabase } from "./supabase";

// ── Types ─────────────────────────────────────────────────────────────────

export type ChatLogEntry = {
  sessionId: string;
  userIp: string;
  query: string;
  response: string;
  chunksUsed: { id: number; similarity: number }[];
  scopeCategory: string[] | null;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  hitFallback: boolean;
};

// ── Logger ────────────────────────────────────────────────────────────────

/**
 * Logs a chat interaction to the Supabase `chat_logs` table.
 * This runs asynchronously and does NOT block the response stream.
 *
 * 📚 WHY ASYNC, NON-BLOCKING?
 * The user should never wait for logging to complete before seeing their
 * response. We fire-and-forget the log insertion. If it fails, we log
 * to console but don't crash the request.
 */
export async function logChatInteraction(entry: ChatLogEntry): Promise<void> {
  try {
    const { error } = await supabase.from("chat_logs").insert({
      session_id: entry.sessionId,
      user_ip: entry.userIp,
      query: entry.query,
      response: entry.response,
      chunks_used: entry.chunksUsed,
      scope_category: entry.scopeCategory,
      latency_ms: entry.latencyMs,
      input_tokens: entry.inputTokens || null,
      output_tokens: entry.outputTokens || null,
      hit_fallback: entry.hitFallback,
    });

    if (error) {
      console.error("[Logger] Failed to log chat interaction:", error);
    }
  } catch (error) {
    // Non-blocking: log to console but don't throw
    console.error("[Logger] Logging error (non-blocking):", error);
  }
}
