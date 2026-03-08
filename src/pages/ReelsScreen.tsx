import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, MessageCircle, Bookmark, Share, Plus, UserPlus, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/hooks/useFollow";
import { CommentPanel } from "@/components/CommentPanel";
import { CreateReelSheet } from "@/components/CreateReelSheet";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ReelData {
  id: string;
  content: string;
  type: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  image_url: string | null;
  book_id: string | null;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null };
  book?: { title: string; author: string; cover_url: string | null } | null;
  user_liked?: boolean;
  user_saved?: boolean;
}

export default function ReelsScreen() {
  const { user } = useAuth();
  const [reels, setReels] = useState<ReelData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchReels = useCallback(async () => {
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!postsData?.length) { setReels([]); setLoading(false); return; }

    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const bookIds = postsData.map((p) => p.book_id).filter(Boolean) as string[];

    const [profilesRes, booksRes, likesRes, bookmarksRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", userIds),
      bookIds.length > 0
        ? supabase.from("books").select("id, title, author, cover_url").in("id", bookIds)
        : Promise.resolve({ data: [] }),
      user
        ? supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postsData.map((p) => p.id))
        : Promise.resolve({ data: [] }),
      user
        ? supabase.from("bookmarks").select("post_id").eq("user_id", user.id).in("post_id", postsData.map((p) => p.id))
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map<string, any>(profilesRes.data?.map((p) => [p.user_id, p] as [string, any]) || []);
    const booksMap = new Map<string, any>(booksRes.data?.map((b) => [b.id, b] as [string, any]) || []);
    const likedIds = new Set(likesRes.data?.map((l: any) => l.post_id) || []);
    const savedIds = new Set(bookmarksRes.data?.map((b: any) => b.post_id) || []);

    setReels(postsData.map((p) => ({
      ...p,
      profile: profileMap.get(p.user_id),
      book: p.book_id ? booksMap.get(p.book_id) || null : null,
      user_liked: likedIds.has(p.id),
      user_saved: savedIds.has(p.id),
    } as ReelData)));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchReels(); }, [fetchReels]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    setCurrentIndex(Math.round(scrollTop / height));
  };

  if (loading) {
    return (
      <div className="h-screen bg-foreground flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen overflow-y-scroll snap-y snap-mandatory bg-foreground"
        style={{ scrollSnapType: "y mandatory" }}
      >
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 pointer-events-none">
          <button onClick={() => navigate("/")} className="pointer-events-auto">
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-primary-foreground">Reels</h1>
          <button onClick={() => setShowCreate(true)} className="p-2 pointer-events-auto">
            <Plus className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>

        {reels.length === 0 ? (
          <div className="h-screen snap-start flex items-center justify-center">
            <div className="text-center">
              <p className="text-primary-foreground/60 text-sm">No reels yet</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 px-4 py-2 bg-primary-foreground text-foreground rounded-full text-sm font-medium">
                Create First Reel
              </button>
            </div>
          </div>
        ) : (
          reels.map((reel, i) => (
            <ReelCard key={reel.id} reel={reel} isActive={i === currentIndex} onComment={() => setShowComments(true)} onRefresh={fetchReels} />
          ))
        )}
      </div>

      {reels[currentIndex] && (
        <CommentPanel postId={reels[currentIndex].id} open={showComments} onClose={() => { setShowComments(false); fetchReels(); }} />
      )}

      <CreateReelSheet open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchReels} />
    </>
  );
}

function ReelCard({ reel, isActive, onComment, onRefresh }: { reel: ReelData; isActive: boolean; onComment: () => void; onRefresh: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(reel.user_liked || false);
  const [saved, setSaved] = useState(reel.user_saved || false);
  const [likeCount, setLikeCount] = useState(reel.likes_count || 0);
  const { status, toggleFollow } = useFollow(user?.id !== reel.user_id ? reel.user_id : null);

  const toggleLike = async () => {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => newLiked ? c + 1 : c - 1);
    if (newLiked) {
      await supabase.from("likes").insert({ user_id: user.id, post_id: reel.id });
    } else {
      await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", reel.id);
    }
  };

  const toggleSave = async () => {
    if (!user) return;
    setSaved(!saved);
    if (!saved) {
      await supabase.from("bookmarks").insert({ user_id: user.id, post_id: reel.id });
    } else {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", reel.id);
    }
  };

  const initials = (reel.profile?.display_name || reel.profile?.username || "?")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const gradients: Record<string, string> = {
    quote: "from-stone-900 via-stone-800 to-stone-950",
    review: "from-zinc-900 via-neutral-800 to-zinc-950",
    recommendation: "from-neutral-900 via-stone-800 to-neutral-950",
    discussion: "from-gray-900 via-zinc-800 to-gray-950",
  };

  return (
    <div className="h-screen snap-start relative flex flex-col justify-end">
      <div className={`absolute inset-0 bg-gradient-to-b ${gradients[reel.type] || gradients.quote}`}>
        {reel.image_url && <img src={reel.image_url} alt="" className="w-full h-full object-cover opacity-40" />}
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-12 pt-16 pb-48">
        <p className={`text-primary-foreground text-center leading-relaxed ${reel.type === "quote" ? "text-xl font-light italic" : "text-base"}`}>
          {reel.content.length > 200 ? reel.content.slice(0, 200) + "..." : reel.content}
        </p>
      </div>

      {/* Right side actions */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
        {/* Profile avatar with follow */}
        <div className="relative">
          <button
            onClick={() => navigate(`/user/${reel.user_id}`)}
            className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-medium text-primary-foreground"
          >
            {initials}
          </button>
          {user && user.id !== reel.user_id && status !== "following" && (
            <button
              onClick={toggleFollow}
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary-foreground flex items-center justify-center"
            >
              <Plus className="w-3 h-3 text-foreground" />
            </button>
          )}
        </div>

        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <Heart className={`w-7 h-7 ${liked ? "fill-primary-foreground text-primary-foreground" : "text-primary-foreground"}`} />
          <span className="text-[11px] text-primary-foreground font-medium">{likeCount}</span>
        </button>
        <button onClick={onComment} className="flex flex-col items-center gap-1">
          <MessageCircle className="w-7 h-7 text-primary-foreground" />
          <span className="text-[11px] text-primary-foreground font-medium">{reel.comments_count || 0}</span>
        </button>
        <button><Share className="w-6 h-6 text-primary-foreground" /></button>
        <button onClick={toggleSave}>
          <Bookmark className={`w-6 h-6 ${saved ? "fill-primary-foreground text-primary-foreground" : "text-primary-foreground"}`} />
        </button>
      </div>

      {/* Bottom info */}
      <div className="relative z-10 px-4 pb-24">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(`/user/${reel.user_id}`)} className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary-foreground">{reel.profile?.display_name || reel.profile?.username || "User"}</span>
          </button>
          {user && user.id !== reel.user_id && (
            <button
              onClick={toggleFollow}
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                status === "following" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary-foreground text-foreground"
              }`}
            >
              {status === "following" ? "Following" : status === "requested" ? "Requested" : "Follow"}
            </button>
          )}
        </div>

        {reel.book && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-primary-foreground/70">📖 {reel.book.title} — {reel.book.author}</span>
          </div>
        )}

        <p className="text-xs text-primary-foreground/50">
          {formatDistanceToNow(new Date(reel.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
