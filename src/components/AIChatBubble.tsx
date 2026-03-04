import { useState, useRef, useEffect } from "react";
import { X, Loader2, Bot, Sparkles, BrainCircuit, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

interface AIChatBubbleProps {
  fullPage?: boolean;
}

export default function AIChatBubble({ fullPage = false }: AIChatBubbleProps) {
  const [open, setOpen] = useState(fullPage);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const askGeminiAI = async (userQuery: string, history: Msg[]) => {
    try {
      // 1. Database se current context lena (Taaki AI ko pata chale business kaisa chal raha hai)
      const { data: inv } = await supabase.from("invoices").select("amount");
      const { data: exp } = await supabase.from("expenses").select("amount");

      const totalInvoices = inv?.length || 0;
      const totalExpenses = exp?.length || 0;
      
      const contextPrefix = `[System Context: User has ${totalInvoices} invoices and ${totalExpenses} expenses records]. User Query: `;

      // 2. Supabase Edge Function ko call karna
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          messages: [
            ...history, 
            { role: "user", content: contextPrefix + userQuery }
          ] 
        },
      });

      // Agar connection hi nahi ho paya toh error dikhao
      if (error) {
        console.error("Invoke Error:", error);
        return `Connection Error: ${error.message}. Check if Edge Function is active.`;
      }

      // Backend se jo bhi content aaye (chahe wo error hi kyu na ho) use return karein
      return data.content || "Server se khali response mila (Empty Response).";
      
    } catch (err: any) {
      console.error("AI Error:", err);
      return "Critical Error: " + err.message;
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newHistory: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const aiResponse = await askGeminiAI(text, messages);
      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);
    } catch (err) {
      toast.error("AI system crashed. Please check logs.");
    } finally {
      setLoading(false);
    }
  };

  const chatContent = (
    <div className={`flex flex-col ${fullPage ? "h-full" : "h-[500px] w-[340px]"} bg-card rounded-2xl border shadow-2xl overflow-hidden`}>
      {/* Header */}
      <div className="bg-slate-900 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <BrainCircuit className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white tracking-tight">Automnus AI <span className="text-[10px] text-blue-400 ml-1">v2.0</span></p>
            <p className="text-[9px] text-slate-400 font-medium">Powered by Gemini & Supabase</p>
          </div>
        </div>
        {!fullPage && <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>}
      </div>

      {/* Message Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <Sparkles className="h-6 w-6 text-blue-600 mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-800">Business Intelligence Active</p>
            <p className="text-[10px] text-slate-500 mt-1 px-6">Poochiye: "Mera profit kitna hai?" ya "Hello"</p>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
              m.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
            }`}>
              {m.content.split('\n').map((line, idx) => <p key={idx} className="mb-1">{line}</p>)}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-2 items-center text-blue-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Gemini Thinking...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t bg-white">
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 focus-within:border-blue-500 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask your AI assistant..."
            className="flex-1 bg-transparent px-2 text-xs outline-none text-slate-800"
          />
          <button onClick={send} disabled={!input.trim() || loading} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all">
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="fixed bottom-20 right-4 z-50">
            {chatContent}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-4 z-50 w-12 h-12 rounded-2xl bg-slate-900 shadow-2xl flex items-center justify-center text-white border-2 border-slate-800"
      >
        {open ? <X size={20} /> : <Bot size={20} />}
      </motion.button>
    </>
  );
}