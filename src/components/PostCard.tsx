import { useState } from "react";
import { Heart, MessageCircle, Share, Bookmark } from "lucide-react";
import { motion } from "framer-motion";
import type { Post } from "@/data/mockData";

interface PostCardProps {
  post: Post;
  index: number;
}

export function PostCard({ post, index }: PostCardProps) {
  const [liked, setLiked] = useState(post.liked);
  const [saved, setSaved] = useState(post.saved);
  const [likeCount, setLikeCount] = useState(post.likes);

  const toggleLike = () => {
    setLiked(!liked);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="feed-card"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 mb-3">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
          {post.avatar}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{post.username}</p>
          <p className="text-xs text-muted-foreground">{post.timeAgo}</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">
          {post.type}
        </span>
      </div>

      {/* Book reference */}
      {post.bookCover && (
        <div className="flex items-center gap-3 mx-4 mb-3 p-3 bg-surface-elevated rounded-lg">
          <img src={post.bookCover} alt={post.bookTitle} className="w-10 h-14 rounded object-cover" />
          <div>
            <p className="text-sm font-medium">{post.bookTitle}</p>
            <p className="text-xs text-muted-foreground">{post.bookAuthor}</p>
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
          <button className="flex items-center gap-1.5">
            <MessageCircle className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{post.comments}</span>
          </button>
          <button>
            <Share className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <button onClick={() => setSaved(!saved)}>
          <Bookmark className={`w-5 h-5 transition-colors ${saved ? "fill-foreground text-foreground" : "text-muted-foreground"}`} />
        </button>
      </div>
    </motion.article>
  );
}
