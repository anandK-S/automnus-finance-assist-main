import { motion, AnimatePresence } from "framer-motion";
import { Upload, AlertTriangle, CheckCircle, Mic, MicOff, Loader2, FileText, Trash2, Edit2, X, Check, Plus } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface Expense {
  id: string;
  category: string;
  vendor: string;
  amount: number;
  date: string;
  flagged: boolean;
  flag_reason?: string;
}

const Expenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Professional Blank States
  const [formData, setFormData] = useState({ vendor: "", amount: "", category: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. RISK & ALERT ENGINE ---
  const checkAndFlagRisk = async (expenseData: any) => {
    const RISK_LIMIT = 50000;
    const amountNum = Number(expenseData.amount);
    const isFlagged = amountNum > RISK_LIMIT;
    
    const { data: newExp, error: expError } = await supabase
      .from("expenses")
      .insert([{
        user_id: user?.id,
        vendor: expenseData.vendor,
        amount: amountNum,
        category: expenseData.category,
        date: expenseData.date,
        flagged: isFlagged,
        flag_reason: isFlagged ? "High Value Transaction" : null
      }]);

    if (expError) throw expError;

    if (isFlagged) {
      await supabase.from("risk_alerts").insert([{
        user_id: user?.id,
        message: `🚨 High Spend: ₹${amountNum.toLocaleString()} at ${expenseData.vendor}`,
        severity: "danger",
        is_resolved: false
      }]);
      toast.warning("High value expense flagged for review!");
    }
  };

  // --- 2. DATA FETCHING ---
  const fetchExpenses = useCallback(async () => {
    setLoadingData(true);
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) {
      setExpenses(data.map((e: any) => ({
        id: e.id,
        category: e.category || "General",
        vendor: e.vendor || "Unknown",
        amount: Number(e.amount),
        date: new Date(e.date || e.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        flagged: e.flagged || false,
        flag_reason: e.flag_reason,
      })));
    }
    setLoadingData(false);
  }, []);

  useEffect(() => {
    fetchExpenses();
    const channel = supabase.channel('exp-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchExpenses()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchExpenses]);

  // --- 3. HANDLERS ---
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await checkAndFlagRisk({
        vendor: formData.vendor,
        amount: formData.amount,
        category: formData.category,
        date: new Date().toISOString()
      });
      setFormData({ vendor: "", amount: "", category: "" }); // Reset to blank
      setShowForm(false);
      fetchExpenses();
      toast.success("Expense logged!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    const { error } = await supabase.from("expenses").delete().eq('id', id);
    if (!error) toast.success("Deleted");
  };

  const saveCategory = async (id: string) => {
    const { error } = await supabase.from("expenses").update({ category: editValue }).eq('id', id);
    if (!error) {
      toast.success("Category updated");
      setEditingId(null);
    }
  };

  const processCSV = async (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
      for (const line of lines.slice(1)) {
        const v = line.split(",");
        if (v.length < 2) continue;
        await checkAndFlagRisk({
          vendor: v[1]?.trim(),
          category: v[2]?.trim(),
          amount: v[3]?.trim(),
          date: new Date().toISOString()
        });
      }
      setIsProcessing(false);
      fetchExpenses();
    };
    reader.readAsText(file);
  };

  const handleVoiceInput = () => {
    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Speech) return toast.error("Browser not supported");
    const rec = new Speech();
    rec.onstart = () => setIsListening(true);
    rec.onresult = async (e: any) => {
      const txt = e.results[0][0].transcript;
      const amt = txt.match(/\d+/) ? parseInt(txt.match(/\d+/)[0]) : 0;
      if (amt > 0) {
        await checkAndFlagRisk({ vendor: "Voice Log", category: "Personal", amount: amt, date: new Date().toISOString() });
        fetchExpenses();
      }
    };
    rec.onend = () => setIsListening(false);
    rec.start();
  };

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Expense Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">Log business expenses via Manual, CSV, or Voice</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Add Manual
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="bg-secondary text-foreground px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-muted transition-all">
            <FileText className="h-4 w-4" /> CSV Upload
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && processCSV(e.target.files[0])} />

      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            onSubmit={handleManualSubmit}
            className="bg-card rounded-2xl p-6 shadow-sm border border-primary/20 space-y-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Vendor/Shop Name</label>
                <Input value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value})} placeholder="Enter vendor name..." required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Amount (₹)</label>
                <Input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="0.00" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Category</label>
                <Input value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="e.g. Office, Fuel..." required />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-bold text-muted-foreground">Cancel</button>
              <button type="submit" disabled={isProcessing} className="bg-primary text-white px-8 py-2 rounded-xl text-sm font-bold shadow-md">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Expense"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className="border-2 border-dashed rounded-2xl p-8 text-center bg-card hover:border-primary/40 transition-all group">
            <p className="text-xs font-bold text-muted-foreground mb-4">Click below to record expense via voice</p>
            <button onClick={handleVoiceInput} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 mx-auto transition-all shadow-sm ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-muted text-foreground hover:bg-muted/80"}`}>
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isListening ? "Listening..." : "Log Voice Expense"}
            </button>
          </div>
        </div>
        <div className="bg-primary rounded-2xl p-6 text-white flex flex-col justify-center shadow-lg shadow-primary/20">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Outflow</span>
          <span className="text-3xl font-display font-bold mt-1">₹{total.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-5 border-b font-display font-bold text-sm bg-muted/5">Recent Transactions</div>
        <div className="divide-y max-h-[500px] overflow-y-auto">
          {expenses.length > 0 ? expenses.map((exp) => (
            <div key={exp.id} className="flex items-center justify-between p-5 hover:bg-muted/5 transition-all group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${exp.flagged ? "bg-red-50 animate-pulse" : "bg-green-50"}`}>
                  {exp.flagged ? <AlertTriangle className="h-5 w-5 text-red-600" /> : <CheckCircle className="h-5 w-5 text-green-600" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{exp.vendor}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {editingId === exp.id ? (
                      <div className="flex items-center gap-1">
                        <input className="text-[10px] border rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary w-24" value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus />
                        <button onClick={() => saveCategory(exp.id)} className="p-1 text-green-600"><Check className="h-3 w-3" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-red-600"><X className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] text-muted-foreground font-bold tracking-tight uppercase">{exp.category} • {exp.date}</p>
                        <button onClick={() => { setEditingId(exp.id); setEditValue(exp.category); }} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-primary transition-all"><Edit2 className="h-3 w-3" /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className={`text-sm font-bold ${exp.flagged ? "text-red-600" : "text-foreground"}`}>₹{exp.amount.toLocaleString("en-IN")}</p>
                  {exp.flagged && <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter">HIGH RISK</span>}
                </div>
                <button onClick={() => handleDelete(exp.id)} className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          )) : (
            <div className="p-10 text-center text-muted-foreground italic">No expenses recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Expenses;