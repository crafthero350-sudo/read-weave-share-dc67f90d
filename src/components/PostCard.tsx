import { useState, useRef } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Volume2, VolumeX, Pencil, Trash2, X, Check } from "lucide-react";
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
  updated_at?: string;
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
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [deleting, setDeleting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isOwner = user?.id === post.user_id;
  const wasEdited = post.updated_at && post.created_at && new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 2000;

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
    const shareUrl = `${window.location.origin}/?post=${post.id}`;
    const shareText = post.content.slice(0, 200);
    const shareTitle = `Post by ${post.profile?.display_name || "User"}`;
    if (navigator.share) {
      try { await navigator.share({ title: shareTitle, text: shareText, url: shareUrl }); return; } catch (e: any) { if (e?.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(shareUrl); toast.success("Link copied!"); } catch { toast.error("Could not share"); }
  };

  const handleDoubleTap = () => {
    if (!liked && user) {
      toggleLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }
  };

  const handleDelete = async () => {
    if (!user || !isOwner) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("posts").delete().eq("id", post.id).eq("user_id", user.id);
      if (error) throw error;
      toast.success("Post deleted");
      onRefresh?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally { setDeleting(false); setShowMenu(false); }
  };

  const handleEdit = async () => {
    if (!user || !isOwner || !editContent.trim()) return;
    try {
      const { error } = await supabase.from("posts").update({ content: editContent.trim() }).eq("id", post.id).eq("user_id", user.id);
      if (error) throw error;
      toast.success("Post updated");
      setEditing(false);
      onRefresh?.();
    } catch (err: any) { toast.error(err.message || "Failed to update"); }
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: false });
  const displayName = post.profile?.display_name || post.profile?.username || "User";
  const username = post.profile?.username || displayName;
  const initials = displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const avatarUrl = post.profile?.avatar_url;
  const mediaUrl = post.image_url || post.book?.cover_url || "";
  const hasMedia = !!mediaUrl;
  const isVideo = mediaUrl.match(/\.(mp4|mov|webm|avi|mkv)(\?|$)/i);

  const toggleMute = () => {
    setMuted((m) => !m);
    if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
  };

  return (
    <>
      <article className="feed-card mb-3">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          <button onClick={() => navigate(`/user/${post.user_id}`)} className="flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={username} className="w-9 h-9 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground ring-2 ring-border">
                {initials}
              </div>
            )}
          </button>
          <button onClick={() => navigate(`/user/${post.user_id}`)} className="flex-1 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold text-foreground">{username}</span>
              {post.book && (
                <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                  📖 {post.book.title}
                </span>
              )}
            </div>
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center">
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 z-50 bg-card border border-border rounded-2xl shadow-lg min-w-[160px] py-1 overflow-hidden">
                  {isOwner && (
                    <>
                      <button onClick={() => { setEditing(true); setEditContent(post.content); setShowMenu(false); }} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                        <Pencil className="w-4 h-4" strokeWidth={1.5} /> Edit
                      </button>
                      <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-destructive hover:bg-muted transition-colors">
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} /> {deleting ? "Deleting..." : "Delete"}
                      </button>
                    </>
                  )}
                  <button onClick={() => { handleShare(); setShowMenu(false); }} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                    <Send className="w-4 h-4 -rotate-[20deg]" strokeWidth={1.5} /> Share
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Media */}
        {hasMedia && (
          <div className="w-full aspect-[4/5] bg-muted relative select-none" onDoubleClick={handleDoubleTap}>
            {isVideo ? (
              <>
                <video ref={videoRef} src={mediaUrl} className="w-full h-full object-cover" autoPlay loop muted={muted} playsInline />
                <button onClick={toggleMute} className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
                  {muted ? <VolumeX className="w-4 h-4 text-foreground" strokeWidth={2} /> : <Volume2 className="w-4 h-4 text-foreground" strokeWidth={2} />}
                </button>
              </>
            ) : (
              <img src={mediaUrl} alt="" className="w-full h-full object-cover" draggable={false} />
            )}
            {showHeart && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart className="w-24 h-24 text-destructive fill-destructive animate-scale-in drop-shadow-lg" />
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-3.5 pt-3 pb-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={toggleLike} className="active:scale-110 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2">
                <Heart className={`w-[26px] h-[26px] transition-colors ${liked ? "fill-destructive text-destructive" : "text-foreground"}`} strokeWidth={1.5} />
              </button>
              <button onClick={() => setShowComments(true)} className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2">
                <MessageCircle className="w-[26px] h-[26px] text-foreground" strokeWidth={1.5} />
              </button>
              <button onClick={handleShare} className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2">
                <Send className="w-[24px] h-[24px] text-foreground -rotate-[25deg]" strokeWidth={1.5} />
              </button>
            </div>
            <button onClick={toggleSave} className="active:scale-110 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center">
              <Bookmark className={`w-[26px] h-[26px] transition-colors ${saved ? "fill-foreground text-foreground" : "text-foreground"}`} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Likes */}
        {likeCount > 0 && (
          <div className="px-3.5 flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
              <div className="w-4 h-4 rounded-full bg-destructive border border-card" />
            </div>
            <p className="text-[13px] font-semibold text-foreground">
              {likeCount.toLocaleString()} {likeCount === 1 ? "Like" : "Liked"}
            </p>
          </div>
        )}

        {/* Caption */}
        <div className="px-3.5 mt-1.5">
          {editing ? (
            <div className="space-y-2 py-1">
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none resize-none text-foreground border border-border focus:border-primary transition-colors" />
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium"><X className="w-3 h-3" /> Cancel</button>
                <button onClick={handleEdit} disabled={!editContent.trim()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"><Check className="w-3 h-3" /> Save</button>
              </div>
            </div>
          ) : (
            <p className="text-[13px] leading-[1.4] text-foreground">
              <span className="font-bold mr-1.5">{username}</span>
              <span className="text-foreground/90">{post.content}</span>
            </p>
          )}
        </div>

        {wasEdited && !editing && (
          <p className="px-3.5 mt-0.5 text-[10px] text-muted-foreground italic">Edited</p>
        )}

        {/* Comments link */}
        {(post.comments_count || 0) > 0 && (
          <button onClick={() => setShowComments(true)} className="px-3.5 mt-1 block">
            <span className="text-[13px] text-muted-foreground">
              View all {post.comments_count} comment{post.comments_count !== 1 ? "s" : ""}
            </span>
          </button>
        )}

        {/* Time */}
        <p className="px-3.5 pb-3.5 pt-1 text-[11px] text-muted-foreground">{timeAgo} ago</p>
      </article>

      <CommentPanel postId={post.id} open={showComments} onClose={() => { setShowComments(false); onRefresh?.(); }} />
    </>
  );
}
