import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Plus,
  Wrench,
  LayoutTemplate,
  FolderClock,
  CreditCard,
  Settings,
  ShieldCheck,
  Sparkles,
  Activity,
} from "lucide-react";

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Create", url: "/create", icon: Plus },
  { title: "Tools", url: "/tools", icon: Wrench },
  { title: "Templates", url: "/templates", icon: LayoutTemplate },
  { title: "History", url: "/history", icon: FolderClock },
];

const bottomNavItems = [
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/dashboard">
          <div className="flex items-center gap-3 cursor-pointer" data-testid="link-logo">
            <div className="w-9 h-9 rounded-md flex items-center justify-center bg-primary/10 border border-primary/20 glow-cyan-subtle">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-sm font-heading font-semibold tracking-tight text-foreground" data-testid="text-brand-name">
                NemesisAI
              </span>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Creator Suite</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = location === item.url || location.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomNavItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {user?.isAdmin && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/admin"}
                      data-testid="nav-admin"
                    >
                      <Link href="/admin">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Admin</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/diagnostics"}
                      data-testid="nav-diagnostics"
                    >
                      <Link href="/diagnostics">
                        <Activity className="w-4 h-4" />
                        <span>Diagnostics</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="glass-card rounded-md p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-heading font-medium">
              {user?.isPro ? "Pro Plan" : "Free Plan"}
            </span>
            {user?.isPro && (
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                Active
              </Badge>
            )}
          </div>
          {!user?.isPro && (
            <p className="text-[10px] text-muted-foreground">
              Upgrade for full access to all tools and templates.
            </p>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
