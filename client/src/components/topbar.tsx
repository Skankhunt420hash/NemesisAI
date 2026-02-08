import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Crown,
  Globe,
  User,
  Settings,
  LogOut,
  LayoutDashboard,
  Hammer,
  Mic,
  Package,
  Activity,
  CreditCard,
  ShieldCheck,
  Wrench,
} from "lucide-react";

const commandItems = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard", group: "Navigation" },
  { title: "Forge", icon: Hammer, url: "/forge", group: "Navigation" },
  { title: "Voice Studio", icon: Mic, url: "/voice", group: "Navigation" },
  { title: "Exports", icon: Package, url: "/exports", group: "Navigation" },
  { title: "System", icon: Activity, url: "/system", group: "Navigation" },
  { title: "Settings", icon: Settings, url: "/settings", group: "Account" },
  { title: "Setup Wizard", icon: Wrench, url: "/settings/setup", group: "Account" },
  { title: "Billing", icon: CreditCard, url: "/billing", group: "Account" },
  { title: "Admin Panel", icon: ShieldCheck, url: "/admin", group: "Account" },
];

export function Topbar() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);
  const [lang, setLang] = useState<"EN" | "DE">("EN");

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setLocation("/");
  }, [logout, setLocation]);

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "U";

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between gap-4 h-14 px-4 border-b border-border/50 glass">
        <div className="flex items-center gap-3">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCommandOpen(true)}
            className="hidden sm:flex items-center gap-2 text-muted-foreground"
            data-testid="button-command-palette"
          >
            <Search className="w-4 h-4" />
            <span className="text-xs">Search...</span>
            <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-[10px]">&#8984;</span>K
            </kbd>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLang(lang === "EN" ? "DE" : "EN")}
            data-testid="button-lang-toggle"
          >
            <Globe className="w-4 h-4" />
          </Button>
          <Badge
            variant="outline"
            className="text-[10px] border-border/50 text-muted-foreground cursor-pointer select-none"
            onClick={() => setLang(lang === "EN" ? "DE" : "EN")}
            data-testid="text-lang-badge"
          >
            {lang}
          </Badge>

          {!user?.isPro && (
            <Link href="/billing">
              <Button size="sm" className="gap-1.5" data-testid="button-upgrade">
                <Crown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">Upgrade</span>
              </Button>
            </Link>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary border border-primary/20">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium truncate" data-testid="text-user-email">{user?.email}</p>
                <p className="text-[10px] text-muted-foreground">
                  {user?.isPro ? "Pro Plan" : "Free Plan"}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/profile")} data-testid="menu-profile">
                <User className="w-3.5 h-3.5 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/settings")} data-testid="menu-settings">
                <Settings className="w-3.5 h-3.5 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search pages, tools, commands..." data-testid="input-command-search" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {commandItems.filter(i => i.group === "Navigation").map((item) => (
              <CommandItem
                key={item.url}
                onSelect={() => {
                  setLocation(item.url);
                  setCommandOpen(false);
                }}
                data-testid={`command-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Account">
            {commandItems.filter(i => i.group === "Account").map((item) => (
              <CommandItem
                key={item.url}
                onSelect={() => {
                  setLocation(item.url);
                  setCommandOpen(false);
                }}
                data-testid={`command-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
