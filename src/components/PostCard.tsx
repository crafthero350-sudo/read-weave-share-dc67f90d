import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
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
      await navigator.share?.({
        title: `Post by ${post.profile?.display_name || "User"}`,
        text: post.content.slice(0, 100),
        url: window.location.origin,
      });
    } catch {
      await navigator.clipboard?.writeText(post.content);
      toast.success("Copied to clipboard");
    }
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: false });
  const displayName = post.profile?.display_name || post.profile?.username || "User";
  const initials = displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <motion.article
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.05 }}
        className="border-b border-border"
      >
        {/* Header — Instagram style */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button
            onClick={() => navigate(`/user/${post.user_id}`)}
            className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary ring-2 ring-accent/40"
          >
            {initials}
          </button>
          <div className="flex-1 min-w-0">
            <button onClick={() => navigate(`/user/${post.user_id}`)} className="text-sm font-semibold hover:underline">
              {post.profile?.username || displayName}
            </button>
          </div>
          <button className="p-1 text-foreground">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Book cover as image (if has book) */}
        {post.book?.cover_url && (
          <div className="w-full aspect-[4/3] bg-muted">
            <img src={post.book.cover_url} alt={post.book.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Image post */}
        {post.image_url && !post.book?.cover_url && (
          <div className="w-full aspect-square bg-muted">
            <img src={post.image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Action buttons — Instagram style */}
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
          <div className="flex items-center gap-4">
            <button onClick={toggleLike} className="p-0.5">
              <Heart
                className={`w-6 h-6 transition-all ${liked ? "fill-red-500 text-red-500 scale-110" : "text-foreground"}`}
                strokeWidth={1.5}
              />
            </button>
            <button onClick={() => setShowComments(true)} className="p-0.5">
              <MessageCircle className="w-6 h-6 text-foreground" strokeWidth={1.5} />
            </button>
            <button onClick={handleShare} className="p-0.5">
              <Send className="w-6 h-6 text-foreground -rotate-45" strokeWidth={1.5} />
            </button>
          </div>
          <button onClick={toggleSave} className="p-0.5">
            <Bookmark
              className={`w-6 h-6 transition-all ${saved ? "fill-foreground text-foreground" : "text-foreground"}`}
              strokeWidth={1.5}
            />
          </button>
        </div>

        {/* Likes count */}
        {likeCount > 0 && (
          <p className="px-4 text-sm font-semibold">{likeCount.toLocaleString()} {likeCount === 1 ? "like" : "likes"}</p>
        )}

        {/* Content — Instagram caption style */}
        <div className="px-4 pb-1">
          <p className="text-sm">
            <span className="font-semibold mr-1.5">{post.profile?.username || displayName}</span>
            <span className={post.type === "quote" ? "italic" : ""}>{post.content}</span>
          </p>
        </div>

        {/* Book reference tag */}
        {post.book && (
          <div className="px-4 pb-1">
            <span className="text-xs text-accent font-medium">📖 {post.book.title} — {post.book.author}</span>
          </div>
        )}

        {/* Comments link */}
        {(post.comments_count || 0) > 0 && (
          <button onClick={() => setShowComments(true)} className="px-4 pb-1">
            <span className="text-sm text-muted-foreground">View all {post.comments_count} comments</span>
          </button>
        )}

        {/* Timestamp */}
        <p className="px-4 pb-3 text-[10px] text-muted-foreground uppercase">{timeAgo} ago</p>
      </motion.article>

      <CommentPanel
        postId={post.id}
        open={showComments}
        onClose={() => {
          setShowComments(false);
          onRefresh?.();
        }}
      />
    </>
  );
}
