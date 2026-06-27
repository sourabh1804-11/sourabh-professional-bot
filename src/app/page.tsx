"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { Send, User, Sparkles, AlertCircle, RefreshCcw, ExternalLink, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PUBLIC_LINKS } from "@/lib/system-prompt";

// ── Components ────────────────────────────────────────────────────────────

const TypingIndicator = () => (
  <div className="flex space-x-1.5 items-center p-4 bg-slate-800/50 rounded-2xl rounded-tl-none w-fit border border-slate-700/50 shadow-sm">
    <motion.div
      className="w-2 h-2 bg-blue-400 rounded-full"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
    />
    <motion.div
      className="w-2 h-2 bg-blue-400 rounded-full"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
    />
    <motion.div
      className="w-2 h-2 bg-blue-400 rounded-full"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
    />
  </div>
);

const QuotaExceeded = ({ message, links }: { message: string; links: any }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-slate-800/80 border border-amber-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(245,158,11,0.1)] text-center space-y-4 max-w-md mx-auto my-6"
  >
    <div className="flex justify-center">
      <div className="bg-amber-500/20 p-3 rounded-full text-amber-400">
        <AlertCircle size={28} />
      </div>
    </div>
    <h3 className="text-xl font-bold text-slate-100">Limit Reached</h3>
    <p className="text-slate-300 text-sm leading-relaxed">{message}</p>
    
    <div className="grid grid-cols-2 gap-3 pt-2">
      {Object.entries(links || PUBLIC_LINKS).map(([key, url]) => (
        <a 
          key={key} 
          href={url as string} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 transition-colors py-2 px-4 rounded-lg text-sm font-medium text-slate-200"
        >
          {key.charAt(0).toUpperCase() + key.slice(1)}
          <ExternalLink size={14} />
        </a>
      ))}
    </div>
  </motion.div>
);

// ── Main Page ─────────────────────────────────────────────────────────────

export default function ChatPage() {
  // @ts-ignore
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages } = useChat() as any;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [quotaError, setQuotaError] = useState<any>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Handle errors (like rate limiting)
  useEffect(() => {
    if (error) {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.type === "rate_limited" || parsed.type === "quota_exceeded") {
          setQuotaError(parsed);
        }
      } catch (e) {
        // Fallback for non-JSON errors
        console.error("Chat error:", error);
      }
    } else {
      setQuotaError(null);
    }
  }, [error]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    setQuotaError(null);
    handleSubmit(e);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 flex flex-col items-center p-4 sm:p-6 md:p-8">
      
      {/* Background ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none -z-10" />
      
      <main className="w-full max-w-4xl h-[calc(100vh-4rem)] flex flex-col bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        
        {/* Header */}
        <header className="px-6 py-5 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur opacity-40 animate-pulse" />
              <Avatar className="h-12 w-12 border-2 border-slate-700 bg-slate-800 relative z-10 shadow-lg">
                <AvatarFallback className="bg-slate-800 text-blue-400 font-bold tracking-wider">
                  SS
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
                AskSourabh <Sparkles className="w-4 h-4 text-blue-400" />
              </h1>
              <p className="text-sm text-slate-400 font-medium tracking-wide">
                AI Knowledge Base & Assistant
              </p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setMessages([])} 
            className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"
            title="Reset Conversation"
          >
            <RefreshCcw className="w-5 h-5" />
          </Button>
        </header>

        {/* Chat Area */}
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 mt-20">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center shadow-inner border border-slate-700/50">
                <Bot className="w-10 h-10 text-blue-400" />
              </div>
              <div className="space-y-2 max-w-md">
                <h2 className="text-2xl font-bold text-slate-200">Hello there.</h2>
                <p className="text-slate-400 leading-relaxed">
                  I'm an AI assistant trained exclusively on Sourabh's resume, portfolio, and blogs. Ask me anything about his professional journey!
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg mt-4">
                {[
                  "What are Sourabh's core skills?",
                  "Tell me about his work at Genpact.",
                  "What projects has he built?",
                  "Explain his 'Medallion Architecture' project.",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleInputChange({ target: { value: q } } as any)}
                    className="text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-2 rounded-full transition-all hover:scale-105 active:scale-95 hover:border-blue-500/50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4 flex flex-col">
              <AnimatePresence initial={false}>
                {messages.map((m: any) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      
                      {/* Avatar */}
                      <Avatar className="h-8 w-8 shrink-0 border border-slate-700 mt-1 shadow-sm">
                        {m.role === "user" ? (
                          <AvatarFallback className="bg-slate-700 text-slate-300">
                            <User className="w-4 h-4" />
                          </AvatarFallback>
                        ) : (
                          <AvatarFallback className="bg-blue-600 text-white">
                            <Bot className="w-4 h-4" />
                          </AvatarFallback>
                        )}
                      </Avatar>

                      {/* Message Bubble */}
                      <div
                        className={`px-5 py-4 rounded-2xl shadow-sm text-[15px] leading-relaxed ${
                          m.role === "user"
                            ? "bg-blue-600 text-white rounded-tr-sm"
                            : "bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-sm"
                        }`}
                      >
                        {m.role === "user" ? (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        ) : (
                          <div className="prose prose-invert prose-blue max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {m.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start pt-2"
                >
                  <div className="flex gap-4 max-w-[85%]">
                     <Avatar className="h-8 w-8 shrink-0 border border-slate-700 mt-1">
                        <AvatarFallback className="bg-blue-600 text-white">
                          <Bot className="w-4 h-4" />
                        </AvatarFallback>
                     </Avatar>
                     <TypingIndicator />
                  </div>
                </motion.div>
              )}

              {quotaError && (
                <QuotaExceeded message={quotaError.message} links={quotaError.links} />
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <footer className="p-4 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md">
          <form
            onSubmit={onSubmit}
            className="flex items-center gap-3 relative max-w-4xl mx-auto"
          >
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about Sourabh's experience, skills, or projects..."
              className="flex-1 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-full h-14 pl-6 pr-14 focus-visible:ring-1 focus-visible:ring-blue-500/50 text-[15px] shadow-inner"
              disabled={isLoading || quotaError}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim() || quotaError}
              className="absolute right-2 top-2 h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
              size="icon"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </form>
          <div className="text-center mt-3">
            <p className="text-xs text-slate-500 font-medium">
              Powered by Gemini & Supabase pgvector. Data is strictly limited to verified sources.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
