import { Home, Search, Film, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/search", icon: Search, label: "Search" },
  { path: "/reels", icon: Film, label: "Reels" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenPaths = ["/read/", "/auth", "/forgot-password", "/reset-password", "/welcome"];
  if (hiddenPaths.some((p) => location.pathname.startsWith(p)) || location.pathname === "/reels" || location.pathname.startsWith("/settings") || location.pathname.startsWith("/user/")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t border-border z-40">
      <div className="flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={active ? "bottom-nav-item-active" : "bottom-nav-item"}
            >
              <item.icon className="w-[22px] h-[22px]" strokeWidth={active ? 2 : 1.5} />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
