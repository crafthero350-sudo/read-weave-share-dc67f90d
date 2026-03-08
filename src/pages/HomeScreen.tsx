import { useState, useEffect, useCallback } from "react";
import { Menu, Search } from "lucide-react";
import { StoriesRow } from "@/components/StoriesRow";
import { PostCard, type PostData } from "@/components/PostCard";
import { CreatePostSheet } from "@/components/CreatePostSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import bookappLogo from "@/assets/bookapp-logo.png";

export default function HomeScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchPosts = useCallback(async () => {
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
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
      profile: profileMap.get(p.user_id),
      book: p.book_id ? booksMap.get(p.book_id) || null : null,
      user_liked: likedPostIds.has(p.id),
      user_saved: savedPostIds.has(p.id),
    }));

    setPosts(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return (
    <div className="min-h-screen bg-background pb-14">
      {/* Threads-style Header */}
      <header className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <button className="p-1">
            <Menu className="w-6 h-6 text-foreground" strokeWidth={1.5} />
          </button>
          <h1 className="font-display text-[22px] font-bold italic tracking-tight">BookApp</h1>
          <button className="p-1">
            <Search className="w-6 h-6 text-foreground" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Stories */}
      <StoriesRow />
      <div className="border-b border-border" />

      {/* Composer hint */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
          You
        </div>
        <button onClick={() => setShowCreate(true)} className="flex-1 text-left">
          <span className="text-muted-foreground text-[15px]">What's new?</span>
        </button>
      </div>

      {/* Feed */}
      <div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-muted-foreground text-sm">No posts yet. Share your first book thought!</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-6 py-2 bg-foreground text-background rounded-full text-sm font-medium"
            >
              Create Post
            </button>
          </div>
        ) : (
          posts.map((post, i) => (
            <PostCard key={post.id} post={post} index={i} onRefresh={fetchPosts} />
          ))
        )}
      </div>

      <CreatePostSheet open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchPosts} />
    </div>
  );
}
