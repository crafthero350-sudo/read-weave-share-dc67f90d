import { useState } from "react";
import { Heart, MessageCircle, Bookmark, Send, Plus, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/hooks/useFollow";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export interface ReelData {
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

interface ReelCardProps {
  reel: ReelData;
  isActive: boolean;
  onComment: () => void;
  onRefresh: () => void;
}

export function ReelCard({ reel, isActive, onComment, onRefresh }: ReelCardProps) {
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
    const newSaved = !saved;
    setSaved(newSaved);
    if (newSaved) {
      await supabase.from("bookmarks").insert({ user_id: user.id, post_id: reel.id });
      toast.success("Saved");
    } else {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", reel.id);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share?.({ title: "Reel", text: reel.content.slice(0, 100), url: window.location.origin });
    } catch {
      await navigator.clipboard?.writeText(reel.content);
      toast.success("Copied to clipboard");
    }
  };

  const initials = (reel.profile?.display_name || reel.profile?.username || "?")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const formatCount = (n: number) => n >= 1000000 ? (n / 1000000).toFixed(1) + "M" : n >= 1000 ? (n / 1000).toFixed(1) + "K" : n.toString();

  return (
    <div className="h-screen snap-start relative flex flex-col justify-end overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        {reel.image_url && <img src={reel.image_url} alt="" className="w-full h-full object-cover" />}
        {reel.book?.cover_url && !reel.image_url && (
          <img src={reel.book.cover_url} alt="" className="w-full h-full object-cover blur-sm scale-110 opacity-60" />
        )}
        {!reel.image_url && !reel.book?.cover_url && (
          <div className="w-full h-full bg-gradient-to-b from-neutral-900 via-neutral-800 to-black" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
      </div>

      {/* Right side actions */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
        {/* Avatar */}
        <div className="relative mb-1">
          <button
            onClick={() => navigate(`/user/${reel.user_id}`)}
            className="w-11 h-11 rounded-full flex items-center justify-center text-[12px] font-semibold border-2 overflow-hidden"
            style={{ borderColor: "white", color: "white" }}
          >
            {reel.profile?.avatar_url ? (
              <img src={reel.profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/20 backdrop-blur-sm flex items-center justify-center">{initials}</div>
            )}
          </button>
          {user && user.id !== reel.user_id && status !== "following" && (
            <button
              onClick={toggleFollow}
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2"
              style={{ borderColor: "black" }}
            >
              <Plus className="w-3 h-3" style={{ color: "white" }} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Like */}
        <button onClick={toggleLike} className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center">
          <Heart className={`w-7 h-7 drop-shadow-md ${liked ? "fill-destructive text-destructive" : ""}`} style={!liked ? { color: "white" } : {}} strokeWidth={1.5} />
          <span className="text-[12px] font-semibold drop-shadow-md" style={{ color: "white" }}>{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button onClick={onComment} className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center">
          <MessageCircle className="w-7 h-7 drop-shadow-md" style={{ color: "white" }} strokeWidth={1.5} />
          <span className="text-[12px] font-semibold drop-shadow-md" style={{ color: "white" }}>{formatCount(reel.comments_count || 0)}</span>
        </button>

        {/* Share */}
        <button onClick={handleShare} className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center">
          <Send className="w-7 h-7 -rotate-[25deg] drop-shadow-md" style={{ color: "white" }} strokeWidth={1.5} />
        </button>

        {/* Save */}
        <button onClick={toggleSave} className="min-w-[44px] min-h-[44px] flex items-center justify-center">
          <Bookmark className={`w-7 h-7 drop-shadow-md ${saved ? "fill-white" : ""}`} style={{ color: "white" }} strokeWidth={1.5} />
        </button>

        {/* More */}
        <button className="min-w-[44px] min-h-[44px] flex items-center justify-center">
          <MoreHorizontal className="w-6 h-6 drop-shadow-md" style={{ color: "white" }} strokeWidth={1.5} />
        </button>
      </div>

      {/* Bottom info */}
      <div className="relative z-10 px-4 pb-8 pr-16">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => navigate(`/user/${reel.user_id}`)} className="text-[14px] font-bold drop-shadow-md" style={{ color: "white" }}>
            {reel.profile?.username || reel.profile?.display_name || "user"}
          </button>
          {user && user.id !== reel.user_id && (
            <button
              onClick={toggleFollow}
              className={`text-xs font-semibold px-3 py-1 rounded-lg border backdrop-blur-sm ${
                status === "following"
                  ? "bg-white/10 border-white/20"
                  : "bg-white/20 border-white/30"
              }`}
              style={{ color: "white" }}
            >
              {status === "following" ? "Following" : status === "requested" ? "Requested" : "Follow"}
            </button>
          )}
        </div>

        <p className="text-[13px] leading-[1.4] line-clamp-2 mb-1.5 drop-shadow-md" style={{ color: "rgba(255,255,255,0.9)" }}>
          {reel.content.slice(0, 120)}
        </p>

        {reel.book && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
            <span className="text-[11px] font-medium drop-shadow-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
              📖 {reel.book.title} · {reel.book.author}
            </span>
          </div>
        )}
      </div>

      {/* Bottom comment input */}
      <div className="relative z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <button
          onClick={onComment}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full border backdrop-blur-sm"
          style={{ borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.1)" }}
        >
          <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>Comments...</span>
          <Send className="w-4 h-4 ml-auto -rotate-[25deg]" style={{ color: "rgba(255,255,255,0.5)" }} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
