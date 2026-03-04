import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  Receipt,
  Landmark,
  BarChart3,
  Settings,
  MessageCircle,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "AI Forecasting", url: "/forecasting", icon: TrendingUp },
  { title: "Invoices", url: "/invoices", icon: FileText },
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "Loan Advisor", url: "/loans", icon: Landmark },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "AI Chat", url: "/chat", icon: MessageCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      {/* Sidebar Header: Branding */}
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <span className="text-sm font-bold text-white">AF</span>
          </div>
          {!collapsed && (
            <div className="animate-in fade-in duration-300">
              <h2 className="font-display text-sm font-bold text-sidebar-foreground">Automnus</h2>
              <p className="text-[11px] text-sidebar-foreground/60 leading-none">Finance System</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-widest px-2">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-sidebar-accent/60 transition-all relative"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-bold shadow-sm"
                      // Dashboard par hum alerts dikhayenge
                      showBadge={item.title === "Dashboard"} 
                    >
                      <item.icon className="mr-3 h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Footer: Settings & MSME Info */}
      <SidebarFooter className="p-4 gap-4">
        {!collapsed && (
          <div className="rounded-xl bg-sidebar-accent/40 p-3 border border-sidebar-border/50">
            <p className="text-[9px] font-black uppercase tracking-widest text-sidebar-foreground/50">MSME Business ID</p>
            <p className="text-xs font-bold text-sidebar-foreground mt-0.5">SRT-KR-2026-0847</p>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink 
                to="/settings" 
                className="flex items-center px-3 py-2 rounded-lg hover:bg-sidebar-accent/60 transition-all" 
                activeClassName="bg-sidebar-accent text-sidebar-primary"
              >
                <Settings className="mr-3 h-4 w-4 shrink-0" />
                {!collapsed && <span className="text-sm font-medium">Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}