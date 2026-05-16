import { useState, useEffect, useCallback } from "react";
import { Heart, Send, PlusSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StoriesRow } from "@/components/StoriesRow";
import { PostCard, type PostData } from "@/components/PostCard";
import { CreatePostSheet } from "@/components/CreatePostSheet";
import { StoryCreator } from "@/components/StoryCreator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

export default function HomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const unreadCount = useUnreadMessages();

  const fetchPosts = useCallback(async () => {
    const { data: postsData } = await supabase
      .from("posts")
      .select("*, updated_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", userIds);

    const bookIds = postsData.map((p) => p.book_id).filter(Boolean) as string[];
    let booksMap = new Map();
    if (bookIds.length > 0) {
      const { data: booksData } = await supabase
        .from("books")
        .select("id, title, author, cover_url")
        .in("id", bookIds);
      booksData?.forEach((b) => booksMap.set(b.id, b));
    }

    let likedPostIds = new Set<string>();
    let savedPostIds = new Set<string>();
    if (user) {
      const postIds = postsData.map((p) => p.id);
      const [likesRes, bookmarksRes] = await Promise.all([
        supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds),
        supabase.from("bookmarks").select("post_id").eq("user_id", user.id).in("post_id", postIds),
      ]);
      likesRes.data?.forEach((l) => likedPostIds.add(l.post_id!));
      bookmarksRes.data?.forEach((b) => savedPostIds.add(b.post_id));
    }

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    const enriched: PostData[] = postsData.map((p) => ({
      ...p,
      likes_count: p.likes_count || 0,
      comments_count: p.comments_count || 0,
      updated_at: p.updated_at,
      profile: profileMap.get(p.user_id),
      book: p.book_id ? booksMap.get(p.book_id) || null : null,
      user_liked: likedPostIds.has(p.id),
      user_saved: savedPostIds.has(p.id),
    }));

    setPosts(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header — iOS Apple Books style */}
      <header className="sticky top-0 z-30 ios-glass">
        <div className="flex items-end justify-between px-5 pt-3 pb-2">
          <h1 className="ios-large-title font-serif">
            Read<span className="sr-only"> — Social network for book lovers</span>
          </h1>
          <div className="flex items-center gap-1 md:hidden">
            <button aria-label="Create story" onClick={() => setShowStoryCreator(true)} className="ios-press w-11 h-11 rounded-full bg-secondary/70 flex items-center justify-center">
              <PlusSquare className="w-[20px] h-[20px] text-foreground" strokeWidth={1.7} />
            </button>
            <button aria-label="Notifications" onClick={() => navigate("/notifications")} className="ios-press w-11 h-11 rounded-full bg-secondary/70 flex items-center justify-center">
              <Heart className="w-[20px] h-[20px] text-foreground" strokeWidth={1.7} />
            </button>
            <button aria-label="Messages" onClick={() => navigate("/messages")} className="ios-press relative w-11 h-11 rounded-full bg-secondary/70 flex items-center justify-center">
              <Send className="w-[20px] h-[20px] text-foreground -rotate-[20deg]" strokeWidth={1.7} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Stories */}
      <StoriesRow />

      {/* Feed */}
      <div className="px-4 pt-3 space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="ios-card text-center py-16 px-6 animate-spring-in">
            <p className="text-muted-foreground text-[15px]">No posts yet. Share your first book thought.</p>
            <button
              onClick={() => setShowStoryCreator(true)}
              className="ios-press mt-5 px-7 py-3 bg-primary text-primary-foreground rounded-full text-[15px] font-semibold"
            >
              Create your first post
            </button>
          </div>
        ) : (
          posts.map((post, i) => (
            <PostCard key={post.id} post={post} index={i} onRefresh={fetchPosts} />
          ))
        )}
      </div>

      <CreatePostSheet open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchPosts} />
      <StoryCreator open={showStoryCreator} onClose={() => setShowStoryCreator(false)} onCreated={fetchPosts} />
    </div>
  );
}
