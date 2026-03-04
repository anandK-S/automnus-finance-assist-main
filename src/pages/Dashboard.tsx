import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import {
  IndianRupee, TrendingUp, TrendingDown, AlertTriangle, Wallet, Loader2, CheckCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Dashboard = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [ownerName, setOwnerName] = useState("User");

  // --- 1. FETCH PROFILE ---
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (data?.full_name) {
        setOwnerName(data.full_name.split(' ')[0]);
      }
    };
    fetchProfile();
  }, [user]);

  // --- 2. REAL-TIME SUBSCRIPTION ---
  // Isse dashboard bina refresh kiye update hoga jab bhi alert aayega
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // --- 3. DATA FETCHING LOGIC ---
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      // Fetching all data
      const { data: inv } = await (supabase.from("invoices" as any) as any).select("*");
      const { data: exp } = await (supabase.from("expenses" as any) as any).select("*");
      
      // ALERTS FETCH: Make sure the table name matches exactly
      const { data: alertsData, error: alertError } = await (supabase.from("risk_alerts" as any) as any)
        .select("*")
        .eq("is_resolved", false) // Sirf active alerts
        .order("created_at", { ascending: false });

      if (alertError) console.error("Alert Fetch Error:", alertError);
      
      const totalRevenue = inv?.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0) || 0;
      const totalExpenses = exp?.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0) || 0;
      const netProfit = totalRevenue - totalExpenses;
      const pendingValue = inv?.filter((i: any) => i.status === 'pending').reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0) || 0;
      const pendingCount = inv?.filter((i: any) => i.status === 'pending').length || 0;

      // Grouping expenses
      const categoryMap: Record<string, number> = {};
      exp?.forEach((e: any) => {
        const cat = e.category || "Other";
        categoryMap[cat] = (categoryMap[cat] || 0) + Number(e.amount);
      });

      const colors = ["hsl(152, 55%, 28%)", "hsl(42, 80%, 55%)", "hsl(210, 80%, 52%)", "hsl(160, 30%, 60%)", "hsl(0, 72%, 51%)"];
      const expenseData = Object.entries(categoryMap).length > 0 
        ? Object.entries(categoryMap).map(([name, value], index) => ({
            name,
            amount: value,
            value: Math.round((value / totalExpenses) * 100),
            color: colors[index % colors.length]
          }))
        : [{ name: "No Data", value: 100, amount: 0, color: "#cbd5e1" }];

      return { totalRevenue, totalExpenses, netProfit, pendingValue, pendingCount, alerts: alertsData || [], expenseData };
    },
  });

  const handleResolveAlert = async (id: string) => {
    const { error } = await supabase.from("risk_alerts").update({ is_resolved: true }).eq("id", id);
    if (!error) {
      toast.success("Alert resolved");
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Financial Command Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, <span className="text-primary font-bold">{ownerName}</span>. Your business health is being monitored.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={`₹${metrics?.totalRevenue.toLocaleString("en-IN")}`} change="Live" changeType="positive" icon={<IndianRupee className="h-4 w-4 text-primary" />} delay={0} />
        <StatCard title="Total Expenses" value={`₹${metrics?.totalExpenses.toLocaleString("en-IN")}`} change="Synced" changeType="negative" icon={<TrendingDown className="h-4 w-4 text-destructive" />} delay={0.1} />
        <StatCard title="Net Profit" value={`₹${metrics?.netProfit.toLocaleString("en-IN")}`} change={metrics?.netProfit && metrics.netProfit > 0 ? "Profit" : "Loss"} changeType={metrics?.netProfit && metrics.netProfit > 0 ? "positive" : "negative"} icon={<TrendingUp className="h-4 w-4 text-success" />} delay={0.2} />
        <StatCard title="Pending Invoices" value={`₹${metrics?.pendingValue.toLocaleString("en-IN")}`} change={`${metrics?.pendingCount} active`} changeType="neutral" icon={<Wallet className="h-4 w-4 text-info" />} delay={0.3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-card rounded-xl p-5 shadow-sm border">
          <h3 className="font-display font-semibold mb-6">Cash Flow Analysis</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={[{ name: "Live Stats", revenue: metrics?.totalRevenue, expenses: metrics?.totalExpenses }]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip cursor={{fill: 'transparent'}} formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
              <Bar dataKey="revenue" fill="hsl(152, 55%, 28%)" radius={[4, 4, 0, 0]} barSize={60} />
              <Bar dataKey="expenses" fill="hsl(32, 95%, 60%)" radius={[4, 4, 0, 0]} barSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Dynamic Pie Chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-5 shadow-sm border">
          <h3 className="font-display font-semibold mb-4">Expense Categories</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={metrics?.expenseData} innerRadius={60} outerRadius={80} dataKey="value" paddingAngle={5}>
                  {metrics?.expenseData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [`${v}%`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
            {metrics?.expenseData.map((item: any) => (
              <div key={item.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground font-medium">{item.name}</span>
                </div>
                <span className="font-bold">₹{item.amount.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* --- CRITICAL ALERTS SECTION (FULLY DYNAMIC) --- */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-6 shadow-sm border border-red-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5 animate-bounce" />
            <h3 className="font-display font-bold text-lg tracking-tight">Critical Business Alerts</h3>
          </div>
          {metrics?.alerts && metrics.alerts.length > 0 && (
            <span className="text-[10px] bg-red-600 text-white px-3 py-1 rounded-full font-black animate-pulse">
              {metrics.alerts.length} URGENT
            </span>
          )}
        </div>

        <div className="space-y-4">
          {metrics?.alerts && metrics.alerts.length > 0 ? (
            metrics.alerts.map((alert: any) => (
              <div key={alert.id} className="flex items-start justify-between p-4 rounded-xl border bg-red-50/30 border-red-100 group hover:bg-red-50 transition-all shadow-sm">
                <div className="flex gap-4">
                  <div className="mt-1 h-3 w-3 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{alert.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest italic">
                      Detectected: {new Date(alert.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleResolveAlert(alert.id)}
                  className="text-[10px] font-black text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg border border-red-200 transition-all"
                >
                  RESOLVE
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-2xl border-muted/20">
              <CheckCircle className="h-10 w-10 text-green-500/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium italic tracking-tight">
                No active risks. Business is running within safe parameters.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;