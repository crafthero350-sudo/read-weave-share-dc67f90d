import { Home, Search, Film, Plus, Heart, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/search", icon: Search, label: "Search" },
  { path: "/reels", icon: Film, label: "Reels" },
  { path: "/create", icon: Plus, label: "Create" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenPaths = ["/read/", "/auth", "/forgot-password", "/reset-password", "/welcome"];
  if (hiddenPaths.some((p) => location.pathname.startsWith(p)) || location.pathname === "/reels" || location.pathname.startsWith("/settings") || location.pathname.startsWith("/user/")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
      <div className="flex items-center justify-around py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const isCreate = item.label === "Create";
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center w-12 h-10"
            >
              {isCreate ? (
                <div className="w-7 h-7 rounded-lg border-2 border-foreground flex items-center justify-center">
                  <Plus className="w-4 h-4 text-foreground" strokeWidth={2.5} />
                </div>
              ) : (
                <item.icon
                  className={`w-[26px] h-[26px] ${active ? "text-foreground" : "text-muted-foreground"}`}
                  strokeWidth={active ? 2 : 1.5}
                  fill={active && item.icon === Home ? "currentColor" : "none"}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
