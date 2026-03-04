import { useState, useEffect } from "react";
import { Bell, AlertTriangle, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export const NotificationBell = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchAlerts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("risk_alerts")
      .select("*")
      .eq("is_resolved", false)
      .order("created_at", { ascending: false });
    if (data) setAlerts(data);
  };

  useEffect(() => {
    fetchAlerts();

    // Real-time listener: Jaise hi 50k+ ka expense aaye, bell update ho jaye
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'risk_alerts' }, (payload) => {
        setAlerts((prev) => [payload.new, ...prev]);
        toast.error("New Critical Alert Received!");
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const resolveAlert = async (id: string) => {
    const { error } = await supabase.from("risk_alerts").update({ is_resolved: true }).eq("id", id);
    if (!error) {
      setAlerts(alerts.filter(a => a.id !== id));
      toast.success("Alert resolved");
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-full hover:bg-muted transition-colors">
        <Bell className="h-5 w-5 text-muted-foreground" />
        {alerts.length > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {alerts.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-card border rounded-xl shadow-xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
                <h3 className="font-bold text-sm">Business Notifications</h3>
                <button onClick={() => setIsOpen(false)}><X size={14} /></button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <div key={alert.id} className="p-4 border-b last:border-0 hover:bg-muted/10 transition-colors">
                      <div className="flex gap-3">
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-1" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold leading-tight">{alert.message}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-[10px] text-muted-foreground">Just now</span>
                            <button 
                              onClick={() => resolveAlert(alert.id)}
                              className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline"
                            >
                              <Check size={10} /> Mark Resolved
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <Check size={24} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">No active alerts</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};