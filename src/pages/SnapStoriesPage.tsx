import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, MoreHorizontal, UserPlus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StoryViewer } from "@/components/StoryViewer";
import { PageTransition } from "@/components/PageTransition";

interface StoryGroup {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  stories: {
    id: string;
    content: string;
    imageUrl: string | null;
    backgroundColor: string;
    stickers: string[];
    createdAt: string;
  }[];
}

interface DiscoverCard {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  type: "subscription" | "discover";
}

const MOCK_DISCOVER: DiscoverCard[] = [
  { id: "1", title: "Top Books This Week", subtitle: "BookApp Originals", imageUrl: "", type: "subscription" },
  { id: "2", title: "Reading Challenge", subtitle: "Community", imageUrl: "", type: "subscription" },
  { id: "3", title: "Author Spotlight", subtitle: "Featured", imageUrl: "", type: "discover" },
  { id: "4", title: "New Releases", subtitle: "Trending", imageUrl: "", type: "discover" },
  { id: "5", title: "Book Club Picks", subtitle: "Weekly", imageUrl: "", type: "discover" },
  { id: "6", title: "Must Read Fiction", subtitle: "Editor's Choice", imageUrl: "", type: "discover" },
];

const CARD_COLORS = [
  "from-rose-500 to-pink-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-sky-600",
];

export default function SnapStoriesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const fetchStories = useCallback(async () => {
    const { data: storiesData } = await supabase
      .from("stories")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (!storiesData?.length) { setGroups([]); return; }

    const userIds = [...new Set(storiesData.map((s) => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    const groupMap = new Map<string, typeof storiesData>();
    storiesData.forEach((s) => {
      const existing = groupMap.get(s.user_id) || [];
      existing.push(s);
      groupMap.set(s.user_id, existing);
    });

    const storyGroups: StoryGroup[] = [];
    groupMap.forEach((stories, uid) => {
      const p = profileMap.get(uid);
      storyGroups.push({
        userId: uid,
        username: p?.username || "user",
        displayName: p?.display_name || "User",
        avatarUrl: p?.avatar_url || null,
        stories: stories.map((s) => ({
          id: s.id,
          content: s.content || "",
          imageUrl: s.image_url,
          backgroundColor: s.background_color || "#1a1a2e",
          stickers: Array.isArray(s.sticker_data) ? (s.sticker_data as any[]).map(String) : [],
          createdAt: s.created_at || new Date().toISOString(),
        })),
      });
    });

    // Put own stories first
    if (user) {
      storyGroups.sort((a, b) => {
        if (a.userId === user.id) return -1;
        if (b.userId === user.id) return 1;
        return 0;
      });
    }

    setGroups(storyGroups);
  }, [user]);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  const renderAvatar = (url: string | null, name: string, size = 64) => {
    const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    if (url) {
      return (
        <img
          src={url}
          alt={name}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      );
    }
    return (
      <div
        className="rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-white font-bold" style={{ fontSize: size * 0.32 }}>{initials}</span>
      </div>
    );
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background">
          <div className="flex items-center justify-between px-4 h-12 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/profile")} className="w-9 h-9">
                {renderAvatar(null, user?.email?.[0] || "U", 36)}
              </button>
            </div>
            <h1 className="text-lg font-bold text-foreground">Stories</h1>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                <Search className="w-4 h-4 text-foreground" />
              </button>
              <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-foreground" />
              </button>
              <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                <MoreHorizontal className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>
        </header>

        {/* Friends Stories Row */}
        <div className="px-4 pt-3 pb-1">
          <h2 className="text-base font-bold text-foreground mb-3">Friends</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto px-4 pb-4 no-scrollbar">
          {/* Add story */}
          <button
            onClick={() => navigate("/snap")}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                <Plus className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground w-16 truncate text-center">Add</span>
          </button>

          {groups.map((group, gi) => (
            <button
              key={group.userId}
              onClick={() => setActiveGroupIndex(gi)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div className="p-[2px] rounded-full bg-gradient-to-br from-[#FFFC00] via-[#FF6B35] to-[#FF3B30]">
                <div className="p-[2px] rounded-full bg-background">
                  {renderAvatar(group.avatarUrl, group.displayName, 56)}
                </div>
              </div>
              <span className="text-[11px] text-foreground w-16 truncate text-center font-medium">
                {user && group.userId === user.id ? "My Story" : group.username}
              </span>
            </button>
          ))}
        </div>

        {/* Subscriptions */}
        <div className="px-4 pt-2 pb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Subscriptions</h2>
          <button className="text-sm text-[#007AFF] font-medium">See All</button>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 pb-4 no-scrollbar">
          {MOCK_DISCOVER.filter((d) => d.type === "subscription").map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex-shrink-0 w-28 cursor-pointer"
            >
              <div className={`w-28 h-40 rounded-2xl bg-gradient-to-br ${CARD_COLORS[i % CARD_COLORS.length]} flex items-end p-3 shadow-lg`}>
                <div>
                  <p className="text-white text-xs font-bold leading-tight">{card.title}</p>
                  <p className="text-white/70 text-[10px] mt-0.5">{card.subtitle}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Discover */}
        <div className="px-4 pt-2 pb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Discover</h2>
          <button className="text-sm text-[#007AFF] font-medium">See All</button>
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 pb-6">
          {MOCK_DISCOVER.filter((d) => d.type === "discover").map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="cursor-pointer"
            >
              <div className={`w-full aspect-[3/4] rounded-2xl bg-gradient-to-br ${CARD_COLORS[(i + 2) % CARD_COLORS.length]} flex items-end p-4 shadow-lg`}>
                <div>
                  <p className="text-white text-sm font-bold leading-tight">{card.title}</p>
                  <p className="text-white/70 text-xs mt-1">{card.subtitle}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Story Viewer */}
        {activeGroupIndex !== null && groups.length > 0 && (
          <StoryViewer
            groups={groups}
            initialGroupIndex={activeGroupIndex}
            onClose={() => setActiveGroupIndex(null)}
            onDeleted={fetchStories}
          />
        )}
      </div>
    </PageTransition>
  );
}
