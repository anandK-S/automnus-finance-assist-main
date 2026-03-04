import { motion } from "framer-motion";
import { FileText, Download, Send, Plus, Eye, Loader2, Upload, Trash2, CheckCircle } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface Invoice {
  id: string;
  invoice_number: string;
  client: string;
  amount: number;
  gst_rate: string;
  status: string;
  date: string;
}

const statusStyles: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
  draft: "bg-slate-100 text-slate-600",
};

const Invoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ client: "", amount: "", gst_rate: "18%" });
  const [submitting, setSubmitting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setInvoices(
        data.map((inv: any) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          client: inv.client,
          amount: Number(inv.amount),
          gst_rate: inv.gst_rate,
          status: inv.status,
          date: new Date(inv.date || inv.created_at).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInvoices();
    const channel = supabase
      .channel('invoices-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        fetchInvoices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInvoices]);

  // --- ACTIONS LOGIC ---

  // 1. Mark as Paid
  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    if (currentStatus === 'paid') return;
    
    const { error } = await supabase
      .from("invoices")
      .update({ status: 'paid' })
      .eq('id', id);

    if (error) toast.error("Update failed");
    else toast.success("Invoice marked as Paid!");
  };

  // 2. Delete Invoice
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq('id', id);

    if (error) toast.error("Delete failed");
    else toast.success("Invoice deleted");
  };

  // 3. Simple Download (CSV format for that single invoice)
  const handleDownload = (inv: Invoice) => {
    const content = `Invoice No: ${inv.invoice_number}\nClient: ${inv.client}\nAmount: ${inv.amount}\nStatus: ${inv.status}\nDate: ${inv.date}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${inv.invoice_number}.txt`;
    link.click();
    toast.success("Downloading Invoice Details...");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    
    const { error } = await supabase.from("invoices").insert({
      user_id: user?.id,
      invoice_number: invoiceNumber,
      client: formData.client,
      amount: parseFloat(formData.amount),
      gst_rate: formData.gst_rate,
      status: "pending",
      date: new Date().toISOString().split('T')[0]
    });

    if (error) toast.error(error.message);
    else {
      toast.success("Invoice created!");
      setShowForm(false);
      setFormData({ client: "", amount: "", gst_rate: "18%" });
    }
    setSubmitting(false);
  };

  // CSV Import remains same...
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length <= 1) { toast.error("CSV is empty"); return; }
      const newInvoices = lines.slice(1).map((line) => {
        const values = line.split(",");
        return {
          user_id: user?.id,
          invoice_number: values[0]?.trim() || `INV-B-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          client: values[1]?.trim() || "Unknown Client",
          amount: parseFloat(values[2]?.trim()) || 0,
          gst_rate: values[3]?.trim() || "18%",
          status: values[4]?.trim() || "pending",
          date: values[5]?.trim() || new Date().toISOString().split('T')[0]
        };
      });
      const { error } = await supabase.from("invoices").insert(newInvoices);
      if (error) toast.error("CSV Import Failed");
      else toast.success(`${newInvoices.length} Invoices imported!`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const summary = {
    total: invoices.reduce((s, i) => s + i.amount, 0),
    paid: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0),
    pending: invoices.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0),
    overdue: invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track your GST billing</p>
        </div>
        <div className="flex gap-2">
          <input type="file" accept=".csv" className="hidden" ref={csvInputRef} onChange={handleCSVUpload} />
          <button onClick={() => csvInputRef.current?.click()} className="bg-secondary text-foreground px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-muted/10 transition-all">
            <Upload className="h-4 w-4" /> Import CSV
          </button>
          <button onClick={() => setShowForm(!showForm)} className="bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Invoice
          </button>
        </div>
      </div>

      {showForm && (
        <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleCreate} className="bg-card rounded-xl p-5 shadow-sm border space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">Client Name</label>
              <Input value={formData.client} onChange={(e) => setFormData((p) => ({ ...p, client: e.target.value }))} placeholder="e.g. Mehta Textiles" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">Amount (₹)</label>
              <Input type="number" value={formData.amount} onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))} placeholder="0.00" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">GST Rate</label>
              <Input value={formData.gst_rate} onChange={(e) => setFormData((p) => ({ ...p, gst_rate: e.target.value }))} placeholder="18%" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Save Invoice
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-muted px-4 py-2 rounded-lg text-sm font-medium">Cancel</button>
          </div>
        </motion.form>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `₹${summary.total.toLocaleString("en-IN")}`, color: "text-primary" },
          { label: "Paid", value: `₹${summary.paid.toLocaleString("en-IN")}`, color: "text-green-600" },
          { label: "Pending", value: `₹${summary.pending.toLocaleString("en-IN")}`, color: "text-yellow-600" },
          { label: "Overdue", value: `₹${summary.overdue.toLocaleString("en-IN")}`, color: "text-red-600" },
        ].map((s, i) => (
          <div key={s.label} className="bg-card rounded-xl p-4 shadow-sm border">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{s.label}</p>
            <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary/50" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left py-4 px-4 font-bold text-muted-foreground">Invoice #</th>
                  <th className="text-left py-4 px-4 font-bold text-muted-foreground">Client</th>
                  <th className="text-left py-4 px-4 font-bold text-muted-foreground">Amount</th>
                  <th className="text-left py-4 px-4 font-bold text-muted-foreground">Date</th>
                  <th className="text-left py-4 px-4 font-bold text-muted-foreground">Status</th>
                  <th className="text-left py-4 px-4 font-bold text-muted-foreground text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length > 0 ? invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="py-4 px-4 font-bold">{inv.invoice_number}</td>
                    <td className="py-4 px-4 font-medium">{inv.client}</td>
                    <td className="py-4 px-4 font-bold text-primary">₹{inv.amount.toLocaleString("en-IN")}</td>
                    <td className="py-4 px-4 text-muted-foreground">{inv.date}</td>
                    <td className="py-4 px-4">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${statusStyles[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center gap-3">
                        {/* Mark as Paid Action */}
                        <button 
                          onClick={() => handleUpdateStatus(inv.id, inv.status)}
                          className={`p-1.5 rounded-md transition-all ${inv.status === 'paid' ? 'text-green-500 cursor-default' : 'text-muted-foreground hover:text-green-600 hover:bg-green-50'}`}
                          title="Mark as Paid"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        
                        {/* Download Action */}
                        <button 
                          onClick={() => handleDownload(inv)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-all"
                          title="Download Invoice"
                        >
                          <Download className="h-4 w-4" />
                        </button>

                        {/* Delete Action */}
                        <button 
                          onClick={() => handleDelete(inv.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all"
                          title="Delete Invoice"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="p-10 text-center text-muted-foreground italic">No invoices found. Add your first one!</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Invoices;