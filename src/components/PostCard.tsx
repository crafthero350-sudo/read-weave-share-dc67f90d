import { useState } from "react";
import { Heart, MessageCircle, Repeat2, Send, MoreHorizontal } from "lucide-react";
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
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
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

  const handleShare = async () => {
    try {
      await navigator.share?.({ title: `Post by ${post.profile?.display_name || "User"}`, text: post.content.slice(0, 100), url: window.location.origin });
    } catch {
      await navigator.clipboard?.writeText(post.content);
      toast.success("Copied to clipboard");
    }
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: false });
  const displayName = post.profile?.display_name || post.profile?.username || "User";
  const username = post.profile?.username || displayName;
  const initials = displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <article className="border-b border-border px-4 py-3">
        <div className="flex gap-3">
          {/* Left column: avatar + thread line */}
          <div className="flex flex-col items-center flex-shrink-0">
            <button onClick={() => navigate(`/user/${post.user_id}`)}>
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-foreground ring-1 ring-border">
                {initials}
              </div>
            </button>
            {/* Thread line */}
            <div className="w-[2px] flex-1 bg-border mt-2 min-h-[16px]" />
          </div>

          {/* Right column: content */}
          <div className="flex-1 min-w-0">
            {/* Username + time + more */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => navigate(`/user/${post.user_id}`)}>
                  <span className="text-[15px] font-semibold leading-none">{username}</span>
                </button>
                <span className="text-muted-foreground text-[14px]">{timeAgo}</span>
              </div>
              <button className="p-0.5">
                <MoreHorizontal className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </button>
            </div>

            {/* Content text */}
            <p className="text-[15px] leading-snug mt-0.5 text-foreground">
              {post.content}
              {post.book && (
                <span className="text-muted-foreground"> #{post.book.title.replace(/\s+/g, '')}</span>
              )}
            </p>

            {/* Image if any */}
            {(post.image_url || post.book?.cover_url) && (
              <div className="mt-2 rounded-xl overflow-hidden border border-border">
                <img
                  src={post.book?.cover_url || post.image_url || ""}
                  alt=""
                  className="w-full max-h-[300px] object-cover"
                  draggable={false}
                />
              </div>
            )}

            {/* Actions row — Threads style */}
            <div className="flex items-center gap-4 mt-2.5">
              <button onClick={toggleLike} className="active:scale-110 transition-transform">
                <Heart
                  className={`w-[20px] h-[20px] transition-colors ${liked ? "fill-red-500 text-red-500" : "text-foreground"}`}
                  strokeWidth={1.5}
                />
              </button>
              <button onClick={() => setShowComments(true)}>
                <MessageCircle className="w-[20px] h-[20px] text-foreground" strokeWidth={1.5} />
              </button>
              <button>
                <Repeat2 className="w-[20px] h-[20px] text-foreground" strokeWidth={1.5} />
              </button>
              <button onClick={handleShare}>
                <Send className="w-[20px] h-[20px] text-foreground" strokeWidth={1.5} />
              </button>
            </div>

            {/* Counts */}
            {(likeCount > 0 || (post.comments_count || 0) > 0) && (
              <div className="flex items-center gap-2 mt-1.5">
                {likeCount > 0 && (
                  <span className="text-muted-foreground text-[14px]">{likeCount} likes</span>
                )}
                {likeCount > 0 && (post.comments_count || 0) > 0 && (
                  <span className="text-muted-foreground text-[14px]">·</span>
                )}
                {(post.comments_count || 0) > 0 && (
                  <button onClick={() => setShowComments(true)}>
                    <span className="text-muted-foreground text-[14px]">{post.comments_count} replies</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </article>

      <CommentPanel postId={post.id} open={showComments} onClose={() => { setShowComments(false); onRefresh?.(); }} />
    </>
  );
}
