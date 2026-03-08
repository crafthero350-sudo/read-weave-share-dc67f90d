import { useState, useEffect, useCallback } from "react";
import { Heart, Plus, Send as SendIcon } from "lucide-react";
import { StoriesRow } from "@/components/StoriesRow";
import { PostCard, type PostData } from "@/components/PostCard";
import { CreatePostSheet } from "@/components/CreatePostSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import bookappLogo from "@/assets/bookapp-logo.png";

export default function HomeScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Instagram-style Header */}
      <header className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <img src={bookappLogo} alt="BookApp" className="w-7 h-7" />
            <h1 className="bookapp-title text-xl">BookApp</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowCreate(true)} className="p-2 text-foreground">
              <Plus className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <button className="p-2 text-foreground">
              <Heart className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <button className="p-2 text-foreground">
              <SendIcon className="w-6 h-6 -rotate-45" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Stories Row */}
      <StoriesRow />

      {/* Divider */}
      <div className="border-b border-border" />

      {/* Feed */}
      <div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-muted-foreground text-sm mb-1">No posts yet</p>
            <p className="text-muted-foreground text-xs">Be the first to share something!</p>
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
