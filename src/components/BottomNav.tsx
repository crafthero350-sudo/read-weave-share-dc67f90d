import { Home, Search, PlusSquare, Heart, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { CreatePostSheet } from "./CreatePostSheet";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/search", icon: Search, label: "Search" },
  { path: "create", icon: PlusSquare, label: "" },
  { path: "/reels", icon: Heart, label: "Activity" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const hiddenPaths = ["/read/", "/auth", "/forgot-password", "/reset-password", "/welcome"];
  if (hiddenPaths.some((p) => location.pathname.startsWith(p)) || location.pathname === "/reels" || location.pathname.startsWith("/settings") || location.pathname.startsWith("/user/")) return null;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
        <div className="flex items-center justify-around py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          {navItems.map((item) => {
            const isCreate = item.path === "create";
            const active = !isCreate && location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => isCreate ? setShowCreate(true) : navigate(item.path)}
                className="flex flex-col items-center justify-center w-12 h-10"
              >
                <item.icon
                  className={`w-6 h-6 ${active ? "text-foreground" : "text-foreground/70"}`}
                  strokeWidth={active ? 2.2 : 1.5}
                  fill={active && item.icon === Home ? "currentColor" : "none"}
                />
              </button>
            );
          })}
        </div>
      </nav>
      <CreatePostSheet open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => {}} />
    </>
  );
}
