import { Link, useLocation } from "wouter";
import { Sparkles, Library, User, Settings } from "lucide-react";

const navItems = [
  { href: "/forge", icon: Sparkles, label: "Forge" },
  { href: "/archive", icon: Library, label: "Archive" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav md:hidden safe-area-pb" data-testid="nav-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all ${
                  isActive
                    ? "text-primary bg-violet-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-violet-500/10"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className={`w-5 h-5 mb-1 ${isActive ? "neon-purple-glow" : ""}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
