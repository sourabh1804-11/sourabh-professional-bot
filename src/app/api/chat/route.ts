import { NextResponse } from "next/server";
import { streamText } from "ai";
import { getVercelChatModel } from "@/lib/gemini";
import { runSecurityChecks } from "@/lib/security";
import { classifyIntent } from "@/lib/scope";
import { searchDocuments } from "@/lib/rag";
import { synthesizeContext } from "@/lib/synthesize";
import { logChatInteraction } from "@/lib/logger";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const startTime = Date.now();
  let userIp = req.headers.get("x-forwarded-for") || "unknown";

  try {
    const { messages } = await req.json();
    
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // Get the latest user query
    const latestMessage = messages[messages.length - 1];
    if (latestMessage.role !== "user") {
      return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
    }
    const query = latestMessage.content || 
      (latestMessage.parts 
        ? latestMessage.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') 
        : '');

    if (!query || query.trim() === '') {
      return NextResponse.json({ error: 'Message text is empty' }, { status: 400 });
    }

    // ── LAYER 2: Security & Guardrails ──────────────────────────────────────
    const securityResult = await runSecurityChecks(query, userIp);
    if (!securityResult.passed) {
      return NextResponse.json(securityResult.error, { status: securityResult.error.statusCode });
    }

    // ── LAYER 3: Scope Management ───────────────────────────────────────────
    const scopeResult = await classifyIntent(query);

    // ── LAYER 4: RAG Pipeline ───────────────────────────────────────────────
    // Multi-turn context: we focus the search primarily on the latest query.
    // If we wanted, we could also summarize the conversation, but for speed we use the latest query.
    const retrievedChunks = await searchDocuments(
      query,
      scopeResult.categories,
      8,    // match count
      0.3   // similarity threshold
    );

    // ── LAYER 5: Synthesis & Compression ────────────────────────────────────
    const synthesized = synthesizeContext(retrievedChunks);

    // Assemble the final system prompt with the U-shaped attention layout
    // We append the conversation history (handled by Vercel AI SDK 'messages' array)
    // The SDK automatically appends the user's latest query at the very end.
    const finalSystemPrompt = [
      SYSTEM_PROMPT,
      synthesized.contextBlock
    ].filter(Boolean).join("\n\n");

    // ── LAYER 6: LLM Generation & Logging (Streaming) ───────────────────────
    
    // We only want the last 5 messages to avoid context bloat
    const trimmedMessages = messages.slice(-5).map((m: any) => ({
      role: m.role,
      content: m.content || (m.parts ? m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') : '')
    }));

    const model = getVercelChatModel();
    const result = await streamText({
      model,
      system: finalSystemPrompt,
      messages: trimmedMessages,
      onFinish: async (completion) => {
        // Fire-and-forget logging
        const latencyMs = Date.now() - startTime;
        
        await logChatInteraction({
          sessionId: "session-" + userIp + "-" + startTime, // Basic session ID
          userIp: userIp,
          query: query,
          response: completion.text,
          chunksUsed: retrievedChunks.map(c => ({ id: c.id, similarity: c.similarity })),
          scopeCategory: scopeResult.categories,
          latencyMs,
          inputTokens: (completion.usage as any)?.promptTokens || 0,
          outputTokens: (completion.usage as any)?.completionTokens || 0,
          hitFallback: synthesized.isEmpty || completion.text.includes("I don't have that specific detail"),
        });
      },
    });

    return result.toUIMessageStreamResponse();

  } catch (error) {
    console.error("[Chat API] Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
