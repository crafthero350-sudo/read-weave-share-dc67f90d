import { useState } from "react";
import { Heart, MessageCircle, Share, Bookmark } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CommentPanel } from "./CommentPanel";
import { formatDistanceToNow } from "date-fns";

export interface PostData {
  id: string;
  type: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  book_id: string | null;
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
    } else {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", post.id);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: false });
  const initials = (post.profile?.display_name || post.profile?.username || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08 }}
        className="feed-card"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 mb-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            {initials}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{post.profile?.display_name || post.profile?.username || "User"}</p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">
            {post.type}
          </span>
        </div>

        {/* Book reference */}
        {post.book && (
          <div className="flex items-center gap-3 mx-4 mb-3 p-3 bg-surface-elevated rounded-lg">
            {post.book.cover_url && (
              <img src={post.book.cover_url} alt={post.book.title} className="w-10 h-14 rounded object-cover" />
            )}
            <div>
              <p className="text-sm font-medium">{post.book.title}</p>
              <p className="text-xs text-muted-foreground">{post.book.author}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <p className={`px-4 mb-3 text-sm leading-relaxed ${post.type === "quote" ? "italic text-muted-foreground" : ""}`}>
          {post.content}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-5">
            <button onClick={toggleLike} className="flex items-center gap-1.5">
              <Heart className={`w-5 h-5 transition-colors ${liked ? "fill-foreground text-foreground" : "text-muted-foreground"}`} />
              <span className="text-xs text-muted-foreground">{likeCount}</span>
            </button>
            <button onClick={() => setShowComments(true)} className="flex items-center gap-1.5">
              <MessageCircle className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{post.comments_count}</span>
            </button>
            <button>
              <Share className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <button onClick={toggleSave}>
            <Bookmark className={`w-5 h-5 transition-colors ${saved ? "fill-foreground text-foreground" : "text-muted-foreground"}`} />
          </button>
        </div>
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
