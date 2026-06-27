"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

import { useEffect, useRef, useState } from "react";
import { Send, User, Sparkles, AlertCircle, RefreshCcw, ExternalLink, Bot, Mic, MicOff, Volume2, Square } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
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

const getMessageText = (m: any) => {
  if (m.content) return m.content;
  if (m.parts) {
    return m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('');
  }
  return '';
};

const extractFollowUps = (text: string) => {
  const marker = "💡 **Suggested Follow-ups:**";
  const index = text.indexOf(marker);
  if (index !== -1) {
    const mainText = text.substring(0, index).trim();
    const followUpText = text.substring(index + marker.length).trim();
    const questions = followUpText.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('*') || line.startsWith('-'))
      .map(line => line.substring(1).trim());
    return { mainText, questions };
  }
  return { mainText: text, questions: [] };
};

const CustomCursor = () => {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  const springConfig = { damping: 30, stiffness: 200, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Only enable custom cursor on non-touch devices
    if (window.matchMedia("(pointer: fine)").matches) {
      setIsDesktop(true);
    }
    
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [cursorX, cursorY]);

  if (!isDesktop) return null;

  return (
    <>
      {/* Trailing Glowing Aura */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[9998] h-[400px] w-[400px] -ml-[200px] -mt-[200px] rounded-full mix-blend-screen opacity-60"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(99,102,241,0.05) 30%, transparent 70%)",
          x: cursorXSpring,
          y: cursorYSpring,
        }}
      />
      {/* Crisp Center Dot */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[9999] h-2 w-2 -ml-1 -mt-1 rounded-full bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.8)]"
        style={{
          x: cursorX,
          y: cursorY,
        }}
      />
    </>
  );
};

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let particles: any[] = [];
    let animationFrameId: number;

    const init = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      
      particles = [];
      const numParticles = Math.floor((width * height) / 5000); // Responsive density
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          angle: Math.random() * Math.PI * 2,
          radius: Math.random() * Math.max(width, height) * 1.2,
          speed: (Math.random() * 0.0008) + 0.0002, // Slow rotation
          size: Math.random() * 1.5 + 0.5, // Thickness
          dashLength: Math.random() * 5 + 3 // Length of the dash
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      const centerX = width * 0.4; // Slightly offset center
      const centerY = height * 0.5;

      particles.forEach(p => {
        p.angle += p.speed;
        
        const x = centerX + Math.cos(p.angle) * p.radius;
        const y = centerY + Math.sin(p.angle) * p.radius;
        
        if (x < -20 || x > width + 20 || y < -20 || y > height + 20) return;

        const ratio = Math.max(0, Math.min(1, x / width));
        
        // Color gradient from left (blue) to right (orange/red)
        let r, g, b;
        if (ratio < 0.5) {
          const t = ratio * 2;
          r = Math.floor(59 + t * (139 - 59));
          g = Math.floor(130 - t * (130 - 92));
          b = Math.floor(246);
        } else {
          const t = (ratio - 0.5) * 2;
          r = Math.floor(139 + t * (239 - 139));
          g = Math.floor(92 - t * (92 - 68));
          b = Math.floor(246 - t * (246 - 68));
        }
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle + Math.PI / 2); // Align tangentially
        
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-p.dashLength/2, -p.size/2, p.dashLength, p.size, p.size/2);
        } else {
          ctx.rect(-p.dashLength/2, -p.size/2, p.dashLength, p.size);
        }
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    init();
    draw();

    window.addEventListener('resize', init);
    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-70 mix-blend-screen" />;
};

// ── Main Page ─────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [userId, setUserId] = useState<string>("");
  const [chatId, setChatId] = useState<string>("");
  const [chats, setChats] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { messages, status, sendMessage, error, setMessages } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    
    onFinish: () => {
      // Refresh chat list to update titles if this was the first message
      if (messages.length === 0) {
        fetchChats(userId);
      }
    }
  });

  const [input, setInput] = useState("");
  const isLoading = status === 'submitted' || status === 'streaming';

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [quotaError, setQuotaError] = useState<any>(null);

  // --- Browser Back Button Support (Multilayered UX) ---
  const hasPushedState = useRef(false);

  useEffect(() => {
    if (messages.length > 0 && !hasPushedState.current) {
      window.history.pushState({ chatOpen: true }, "");
      hasPushedState.current = true;
    }
  }, [messages.length]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (!e.state?.chatOpen && hasPushedState.current) {
        hasPushedState.current = false;
        setChatId(crypto.randomUUID());
        setMessages([]);
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  // -----------------------------------------------------

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isFocused, setIsFocused] = useState(false);

  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const toggleSpeak = (id: string, text: string) => {
    const synth = window.speechSynthesis;
    if (speakingMessageId === id) {
      synth.cancel();
      setSpeakingMessageId(null);
    } else {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Make voice softer and more polite
      utterance.pitch = 1.1; // Slightly higher pitch often sounds gentler
      utterance.rate = 0.9;  // Slightly slower pace sounds more thoughtful and polite
      
      const voices = synth.getVoices();
      // Prefer female/softer voices if available, falling back to local English
      const preferredVoice = voices.find(v => 
        v.name.includes('Female') || 
        v.name.includes('Zira') || 
        v.name.includes('Samantha') || 
        v.name.includes('Google UK English Female') ||
        (v.lang.includes('en-IN') && v.name.includes('Female'))
      ) || voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en-GB') || v.lang.includes('en-US'));
      
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);
      synth.speak(utterance);
      setSpeakingMessageId(id);
    }
  };

  const toggleListening = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Add Grammar List to bias recognition towards domain-specific terms
    const SpeechGrammarList = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
    if (SpeechGrammarList) {
      const speechRecognitionList = new SpeechGrammarList();
      const keywords = [
        'Sourabh', 'Singhal', 'Genpact', 'Medallion', 'Architecture', 'Data Engineer', 
        'AWS', 'GCP', 'Azure', 'Databricks', 'Snowflake', 'BigQuery', 'Spark', 'PySpark', 
        'resume', 'experience', 'portfolio', 'projects', 'skills', 'education', 'Python', 'SQL'
      ];
      const grammar = '#JSGF V1.0; grammar keywords; public <keyword> = ' + keywords.join(' | ') + ' ;';
      speechRecognitionList.addFromString(grammar, 1);
      recognition.grammars = speechRecognitionList;
    }

    // Using en-IN to better recognize Indian English accents (given the project/timezone)
    recognition.lang = 'en-IN'; 
    // Setting interimResults to false forces the browser to wait for a high-confidence, fully processed sentence.
    recognition.interimResults = false; 
    recognition.continuous = false; 
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition", e);
      setIsListening(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Handle errors
  useEffect(() => {
    if (error) {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.type === "rate_limited" || parsed.type === "quota_exceeded") {
          setQuotaError(parsed);
        }
      } catch (e) {
        console.error("Chat error:", error);
      }
    } else {
      setQuotaError(null);
    }
  }, [error]);

  // Initialize Anonymous User ID & fetch history
  useEffect(() => {
    let storedId = localStorage.getItem("ask_sourabh_uid");
    if (!storedId) {
      storedId = crypto.randomUUID();
      localStorage.setItem("ask_sourabh_uid", storedId);
    }
    setUserId(storedId);
    setChatId(crypto.randomUUID());
    fetchChats(storedId);
  }, []);

  const fetchChats = async (uid: string) => {
    try {
      const res = await fetch(`/api/history?userId=${uid}`);
      const data = await res.json();
      if (data.chats) {
        setChats(data.chats);
      }
    } catch (e) {
      console.error("Failed to fetch chats", e);
    }
  };

  const loadChat = async (id: string) => {
    setChatId(id);
    setIsSidebarOpen(false); // close sidebar on mobile
    try {
      const res = await fetch(`/api/history/${id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.error("Failed to load messages", e);
    }
  };

  const startNewChat = () => {
    if (hasPushedState.current) {
      // If we are currently in a chat layer, use the browser back button to trigger the popstate 
      // event, which safely resets the state without endlessly stacking browser history.
      window.history.back();
    } else {
      setChatId(crypto.randomUUID());
      setMessages([]);
      setIsSidebarOpen(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input || !input.trim() || isLoading) return;
    setQuotaError(null);
    sendMessage({ text: input }, { body: { userId, chatId } });
    setInput("");
  };

  const lastAiMessage = [...messages].reverse().find(m => m.role !== 'user');
  const isSpeakingLastMessage = lastAiMessage && speakingMessageId === lastAiMessage.id;

  return (
    <div
      className="h-screen w-full text-gray-200 font-sans selection:bg-[#8b5cf6]/30 flex overflow-hidden relative cursor-none"
      style={{
        backgroundColor: '#050308',
      }}
    >
      {messages.length === 0 && <ParticleBackground />}
      <CustomCursor />

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-50 bg-[#0a0710]/95 backdrop-blur-xl border-r border-white/[0.05] flex flex-col overflow-hidden transition-all duration-300 ease-in-out shrink-0 ${isSidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full md:w-0 md:translate-x-0 md:border-r-0 md:opacity-0"
          }`}
      >
        <div className="p-4 border-b border-white/[0.05]">
          <Button
            onClick={startNewChat}
            className="w-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] hover:border-[#8b5cf6]/30 text-gray-200 justify-start gap-2 shadow-none"
          >
            <Sparkles size={16} className="text-[#8b5cf6]" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1 p-3">
          <div className="space-y-1">
            {chats.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No recent chats</p>
            ) : (
              chats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => loadChat(c.id)}
                  className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors truncate ${chatId === c.id
                      ? "bg-[#6366f1]/20 text-white border border-[#6366f1]/30"
                      : "text-gray-400 hover:bg-white/[0.03] hover:text-gray-200 border border-transparent"
                    }`}
                >
                  {c.title}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">

        {/* Header */}
        <header className="px-4 md:px-6 py-4 flex items-center shrink-0 absolute top-0 w-full z-10 border-b border-white/[0.02] bg-[#050308]/50 backdrop-blur-sm">
          <button
            className="mr-4 text-gray-300 hover:text-white transition-colors flex items-center justify-center p-1 rounded-md hover:bg-white/[0.05]"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg tracking-tight text-white flex items-center gap-2">
              <Sparkles size={18} className="text-[#8b5cf6]" />
              AskSourabh
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        {messages.length === 0 ? (
          // --- EMPTY STATE (Centered) ---
          <div className="flex-1 flex flex-col items-center justify-center px-4 w-full h-full relative z-0 mt-12 md:mt-0">
            <div className="w-full max-w-3xl space-y-10">
              {/* Greeting */}
              <div className="space-y-4 text-center md:text-left">
                <h2 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] bg-clip-text text-transparent">
                  Curiosity Driven!
                </h2>
                <div className="flex flex-col gap-1 text-center md:text-left">
                  <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white drop-shadow-sm">
                    What would you like to know?
                  </h1>
                  <p className="text-xs md:text-sm text-gray-200 uppercase tracking-widest font-medium mt-1">
                    about Sourabh's Professional life
                  </p>
                </div>
              </div>

              {/* Centered Input Box */}
              <div className="relative w-full z-10">
                {/* Spotlight Glow */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] max-w-[800px] h-[250px] rounded-full blur-[100px] pointer-events-none -z-10 transition-all duration-700 ${isFocused ? 'bg-[#6366f1]/25 scale-110' : 'bg-[#6366f1]/10 scale-100'}`} />
                
                <form onSubmit={onSubmit} className="relative flex items-center bg-white/[0.03] backdrop-blur-md rounded-[24px] border border-white/[0.08] shadow-[0_0_30px_rgba(99,102,241,0.05)] focus-within:border-[#6366f1]/40 focus-within:shadow-[0_0_40px_rgba(99,102,241,0.15)] transition-all duration-500">
                  <Input
                    value={input}
                    onChange={handleInputChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Ask about Sourabh's experience or projects..."
                    className="flex-1 bg-transparent border-0 text-white placeholder:text-gray-400 h-[60px] pl-6 pr-[96px] focus-visible:ring-0 text-[16px] rounded-[24px]"
                    disabled={isLoading || quotaError}
                  />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <Button
                    type="button"
                    onClick={() => lastAiMessage && toggleSpeak(lastAiMessage.id, getMessageText(lastAiMessage))}
                    disabled={!lastAiMessage || isLoading || quotaError}
                    className={`h-10 w-10 rounded-full transition-all shadow-none ${isSpeakingLastMessage ? 'bg-[#8b5cf6]/20 text-[#8b5cf6] hover:bg-[#8b5cf6]/30 animate-pulse' : 'bg-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]'}`}
                    size="icon"
                    title="Read Last Message"
                  >
                    {isSpeakingLastMessage ? <Square className="w-4 h-4" fill="currentColor" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <Button
                    type="button"
                    onClick={toggleListening}
                    disabled={isLoading || quotaError}
                    className={`h-10 w-10 rounded-full transition-all shadow-none ${isListening ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse' : 'bg-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]'}`}
                    size="icon"
                    title="Voice Input"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !input || !input.trim() || quotaError}
                    className="h-10 w-10 rounded-full bg-[#6366f1] hover:bg-[#4f46e5] text-white transition-all disabled:opacity-30 disabled:bg-white/[0.05] disabled:text-gray-500 shadow-[0_0_15px_rgba(99,102,241,0.4)] disabled:shadow-none"
                    size="icon"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </Button>
                </div>
              </form>
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full pt-4">
                {[
                  "What are Sourabh's core skills?",
                  "Tell me about his Genpact experience.",
                  "Explain his Medallion Architecture.",
                  "What projects has he built?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      if (isLoading) return;
                      sendMessage({ text: q }, { body: { userId, chatId } });
                    }}
                    className="text-left bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-[#8b5cf6]/30 text-gray-300 p-4 rounded-2xl transition-all duration-300 text-sm hover:shadow-[0_0_20px_rgba(139,92,246,0.1)] relative overflow-hidden group"
                  >
                    <div className="absolute left-0 top-0 w-1 h-full bg-[#8b5cf6]/0 group-hover:bg-[#8b5cf6]/40 transition-all duration-500"></div>
                    {q}
                  </button>
                ))}
              </div>

              {error && !quotaError && (<div className="max-w-md mx-auto p-4 bg-red-900/50 text-red-200 border border-red-500/50 rounded-xl mt-4">Error: {error.message}</div>)} {quotaError && (
                <div className="pt-4">
                  <QuotaExceeded message={quotaError.message} links={quotaError.links} />
                </div>
              )}
            </div>
          </div>
        ) : (
          // --- CHAT STATE (Messages + Bottom Input) ---
          <div className="flex-1 overflow-hidden flex flex-col pt-16 relative z-0">

            <ScrollArea className="flex-1 w-full min-h-0">
              <div className="max-w-4xl mx-auto w-full px-4 pt-4 md:pt-8 pb-8 space-y-8">
                <AnimatePresence initial={false}>
                  {messages.map((m: any) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-4 max-w-[85%] md:max-w-[75%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                        {/* Avatar for AI */}
                        {m.role !== "user" && (
                          <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center shrink-0 mt-1 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                            <Sparkles size={14} className="text-[#8b5cf6]" />
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div
                          className={`text-[15px] leading-relaxed ${m.role === "user"
                              ? "bg-[#6366f1]/20 border border-[#6366f1]/30 text-gray-100 px-5 py-3 rounded-3xl rounded-tr-md font-medium shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                              : "text-gray-300 py-1"
                            }`}
                        >
                          {m.role === "user" ? (
                            <p className="whitespace-pre-wrap">{getMessageText(m)}</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-white/[0.03] prose-pre:border prose-pre:border-white/[0.08] max-w-none prose-headings:text-white prose-p:text-gray-100 prose-strong:text-white prose-a:text-[#8b5cf6] prose-a:no-underline hover:prose-a:underline text-gray-100">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {extractFollowUps(getMessageText(m)).mainText}
                                </ReactMarkdown>
                              </div>
                              
                              {extractFollowUps(getMessageText(m)).questions.length > 0 && (
                                <div className="mt-2 flex flex-col gap-2">
                                  <span className="text-xs font-semibold uppercase tracking-wider text-[#a78bfa] flex items-center gap-1.5">
                                    <Sparkles size={12} /> Suggested Follow-ups
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {extractFollowUps(getMessageText(m)).questions.map((q, i) => (
                                      <button
                                        key={i}
                                        onClick={() => {
                                          if (!isLoading) {
                                            setQuotaError(null);
                                            sendMessage({ text: q }, { body: { userId, chatId } });
                                          }
                                        }}
                                        disabled={isLoading || quotaError !== null}
                                        className="text-left text-sm bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 border border-[#8b5cf6]/20 text-gray-200 hover:text-white px-3 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {q}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="flex gap-4 max-w-[85%] flex-row">
                      <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center shrink-0 mt-1 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                        <Sparkles size={14} className="text-[#8b5cf6] animate-pulse" />
                      </div>
                      <div className="py-2">
                        <div className="flex space-x-1.5 items-center">
                          <motion.div className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
                          <motion.div className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                          <motion.div className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {error && !quotaError && (<div className="max-w-md mx-auto p-4 bg-red-900/50 text-red-200 border border-red-500/50 rounded-xl mt-4">Error: {error.message}</div>)} {quotaError && (
                  <div className="max-w-md mx-auto">
                    <QuotaExceeded message={quotaError.message} links={quotaError.links} />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Bottom Input Area for Chat State */}
            <div className="w-full shrink-0 pt-4 pb-6 md:pb-8 px-4 border-t border-white/[0.05] bg-[#050308]/80 backdrop-blur-xl relative">
              {/* Bottom Spotlight Glow */}
              <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[900px] h-[200px] rounded-t-full blur-[100px] pointer-events-none -z-10 transition-all duration-700 ${isFocused ? 'bg-[#6366f1]/20' : 'bg-[#6366f1]/5'}`} />
              
              <div className="max-w-4xl mx-auto relative z-10 px-0 md:px-4">
                <form onSubmit={onSubmit} className="relative flex items-center bg-white/[0.03] rounded-[24px] border border-white/[0.08] shadow-[0_0_20px_rgba(0,0,0,0.5)] focus-within:border-[#6366f1]/40 focus-within:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all duration-500">
                  <Input
                    value={input}
                    onChange={handleInputChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Ask AskSourabh..."
                    className="flex-1 bg-transparent border-0 text-white placeholder:text-gray-400 h-[60px] pl-6 pr-[96px] focus-visible:ring-0 text-[15px] rounded-[24px]"
                    disabled={isLoading || quotaError}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <Button
                      type="button"
                      onClick={() => lastAiMessage && toggleSpeak(lastAiMessage.id, getMessageText(lastAiMessage))}
                      disabled={!lastAiMessage || isLoading || quotaError}
                      className={`h-10 w-10 rounded-full transition-all shadow-none ${isSpeakingLastMessage ? 'bg-[#8b5cf6]/20 text-[#8b5cf6] hover:bg-[#8b5cf6]/30 animate-pulse' : 'bg-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]'}`}
                      size="icon"
                      title="Read Last Message"
                    >
                      {isSpeakingLastMessage ? <Square className="w-4 h-4" fill="currentColor" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                    <Button
                      type="button"
                      onClick={toggleListening}
                      disabled={isLoading || quotaError}
                      className={`h-10 w-10 rounded-full transition-all shadow-none ${isListening ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse' : 'bg-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]'}`}
                      size="icon"
                      title="Voice Input"
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading || !input || !input.trim() || quotaError}
                      className="h-10 w-10 rounded-full bg-[#6366f1] hover:bg-[#4f46e5] text-white transition-all disabled:opacity-30 disabled:bg-white/[0.05] disabled:text-gray-500 shadow-[0_0_15px_rgba(99,102,241,0.4)] disabled:shadow-none"
                      size="icon"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </Button>
                  </div>
                </form>
                <div className="text-center mt-3">
                  <p className="text-[11px] text-gray-500">
                    AI can make mistakes. Consider verifying important information.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
