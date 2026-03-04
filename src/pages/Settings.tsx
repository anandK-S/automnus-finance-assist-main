import { motion, AnimatePresence } from "framer-motion";
import { User, Shield, Bell, Palette, Globe, LogOut, Loader2, X, MailCheck, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ full_name: "", business_name: "" });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- 1. Fetch Profile Data ---
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setProfile({ 
          full_name: data.full_name || "", 
          business_name: data.business_name || "" 
        });
      }
    };
    fetchProfile();
  }, [user]);

  // --- 2. Save Profile Logic ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user?.id,
      full_name: profile.full_name,
      business_name: profile.business_name,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      toast.error("Update failed: " + error.message);
    } else {
      toast.success("Profile updated successfully!");
      setIsEditModalOpen(false);
    }
    setLoading(false);
  };

  // --- 3. Security Reset Logic with Rate Limit Handling ---
  const handleSecurityReset = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user?.email || "", {
        redirectTo: window.location.origin + '/auth',
      });

      if (error) {
        // Checking for Rate Limit Error (Status 429)
        if (error.status === 429 || error.message.includes("rate limit")) {
          toast.error("Too many requests!", {
            description: "Please wait 60 seconds before trying again. Supabase limits email frequency.",
            icon: <AlertCircle className="h-5 w-5 text-destructive" />,
          });
          return;
        }
        throw error;
      }

      toast.success("Check your inbox!", {
        description: `Reset link sent to ${user?.email}`,
        icon: <MailCheck className="h-5 w-5 text-success" />,
        duration: 6000,
      });
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 4. Logout Logic ---
  const handleLogout = async () => {
    setLoading(true);
    const { error } = await signOut();
    if (error) toast.error("Logout failed");
    else toast.success("Signed out successfully!");
    setLoading(false);
  };

  const settingsItems = [
    { 
      icon: User, 
      title: "Business Profile", 
      desc: profile.full_name ? `${profile.full_name} • ${profile.business_name}` : user?.email, 
      action: "Edit",
      onClick: () => setIsEditModalOpen(true)
    },
    { 
      icon: Shield, 
      title: "Security", 
      desc: "Change your password via email", 
      action: loading ? "Sending..." : "Reset",
      onClick: handleSecurityReset
    },
    { 
      icon: Globe, 
      title: "Language", 
      desc: "English (US) • Hindi Support", 
      action: "Toggle",
      onClick: () => toast.info("Language settings will be available in the next update.")
    },
    { 
      icon: LogOut, 
      title: "Account", 
      desc: "Logout from this session", 
      action: "Logout",
      onClick: handleLogout,
      danger: true
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your business account and MSME preferences</p>
      </div>

      <div className="space-y-4">
        {settingsItems.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card rounded-xl p-5 shadow-sm border flex items-center justify-between hover:border-primary/20 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-lg ${item.danger ? 'bg-red-50' : 'bg-primary/10'}`}>
                <item.icon className={`h-5 w-5 ${item.danger ? 'text-red-600' : 'text-primary'}`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
            <button 
              onClick={item.onClick}
              disabled={loading}
              className={`text-xs font-bold px-4 py-2 rounded-md transition-all ${
                item.danger 
                ? 'text-red-600 hover:bg-red-50' 
                : 'text-primary hover:bg-primary/10'
              } disabled:opacity-50 min-w-[70px] flex justify-center`}
            >
              {loading && (item.action === "Logout" || item.action === "Sending...") ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                item.action
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {/* --- EDIT PROFILE MODAL --- */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl border"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Update MSME Profile</h3>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Owner Name</label>
                  <input 
                    className="w-full bg-muted p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary border border-transparent transition-all"
                    placeholder="Enter your full name"
                    value={profile.full_name}
                    onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Business Name</label>
                  <input 
                    className="w-full bg-muted p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary border border-transparent transition-all"
                    placeholder="Enter MSME name"
                    value={profile.business_name}
                    onChange={(e) => setProfile({...profile, business_name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-primary text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Update Profile"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="pt-10 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-50">
          Autonomous Finance Intelligence • v1.0.4
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;