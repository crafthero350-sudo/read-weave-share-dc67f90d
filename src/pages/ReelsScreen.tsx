import { useState, useEffect, useRef, useCallback } from "react";
import { StoryCreator } from "@/components/StoryCreator";
import { ArrowLeft, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CommentPanel } from "@/components/CommentPanel";
import { CreateReelSheet } from "@/components/CreateReelSheet";
import { useNavigate } from "react-router-dom";
import { ReelCard, type ReelData } from "@/components/ReelCard";

export default function ReelsScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reels, setReels] = useState<ReelData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showStory, setShowStory] = useState(false);
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
        <div className="w-6 h-6 border-2 border-background/40 border-t-background rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollSnapType: "y mandatory", backgroundColor: "hsl(0 0% 0%)" }}
      >
        {/* Top bar */}
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 pointer-events-none">
          <button onClick={() => navigate("/")} className="pointer-events-auto p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-card-foreground drop-shadow-md" style={{ color: "white" }} strokeWidth={2} />
          </button>
          <h1 className="text-base font-bold drop-shadow-md" style={{ color: "white" }}>Reels</h1>
          <button onClick={() => setShowStory(true)} className="pointer-events-auto p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Camera className="w-5 h-5 drop-shadow-md" style={{ color: "white" }} strokeWidth={2} />
          </button>
        </div>

        {reels.length === 0 ? (
          <div className="h-screen snap-start flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>No reels yet</p>
              <button onClick={() => setShowStory(true)} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
                Create
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
      <StoryCreator open={showStory} onClose={() => setShowStory(false)} onCreated={fetchReels} />
    </>
  );
}
