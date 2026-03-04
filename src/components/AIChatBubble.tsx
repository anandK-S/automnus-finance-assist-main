import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles, TrendingUp, Wallet, PieChart, ArrowUpRight, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

export default function AIChatBubble({ fullPage = false }: AIChatBubbleProps) {
  const [open, setOpen] = useState(fullPage);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // --- 1. GEMINI AI + DATABASE CONTEXT ENGINE ---
  const askGeminiAI = async (userQuery: string) => {
    // Database se context uthana
    const { data: inv } = await supabase.from("invoices").select("amount, status, client, date");
    const { data: exp } = await supabase.from("expenses").select("amount, category, vendor, date");
    
    // Summary banana Gemini ke liye
    const totalRev = inv?.reduce((s, i) => s + Number(i.amount), 0) || 0;
    const totalExp = exp?.reduce((s, e) => s + Number(e.amount), 0) || 0;
    const topExpense = exp?.sort((a, b) => b.amount - a.amount)[0];

    /* Note: Real Gemini integration ke liye aapko Supabase Edge Function call karna hoga.
       Yahan hum Gemini ke logic ko simulate kar rahe hain jo database sensitive hai.
    */
    
    const q = userQuery.toLowerCase();

    // Advanced Reasoning Logic (Gemini Style)
    if (q.includes("analysis") || q.includes("kaise hai") || q.includes("status")) {
      return `AI Analysis: Aapka revenue ₹${totalRev.toLocaleString()} hai aur kharche ₹${totalExp.toLocaleString()} hain. Aapka burn rate ${( (totalExp/totalRev)*100 ).toFixed(1)}% hai. 
      \n\n💡 **Gemini Insight:** Aapka sabse bada single expense ₹${topExpense?.amount.toLocaleString()} (${topExpense?.vendor}) hai. Agar aap ise 10% bhi optimize karte hain, toh mahine ke ₹${(topExpense?.amount * 0.1).toFixed(0)} bach sakte hain.`;
    }

    if (q.includes("profit") || q.includes("fayda")) {
      const profit = totalRev - totalExp;
      return `Aapka net profit abhi ₹${profit.toLocaleString()} hai. Pichle records ke hisab se, aapka trend ${profit > 0 ? "positive" : "concerning"} hai. Kya aap chahte hain ki main profit badhane ke liye koi specific strategy bataun?`;
    }

    // Default Intelligence
    return `Main aapke live database (Invoices: ${inv?.length}, Expenses: ${exp?.length}) ko analyze kar raha hoon. 
    \nAap mujhse kisi specific vendor, client ya tax (GST) ke baare mein bhi pooch sakte hain.`;
  };

  const send = async (textOverride?: string) => {
    const text = textOverride || input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      // Yahan Gemini AI Logic call ho raha hai
      const aiResponse = await askGeminiAI(text);
      
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);
        setLoading(false);
      }, 1000);
    } catch (err) {
      toast.error("AI Brain connection failed");
      setLoading(false);
    }
  };

  const chatContent = (
    <div className={`flex flex-col ${fullPage ? "h-full" : "h-[500px] w-[340px]"} bg-card rounded-2xl border shadow-2xl overflow-hidden`}>
      {/* Premium Header */}
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

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-xs font-bold text-slate-800">Advanced Business Intelligence</p>
            <p className="text-[10px] text-slate-500 mt-1 px-6">Main aapke database ka use karke real-time analysis kar sakta hoon.</p>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
              m.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
            }`}>
              {m.content.split('\n').map((line, idx) => <p key={idx}>{line}</p>)}
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

      {/* Footer */}
      <div className="p-3 border-t bg-white">
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 focus-within:border-blue-500 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask anything about your business..."
            className="flex-1 bg-transparent px-2 text-xs outline-none text-slate-800"
          />
          <button onClick={() => send()} disabled={!input.trim() || loading} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all">
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
        {!open && <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900 animate-pulse" />}
      </motion.button>
    </>
  );
}