import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { StoryViewer } from "./StoryViewer";
import { StoryCreator } from "./StoryCreator";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface StoryGroup {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  stories: DBStory[];
}

interface DBStory {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  background_color: string;
  text_style: string;
  sticker_data: any;
  privacy: string;
  created_at: string;
  expires_at: string;
}

export function StoriesRow() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<number | null>(null);
  const [showCreator, setShowCreator] = useState(false);

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

    // Filter by privacy: show stories from followed users + own
    let followingIds = new Set<string>();
    let closeFriendIds = new Set<string>();
    if (user) {
      const [followsRes, cfRes] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", user.id),
        supabase.from("close_friends").select("user_id").eq("friend_id", user.id),
      ]);
      followsRes.data?.forEach((f) => followingIds.add(f.following_id));
      cfRes.data?.forEach((f) => closeFriendIds.add(f.user_id));
    }

    const filtered = storiesData.filter((s) => {
      if (user && s.user_id === user.id) return true;
      if (s.privacy === "everyone") return true;
      if (s.privacy === "followers" && followingIds.has(s.user_id)) return true;
      if (s.privacy === "close_friends" && closeFriendIds.has(s.user_id)) return true;
      return false;
    });

    // Group by user
    const groupMap = new Map<string, DBStory[]>();
    filtered.forEach((s) => {
      const existing = groupMap.get(s.user_id) || [];
      existing.push(s as DBStory);
      groupMap.set(s.user_id, existing);
    });

    const storyGroups: StoryGroup[] = [];

    // Own stories first
    if (user && groupMap.has(user.id)) {
      const p = profileMap.get(user.id);
      storyGroups.push({
        userId: user.id,
        username: p?.username || "you",
        displayName: p?.display_name || "Your Story",
        avatarUrl: p?.avatar_url,
        stories: groupMap.get(user.id)!,
      });
    }

    groupMap.forEach((stories, uid) => {
      if (user && uid === user.id) return;
      const p = profileMap.get(uid);
      storyGroups.push({
        userId: uid,
        username: p?.username || "user",
        displayName: p?.display_name || "User",
        avatarUrl: p?.avatar_url,
        stories,
      });
    });

    setGroups(storyGroups);
  }, [user]);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  // Convert groups to flat story array for viewer
  const allStories = groups.flatMap((g) =>
    g.stories.map((s) => ({
      id: s.id,
      username: g.username,
      avatar: (g.displayName || g.username).split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2),
      content: s.content || "",
      type: "quote" as const,
      bookTitle: undefined,
      imageUrl: s.image_url,
      backgroundColor: s.background_color,
      stickers: s.sticker_data,
    }))
  );

  return (
    <>
      <div className="flex gap-4 overflow-x-auto px-4 py-3 scrollbar-hide">
        {/* Create story button */}
        {user && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setShowCreator(true)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="text-[11px] text-muted-foreground w-16 truncate text-center">Your Story</span>
          </motion.button>
        )}

        {groups.map((group, gi) => {
          const ini = (group.displayName || group.username).split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
          // Calculate index offset
          let storyOffset = 0;
          for (let i = 0; i < gi; i++) storyOffset += groups[i].stories.length;

          return (
            <motion.button
              key={group.userId}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (gi + 1) * 0.05 }}
              onClick={() => setActiveGroup(storyOffset)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div className="story-ring-active">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground">
                  {ini}
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground w-16 truncate text-center">
                {user && group.userId === user.id ? "Your Story" : group.username}
              </span>
            </motion.button>
          );
        })}
      </div>

      {activeGroup !== null && allStories.length > 0 && (
        <StoryViewer
          stories={allStories as any}
          initialIndex={activeGroup}
          onClose={() => setActiveGroup(null)}
        />
      )}

      <StoryCreator
        open={showCreator}
        onClose={() => setShowCreator(false)}
        onCreated={fetchStories}
      />
    </>
  );
}
