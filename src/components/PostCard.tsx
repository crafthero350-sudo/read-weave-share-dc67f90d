import { useState, useRef } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CommentPanel } from "./CommentPanel";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export interface PostData {
  id: string;
  type: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  book_id: string | null;
  image_url?: string | null;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null };
  book?: { title: string; author: string; cover_url: string | null } | null;
  user_liked?: boolean;
  user_saved?: boolean;
}

interface PostCardProps {
  post: PostData;
  index: number;
  onRefresh?: () => void;
}

export function PostCard({ post, index, onRefresh }: PostCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.user_liked || false);
  const [saved, setSaved] = useState(post.user_saved || false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleLike = async () => {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => (newLiked ? c + 1 : c - 1));
    if (newLiked) {
      await supabase.from("likes").insert({ user_id: user.id, post_id: post.id });
    } else {
      await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", post.id);
    }
  };

  const toggleSave = async () => {
    if (!user) return;
    const newSaved = !saved;
    setSaved(newSaved);
    if (newSaved) {
      await supabase.from("bookmarks").insert({ user_id: user.id, post_id: post.id });
      toast.success("Saved");
    } else {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", post.id);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share?.({ title: `Post by ${post.profile?.display_name || "User"}`, text: post.content.slice(0, 100), url: window.location.origin });
    } catch {
      await navigator.clipboard?.writeText(post.content);
      toast.success("Copied to clipboard");
    }
  };

  const handleDoubleTap = () => {
    if (!liked && user) {
      toggleLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: false });
  const displayName = post.profile?.display_name || post.profile?.username || "User";
  const username = post.profile?.username || displayName;
  const initials = displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const avatarUrl = post.profile?.avatar_url;

  const hasImage = post.image_url || post.book?.cover_url;

  return (
    <>
      <article className="border-b border-border">
        {/* Header — avatar + username + time + more */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <button
            onClick={() => navigate(`/user/${post.user_id}`)}
            className="flex-shrink-0"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={username}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-foreground ring-1 ring-border">
                {initials}
              </div>
            )}
          </button>
          <button onClick={() => navigate(`/user/${post.user_id}`)} className="flex items-center gap-1.5 flex-1 text-left">
            <span className="text-[13px] font-semibold text-foreground">{username}</span>
            <span className="text-[12px] text-muted-foreground">• {timeAgo}</span>
          </button>
          <button className="p-1">
            <MoreHorizontal className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>
        </div>

        {/* Image — full width */}
        {hasImage && (
          <div
            className="w-full aspect-square bg-muted relative select-none"
            onDoubleClick={handleDoubleTap}
          >
            <img
              src={post.image_url || post.book?.cover_url || ""}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Double-tap heart animation */}
            {showHeart && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart className="w-20 h-20 text-white fill-white animate-scale-in drop-shadow-lg" />
              </div>
            )}
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-4">
            <button onClick={toggleLike} className="active:scale-110 transition-transform">
              <Heart
                className={`w-6 h-6 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-foreground"}`}
                strokeWidth={1.5}
              />
            </button>
            <button onClick={() => setShowComments(true)}>
              <MessageCircle className="w-6 h-6 text-foreground" strokeWidth={1.5} />
            </button>
            <button onClick={handleShare}>
              <Send className="w-6 h-6 text-foreground -rotate-[20deg]" strokeWidth={1.5} />
            </button>
          </div>
          <button onClick={toggleSave} className="active:scale-110 transition-transform">
            <Bookmark
              className={`w-6 h-6 transition-colors ${saved ? "fill-foreground text-foreground" : "text-foreground"}`}
              strokeWidth={1.5}
            />
          </button>
        </div>

        {/* Likes count */}
        {likeCount > 0 && (
          <p className="px-3 text-[13px] font-semibold leading-tight text-foreground">
            {likeCount.toLocaleString()} {likeCount === 1 ? "like" : "likes"}
          </p>
        )}

        {/* Caption */}
        <div className="px-3 mt-0.5">
          <p className="text-[13px] leading-snug text-foreground">
            <span className="font-semibold mr-1.5">{username}</span>
            <span>{post.content}</span>
            {post.book && (
              <span className="text-muted-foreground"> #{post.book.title.replace(/\s+/g, '')}</span>
            )}
          </p>
        </div>

        {/* View comments */}
        {(post.comments_count || 0) > 0 && (
          <button onClick={() => setShowComments(true)} className="px-3 mt-1 block">
            <span className="text-[13px] text-muted-foreground">
              View all {post.comments_count} comment{post.comments_count !== 1 ? "s" : ""}
            </span>
          </button>
        )}

        {/* Time */}
        <p className="px-3 pb-3 pt-1 text-[10px] text-muted-foreground uppercase">{timeAgo} ago</p>
      </article>

      <CommentPanel postId={post.id} open={showComments} onClose={() => { setShowComments(false); onRefresh?.(); }} />
    </>
  );
}
