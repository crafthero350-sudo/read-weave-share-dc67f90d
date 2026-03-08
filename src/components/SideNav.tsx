import { Home, Search, BookOpen, Film, Heart, PlusSquare, User, Menu, Send } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { CreatePostSheet } from "@/components/CreatePostSheet";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import bookappLogo from "@/assets/bookapp-logo.png";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/search", icon: Search, label: "Search" },
  { path: "/reading", icon: BookOpen, label: "Reading" },
  { path: "/reels", icon: Film, label: "Reels" },
  { path: "/messages", icon: Send, label: "Messages" },
  { path: "/notifications", icon: Heart, label: "Notifications" },
  { path: "create", icon: PlusSquare, label: "Create" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function SideNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const unreadCount = useUnreadMessages();

  const hiddenPaths = ["/auth", "/forgot-password", "/reset-password", "/welcome", "/setup"];
  if (hiddenPaths.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <>
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-[72px] xl:w-[220px] border-r border-border bg-background flex-col z-50 transition-all">
        {/* Logo */}
        <div className="flex items-center h-[72px] px-3 xl:px-5">
          <h1
            className="hidden xl:block text-xl font-bold italic tracking-tight text-foreground"
            style={{ fontFamily: "'Merriweather', serif" }}
          >
            BookApp
          </h1>
          <img src={bookappLogo} alt="BookApp" className="xl:hidden w-7 h-7 rounded" />
        </div>

        {/* Nav Items */}
        <div className="flex-1 flex flex-col gap-1 px-2 xl:px-3">
          {navItems.map((item) => {
            const active = item.path !== "create" && location.pathname === item.path;
            const isCreate = item.path === "create";

            return (
              <button
                key={item.label}
                onClick={() => {
                  if (isCreate) {
                    setShowCreate(true);
                  } else {
                    navigate(item.path);
                  }
                }}
                className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-colors group hover:bg-accent ${
                  active ? "font-semibold" : ""
                }`}
              >
                <item.icon
                  className={`w-[26px] h-[26px] flex-shrink-0 ${
                    active ? "text-foreground" : "text-foreground/70"
                  } group-hover:text-foreground transition-colors`}
                  strokeWidth={active ? 2.2 : 1.5}
                  fill={active && item.icon === Home ? "currentColor" : "none"}
                />
                <span
                  className={`hidden xl:block text-[15px] ${
                    active ? "text-foreground font-semibold" : "text-foreground/70"
                  } group-hover:text-foreground transition-colors`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* More */}
        <div className="px-2 xl:px-3 pb-6">
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-4 px-3 py-3 rounded-lg transition-colors group hover:bg-accent w-full"
          >
            <Menu className="w-[26px] h-[26px] text-foreground/70 group-hover:text-foreground" strokeWidth={1.5} />
            <span className="hidden xl:block text-[15px] text-foreground/70 group-hover:text-foreground">More</span>
          </button>
        </div>
      </nav>

      <CreatePostSheet open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => setShowCreate(false)} />
    </>
  );
}
