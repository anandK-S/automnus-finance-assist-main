import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  showBadge?: boolean; // Naya option badge dikhane ke liye
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, showBadge, children, ...props }, ref) => {
    const [alertCount, setAlertCount] = useState(0);

    // Sirf un links ke liye count fetch karein jahan humein badge chahiye (e.g. Dashboard)
    useEffect(() => {
      if (!showBadge) return;

      const fetchAlerts = async () => {
        const { count } = await supabase
          .from("risk_alerts")
          .select("*", { count: 'exact', head: true })
          .eq("is_resolved", false);
        setAlerts(count || 0);
      };

      fetchAlerts();

      // Real-time update jab naya alert aaye
      const channel = supabase
        .channel('nav-alerts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'risk_alerts' }, () => {
          fetchAlerts();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }, [showBadge]);

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(
            "relative flex items-center w-full", // Relative zaroori hai badge position ke liye
            className, 
            isActive && activeClassName, 
            isPending && pendingClassName
          )
        }
        {...props}
      >
        {children}
        
        {/* Notification Badge Logic */}
        {showBadge && alertCount > 0 && (
          <span className="absolute right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm animate-in zoom-in duration-300">
            {alertCount}
          </span>
        )}
      </RouterNavLink>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };