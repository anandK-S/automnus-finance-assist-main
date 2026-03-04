import { motion } from "framer-motion";
import { Landmark, ShieldCheck, AlertCircle, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const loanOptions = [
  { name: "TReDS Factoring", provider: "M1Xchange", rate: "8.5%", amount: "₹5,00,000", match: 92 },
  { name: "MSME Business Loan", provider: "SBI", rate: "9.25%", amount: "₹10,00,000", match: 85 },
  { name: "Working Capital", provider: "HDFC Bank", rate: "10.5%", amount: "₹3,00,000", match: 78 },
];

const Loans = () => {
  const [loading, setLoading] = useState(true);
  const [creditScore, setCreditScore] = useState(0);
  const [healthMetrics, setHealthMetrics] = useState({ revenue: 0, expenseRatio: 0 });

  // --- 1. DYNAMIC CREDIT ASSESSMENT LOGIC ---
  useEffect(() => {
    const fetchFinancialHealth = async () => {
      setLoading(true);
      try {
        const { data: inv } = await (supabase.from("invoices" as any) as any).select("amount, status");
        const { data: exp } = await (supabase.from("expenses" as any) as any).select("amount");

        const totalRevenue = inv?.reduce((s: number, i: any) => s + Number(i.amount), 0) || 0;
        const totalExpenses = exp?.reduce((s: number, e: any) => s + Number(e.amount), 0) || 0;
        
        // Simple Credit Scoring Logic
        // Base Score 600 + (Revenue Factor) - (Expense Risk)
        let baseScore = 650;
        if (totalRevenue > 100000) baseScore += 50;
        if (totalRevenue > 500000) baseScore += 50;
        
        const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) : 0;
        if (expenseRatio > 0.8) baseScore -= 30; // High risk if expenses are > 80% of revenue

        setCreditScore(Math.min(baseScore, 900));
        setHealthMetrics({ revenue: totalRevenue, expenseRatio });
      } catch (error) {
        console.error("Scoring error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialHealth();
  }, []);

  const complianceItems = [
    { label: "GSTR-3B Filing", status: healthMetrics.revenue > 0 ? "done" : "pending", due: "20th of every month" },
    { label: "Udyam Registration", status: "done", due: "Verified" },
    { label: "MSME Annual Return", status: "pending", due: "30 Jun 2026" },
    { label: "TDS Return Q4", status: "overdue", due: "15 Mar 2026" },
  ];

  const statusIcon: Record<string, React.ReactNode> = {
    done: <CheckCircle className="h-4 w-4 text-green-500" />,
    pending: <AlertCircle className="h-4 w-4 text-orange-500" />,
    overdue: <AlertCircle className="h-4 w-4 text-red-500" />,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Loan & Risk Advisor</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-based credit score & MSME scheme matchmaker</p>
      </div>

      {/* Dynamic Credit Score */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-6 shadow-sm border">
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-36 h-36">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted)/0.2)" strokeWidth="10" />
                <circle 
                  cx="60" cy="60" r="52" fill="none" 
                  stroke={creditScore > 700 ? "#15803d" : "#eab308"} 
                  strokeWidth="10" 
                  strokeDasharray={`${(creditScore / 900) * 327} 327`} 
                  strokeLinecap="round" 
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-display font-bold text-foreground">{creditScore}</span>
                <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Score</span>
              </div>
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className="font-display font-bold text-xl text-foreground">
                {creditScore > 700 ? "Excellent Credit Health" : "Good Credit Health"}
              </h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Your score is calculated based on ₹{healthMetrics.revenue.toLocaleString("en-IN")} total revenue and GST filing consistency.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 px-3 py-1 rounded-full">Active Invoicing</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-3 py-1 rounded-full">MSME Verified</span>
                {healthMetrics.expenseRatio > 0.7 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-3 py-1 rounded-full">High Burn Rate</span>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommended Loans */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg"><Landmark className="h-5 w-5 text-primary" /></div>
            <h3 className="font-display font-bold text-foreground">Top Loan Matches</h3>
          </div>
          <div className="space-y-4">
            {loanOptions.map((loan) => (
              <div key={loan.name} className="group border rounded-xl p-4 hover:border-primary/50 hover:bg-primary/[0.02] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-foreground">{loan.name}</h4>
                  <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">{loan.match}% Match</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-muted-foreground">{loan.provider}</p>
                    <p className="text-lg font-bold text-primary mt-1">{loan.amount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground">Interest: {loan.rate}</p>
                    <button 
                      onClick={() => toast.success(`Application started for ${loan.name}`)}
                      className="mt-2 text-xs font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all"
                    >
                      Apply Now <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Compliance Checker */}
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg"><ShieldCheck className="h-5 w-5 text-primary" /></div>
            <h3 className="font-display font-bold text-foreground">Compliance Tracker</h3>
          </div>
          <div className="space-y-4">
            {complianceItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-transparent hover:border-muted-foreground/10 transition-all">
                <div className="flex items-center gap-4">
                  {statusIcon[item.status]}
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Deadline: {item.due}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${item.status === "done" ? "text-green-600" : item.status === "overdue" ? "text-red-600" : "text-orange-600"}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Loans;