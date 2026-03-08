import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { StoryViewer } from "./StoryViewer";
import { StoryCreator } from "./StoryCreator";
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

// Instagram-style gradient ring colors per position
const ringGradients = [
  "from-yellow-400 via-red-500 to-purple-600",
  "from-pink-500 via-rose-500 to-orange-400",
  "from-amber-400 via-orange-500 to-red-500",
  "from-blue-400 via-purple-500 to-pink-500",
  "from-green-400 via-teal-500 to-blue-500",
];

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

    const groupMap = new Map<string, DBStory[]>();
    filtered.forEach((s) => {
      const existing = groupMap.get(s.user_id) || [];
      existing.push(s as DBStory);
      groupMap.set(s.user_id, existing);
    });

    const storyGroups: StoryGroup[] = [];

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
      <div className="flex gap-3.5 overflow-x-auto px-4 py-3 no-scrollbar">
        {/* Your Story */}
        {user && (
          <button
            onClick={() => setShowCreator(true)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="relative">
              <div className="w-[68px] h-[68px] rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground">
                You
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                <Plus className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
              </div>
            </div>
            <span className="text-[11px] text-foreground w-[72px] truncate text-center">Your story</span>
          </button>
        )}

        {groups.map((group, gi) => {
          const ini = (group.displayName || group.username).split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
          let storyOffset = 0;
          for (let i = 0; i < gi; i++) storyOffset += groups[i].stories.length;
          const gradient = ringGradients[gi % ringGradients.length];

          return (
            <button
              key={group.userId}
              onClick={() => setActiveGroup(storyOffset)}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              {/* Gradient ring */}
              <div className={`rounded-full p-[2.5px] bg-gradient-to-br ${gradient}`}>
                <div className="w-[64px] h-[64px] rounded-full bg-background p-[2px]">
                  <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
                    {ini}
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-foreground w-[72px] truncate text-center">
                {user && group.userId === user.id ? "Your story" : group.username}
              </span>
            </button>
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
