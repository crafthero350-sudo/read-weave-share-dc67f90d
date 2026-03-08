import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
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
  const [likeCount, setLikeCount] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);

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

  const handleDoubleTapLike = () => {
    if (!liked) toggleLike();
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: false });
  const displayName = post.profile?.display_name || post.profile?.username || "User";
  const username = post.profile?.username || displayName;
  const initials = displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const hasImage = post.image_url || post.book?.cover_url;

  return (
    <>
      <article className="border-b border-border">
        {/* Header */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <button
            onClick={() => navigate(`/user/${post.user_id}`)}
            className="story-ring-active flex-shrink-0"
          >
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-foreground border-[1.5px] border-background">
              {initials}
            </div>
          </button>
          <button onClick={() => navigate(`/user/${post.user_id}`)} className="flex-1 text-left">
            <span className="text-[13px] font-semibold leading-none">{username}</span>
          </button>
          <button className="p-1">
            <MoreHorizontal className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>
        </div>

        {/* Image — full width, square aspect */}
        {hasImage && (
          <div
            className="w-full aspect-square bg-secondary"
            onDoubleClick={handleDoubleTapLike}
          >
            <img
              src={post.book?.cover_url || post.image_url || ""}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Actions — Instagram exact layout */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-4">
            <button onClick={toggleLike} className="active:scale-125 transition-transform">
              <Heart
                className={`w-6 h-6 transition-colors ${liked ? "fill-destructive text-destructive" : "text-foreground"}`}
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

        {/* Likes */}
        {likeCount > 0 && (
          <p className="px-3 text-[13px] font-semibold leading-tight">
            {likeCount.toLocaleString()} {likeCount === 1 ? "like" : "likes"}
          </p>
        )}

        {/* Caption */}
        <div className="px-3 mt-0.5">
          <p className="text-[13px] leading-snug">
            <span className="font-semibold mr-1.5">{username}</span>
            <span className={post.type === "quote" ? "italic" : ""}>{post.content}</span>
          </p>
        </div>

        {/* Book tag */}
        {post.book && (
          <p className="px-3 mt-1 text-[11px] text-muted-foreground">📖 {post.book.title} — {post.book.author}</p>
        )}

        {/* View comments */}
        {(post.comments_count || 0) > 0 && (
          <button onClick={() => setShowComments(true)} className="px-3 mt-1 block">
            <span className="text-[13px] text-muted-foreground">View all {post.comments_count} comments</span>
          </button>
        )}

        {/* Time */}
        <p className="px-3 pb-3 pt-1 text-[10px] text-muted-foreground uppercase">{timeAgo} ago</p>
      </article>

      <CommentPanel postId={post.id} open={showComments} onClose={() => { setShowComments(false); onRefresh?.(); }} />
    </>
  );
}
