import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2, Sparkles, PieChart, TrendingUp, Wallet, ListChecks } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const Chat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Namaste! Main aapka AI Financial Officer hoon. Main aapke business data ko scan karke deep insights de sakta hoon. \n\nNiche diye gaye buttons se shuru karein ya apna sawal likhein.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickActions = [
    { label: "Profit Analysis", icon: <TrendingUp size={14} />, query: "Mera profit analysis dikhao" },
    { label: "Top Expenses", icon: <PieChart size={14} />, query: "Sabse zyada kharcha kahan ho raha hai?" },
    { label: "Pending Bills", icon: <Wallet size={14} />, query: "Kitne invoices pending hain?" },
    { label: "Business Tips", icon: <Sparkles size={14} />, query: "Business improve karne ki tips do" },
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const newUserMsg: Message = { id: Date.now().toString(), role: "user", content: userText };
    setMessages(prev => [...prev, newUserMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const { data: exp } = await supabase.from("expenses").select("*");
      const { data: inv } = await supabase.from("invoices").select("*");

      const totalRev = inv?.reduce((s, i) => s + Number(i.amount), 0) || 0;
      const totalExp = exp?.reduce((s, e) => s + Number(e.amount), 0) || 0;
      const profit = totalRev - totalExp;

      let responseText = "";
      const query = userText.toLowerCase();

      // --- ADVANCED LOGIC ENGINE ---

      if (query.includes("profit") || query.includes("fayda")) {
        responseText = `📊 **Financial Health Report:**\n\n• Total Revenue: ₹${totalRev.toLocaleString()}\n• Total Expenses: ₹${totalExp.toLocaleString()}\n• **Net Profit: ₹${profit.toLocaleString()}**\n\n${profit > 0 ? "✅ Aapka business profitable hai!" : "⚠️ Alert: Aapke kharche revenue se zyada hain."}`;
      } 
      else if (query.includes("kharcha") || query.includes("expense")) {
        const cats: any = {};
        exp?.forEach(e => { cats[e.category] = (cats[e.category] || 0) + Number(e.amount); });
        const topCat = Object.keys(cats).reduce((a, b) => (cats[a] > cats[b] ? a : b), "N/A");
        
        responseText = `💸 **Expense Insights:**\n\nAb tak ka kul kharcha ₹${totalExp.toLocaleString()} hai. \n\n📍 Sabse zyada paisa **"${topCat}"** category mein ja raha hai (₹${cats[topCat]?.toLocaleString()}). Ise thoda control karne se profit badh sakta hai.`;
      }
      else if (query.includes("pending") || query.includes("invoice") || query.includes("bill")) {
        const pending = inv?.filter(i => i.status === 'pending') || [];
        const pendingVal = pending.reduce((s, i) => s + Number(i.amount), 0);
        responseText = `📝 **Invoice Status:**\n\nAapke paas total **${pending.length}** pending invoices hain, jinse ₹${pendingVal.toLocaleString()} aana baaki hai. Inhe follow-up karna business ke liye zaroori hai.`;
      }
      else if (query.includes("tips") || query.includes("improve") || query.includes("advice")) {
        responseText = `💡 **AI Business Tips:**\n\n1. **Cash Flow:** Pending invoices par jaldi action lein.\n2. **Expenses:** ${totalExp > (totalRev * 0.5) ? "Aapke expenses revenue ke 50% se zyada hain, inhe optimize karein." : "Aapka expense ratio sahi hai."}\n3. **Tax Planning:** GST filings har mahine ki 20 tarikh se pehle poori karein.`;
      }
      else if (query.includes("hi") || query.includes("hello") || query.includes("namaste")) {
        responseText = "Namaste! Main Automnus AI hoon. Main aapke business data ko analyze kar sakta hoon. Aap upar diye gaye buttons ka use karke mujhse report maang sakte hain.";
      }
      else {
        responseText = "Maaf kijiye, main abhi sirf Financial Reports, Expenses, aur Invoices ke sawalon ka jawab de sakta hoon. Kya aap inme se kuch poochna chahte hain?";
      }

      setTimeout(() => {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: responseText }]);
        setIsLoading(false);
      }, 700);

    } catch (error) {
      toast.error("Database sync failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-100px)] flex flex-col p-4 bg-background">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="text-primary" /> Automnus Intel
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles size={12} className="text-yellow-500" /> Advanced MSME Analysis Engine
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-card border rounded-3xl shadow-xl overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-4 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${m.role === "assistant" ? "bg-primary text-white" : "bg-muted"}`}>
                  {m.role === "assistant" ? <Bot size={20} /> : <User size={20} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                  m.role === "assistant" ? "bg-muted/50 border rounded-tl-none" : "bg-primary text-white rounded-tr-none"
                }`}>
                  {m.content}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-primary text-white flex items-center justify-center"><Loader2 className="animate-spin" size={18} /></div>
              <span className="text-xs font-medium text-muted-foreground animate-pulse">Scanning Database...</span>
            </div>
          )}
        </div>

        {/* Bottom Panel */}
        <div className="p-4 border-t bg-background/50 backdrop-blur-md">
          {/* Quick Actions Chips */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleSendMessage(action.query)}
                className="flex items-center gap-2 px-4 py-2 bg-card border rounded-full text-[11px] font-bold hover:bg-primary hover:text-white transition-all whitespace-nowrap shadow-sm"
              >
                {action.icon} {action.label}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Poochiye: 'Mera fayda kitna hai?'"
              className="w-full bg-muted/50 border border-border rounded-2xl py-4 pl-5 pr-14 text-sm outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()} 
              className="absolute right-2 p-3 bg-primary text-white rounded-xl disabled:opacity-50 hover:scale-105 transition-transform shadow-lg shadow-primary/30"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;