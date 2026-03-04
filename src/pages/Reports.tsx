import { motion } from "framer-motion";
import { Download, FileSpreadsheet, FileText, Calendar, Filter, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ revenue: 0, expenses: 0 });

  // --- 1. FETCH ACTUAL DATA FOR P&L CHART ---
  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const { data: inv } = await (supabase.from("invoices" as any) as any).select("amount, date");
        const { data: exp } = await (supabase.from("expenses" as any) as any).select("amount, date");

        // Logic to group by Month
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyData = months.map(m => ({ month: m, revenue: 0, expenses: 0 }));

        inv?.forEach((i: any) => {
          const mIndex = new Date(i.date).getMonth();
          monthlyData[mIndex].revenue += Number(i.amount);
        });

        exp?.forEach((e: any) => {
          const mIndex = new Date(e.date).getMonth();
          monthlyData[mIndex].expenses += Number(e.amount);
        });

        setChartData(monthlyData.filter(d => d.revenue > 0 || d.expenses > 0));
        
        const totalRev = inv?.reduce((s: number, i: any) => s + Number(i.amount), 0) || 0;
        const totalExp = exp?.reduce((s: number, e: any) => s + Number(e.amount), 0) || 0;
        setSummary({ revenue: totalRev, expenses: totalExp });

      } catch (error) {
        toast.error("Failed to load report data");
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  // --- 2. EXPORT LOGIC (CSV Download) ---
  const downloadCSV = (type: string) => {
    toast.info(`Preparing ${type}...`);
    
    // Simple CSV generator logic
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Month,Revenue,Expenses,Net Profit\n";
    
    chartData.forEach(row => {
      csvContent += `${row.month},${row.revenue},${row.expenses},${row.revenue - row.expenses}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${type.replace(/\s+/g, '_')}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${type} Downloaded!`);
  };

  const reportTypes = [
    { title: "Profit & Loss Statement", desc: "Monthly breakdown of income vs spends", icon: FileText, format: "CSV" },
    { title: "GST Data Export", desc: "Ready-to-file GSTR summary", icon: FileSpreadsheet, format: "Excel" },
    { title: "Expense Analysis", desc: "Detailed category-wise spending", icon: FileText, format: "CSV" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Financial Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Export your MSME data for CA & Taxes</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-card border px-4 py-2 rounded-lg shadow-sm flex items-center gap-4">
            <div className="text-xs">
              <span className="text-muted-foreground block uppercase font-bold">Total Profit</span>
              <span className="text-sm font-bold text-success">₹{(summary.revenue - summary.expenses).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic P&L Chart */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-semibold text-foreground">Actual P&L Overview (FY 2025-26)</h3>
          <div className="flex gap-4 text-[10px] font-bold uppercase">
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary" /> Revenue</span>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /> Expenses</span>
          </div>
        </div>
        
        {loading ? (
          <div className="h-[280px] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip 
                cursor={{fill: 'hsl(var(--muted)/0.4)'}} 
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
              />
              <Bar dataKey="revenue" fill="hsl(152, 55%, 28%)" radius={[4, 4, 0, 0]} barSize={35} />
              <Bar dataKey="expenses" fill="hsl(0, 72%, 50%)" radius={[4, 4, 0, 0]} barSize={35} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Export Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((report, i) => (
          <motion.div
            key={report.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl p-5 shadow-sm border hover:border-primary/30 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <report.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-md">{report.format}</span>
            </div>
            <h4 className="text-sm font-bold text-foreground mb-1">{report.title}</h4>
            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">{report.desc}</p>
            <button 
              onClick={() => downloadCSV(report.title)}
              className="w-full bg-secondary text-foreground py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all shadow-sm"
            >
              <Download className="h-3.5 w-3.5" /> Download Report
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Reports;