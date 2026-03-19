import { Home, Search, BookOpen, Film, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/search", icon: Search, label: "Search" },
  { path: "/reels", icon: Film, label: "Loops", isCenter: true },
  { path: "/library", icon: BookOpen, label: "Library" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenPaths = ["/read/", "/auth", "/forgot-password", "/reset-password", "/welcome", "/setup"];
  if (hiddenPaths.some((p) => location.pathname.startsWith(p)) || location.pathname === "/reels" || location.pathname.startsWith("/settings") || location.pathname.startsWith("/user/") || location.pathname.startsWith("/chat/") || location.pathname === "/messages") return null;

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-40 md:hidden">
      <div className="mx-auto max-w-lg rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-lg">
        <div className="flex items-center justify-around py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          {navItems.map((item) => {
            const active = location.pathname === item.path;

            if (item.isCenter) {
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center justify-center -mt-4"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md ${active ? "bg-primary" : "bg-primary"}`}>
                    <item.icon className="w-[22px] h-[22px] text-primary-foreground" strokeWidth={2} />
                  </div>
                  <span className={`text-[9px] leading-tight mt-0.5 ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center gap-0.5 min-w-[48px] py-1.5"
              >
                <item.icon
                  className={`w-[22px] h-[22px] transition-colors ${active ? "text-foreground" : "text-muted-foreground"}`}
                  strokeWidth={active ? 2.2 : 1.5}
                  fill={active && item.icon === Home ? "currentColor" : "none"}
                />
                <span className={`text-[9px] leading-tight transition-colors ${active ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
