import { useState, useEffect, useRef, useCallback } from "react";
import { X, Heart, Send, Trash2, Share2, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface StoryItem {
  id: string;
  content: string;
  imageUrl?: string | null;
  backgroundColor?: string;
  stickers?: string[];
  createdAt: string;
}

interface StoryGroup {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  stories: StoryItem[];
}

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onDeleted?: () => void;
}

const QUICK_EMOJIS = ["😂", "😮", "😍", "👏", "😢", "🔥"];
const STORY_DURATION = 5000; // 5 seconds per story

export function StoryViewer({ groups, initialGroupIndex, onClose, onDeleted }: StoryViewerProps) {
  const { user } = useAuth();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [liked, setLiked] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];
  const isOwn = user && group?.userId === user.id;

  // Record view
  useEffect(() => {
    if (!story || !user || isOwn) return;
    supabase.from("story_viewers").insert({
      story_id: story.id,
      viewer_id: user.id,
    }).then(() => {});
  }, [story?.id, user, isOwn]);

  // Progress timer
  useEffect(() => {
    if (!story) return;
    setProgress(0);
    setLiked(false);

    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    const tickMs = 50;
    const increment = (tickMs / STORY_DURATION) * 100;

    progressTimerRef.current = setInterval(() => {
      if (paused) return;
      setProgress((p) => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + increment;
      });
    }, tickMs);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [groupIndex, storyIndex, paused]);

  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((i) => i + 1);
      setProgress(0);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [group, storyIndex, groupIndex, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex((i) => i - 1);
      setStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  }, [storyIndex, groupIndex, groups]);

  const handleTouchStart = () => {
    holdTimerRef.current = setTimeout(() => setPaused(true), 200);
  };

  const handleTouchEnd = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    setPaused(false);
  };

  const handleTapLeft = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    goPrev();
  };

  const handleTapRight = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    goNext();
  };

  const handleDelete = async () => {
    if (!story) return;
    setPaused(true);
    const { error } = await supabase.from("stories").delete().eq("id", story.id);
    if (error) {
      toast.error("Failed to delete story");
      setPaused(false);
      return;
    }
    toast.success("Story deleted");
    onDeleted?.();
    onClose();
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !user || !group || sending) return;
    setSending(true);
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: group.userId,
      content: `📖 Replied to your story: ${replyText.trim()}`,
    });
    if (error) {
      toast.error("Failed to send reply");
    } else {
      toast.success("Reply sent!");
      setReplyText("");
    }
    setSending(false);
  };

  const handleEmojiReact = async (emoji: string) => {
    if (!user || !group) return;
    setShowEmojis(false);
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: group.userId,
      content: `Reacted ${emoji} to your story`,
    });
    if (!error) {
      toast.success(`${emoji} sent!`);
    }
  };

  const handleLike = async () => {
    if (!user || !group || liked) return;
    setLiked(true);
    await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: group.userId,
      content: "❤️ Liked your story",
    });
  };

  const handleShare = async () => {
    setPaused(true);
    if (navigator.share) {
      try {
        await navigator.share({ title: `Story by ${group.username}`, text: story?.content || "", url: window.location.origin });
      } catch {}
    } else {
      await navigator.clipboard.writeText(story?.content || "");
      toast.success("Copied!");
    }
    setPaused(false);
  };

  if (!group || !story) return null;

  const initials = (group.displayName || group.username).split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  // Time ago
  const timeAgo = (() => {
    const diff = Date.now() - new Date(story.createdAt).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return `${Math.floor(diff / 60000)}m`;
    return `${hours}h`;
  })();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      >
        {/* Adjacent story previews (desktop feel) */}
        <div className="hidden sm:block absolute left-2 top-1/2 -translate-y-1/2 w-16 h-24 rounded-xl overflow-hidden opacity-30 cursor-pointer"
          onClick={goPrev}>
          {groupIndex > 0 && groups[groupIndex - 1]?.stories[0]?.imageUrl && (
            <img src={groups[groupIndex - 1].stories[0].imageUrl!} className="w-full h-full object-cover" alt="" />
          )}
        </div>
        <div className="hidden sm:block absolute right-2 top-1/2 -translate-y-1/2 w-16 h-24 rounded-xl overflow-hidden opacity-30 cursor-pointer"
          onClick={goNext}>
          {groupIndex < groups.length - 1 && groups[groupIndex + 1]?.stories[0]?.imageUrl && (
            <img src={groups[groupIndex + 1].stories[0].imageUrl!} className="w-full h-full object-cover" alt="" />
          )}
        </div>

        {/* Main story card */}
        <div className="relative w-full h-full max-w-lg mx-auto flex flex-col">
          {/* Background */}
          {story.imageUrl ? (
            <img
              src={story.imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover rounded-none sm:rounded-2xl"
            />
          ) : (
            <div
              className="absolute inset-0 rounded-none sm:rounded-2xl"
              style={{ backgroundColor: story.backgroundColor || "#1a1a2e" }}
            />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 rounded-none sm:rounded-2xl" />

          {/* Progress bars */}
          <div className="flex gap-[3px] px-3 pt-3 relative z-20">
            {group.stories.map((_, i) => (
              <div key={i} className="flex-1 h-[2px] rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{
                    width: i < storyIndex ? "100%" : i === storyIndex ? `${Math.min(progress, 100)}%` : "0%",
                    transition: i === storyIndex ? "none" : "width 0.3s",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 relative z-20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden ring-[1.5px] ring-white/50 flex-shrink-0">
                {group.avatarUrl ? (
                  <img src={group.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/20 flex items-center justify-center text-[10px] text-white font-semibold">
                    {initials}
                  </div>
                )}
              </div>
              <span className="text-[13px] font-semibold text-white">{group.username}</span>
              <span className="text-[11px] text-white/60">{timeAgo}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {isOwn && (
                <>
                  <button onClick={handleShare} className="p-1.5">
                    <Share2 className="w-5 h-5 text-white" />
                  </button>
                  <button onClick={handleDelete} className="p-1.5">
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </>
              )}
              {!isOwn && (
                <button onClick={handleShare} className="p-1.5">
                  <MoreHorizontal className="w-5 h-5 text-white" />
                </button>
              )}
              <button onClick={onClose} className="p-1.5">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 flex items-center justify-center px-8 relative z-10">
            {!story.imageUrl && story.content && (
              <motion.p
                key={`${groupIndex}-${storyIndex}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xl text-white text-center leading-relaxed font-light drop-shadow-lg"
              >
                {story.content}
              </motion.p>
            )}
            {story.stickers && story.stickers.length > 0 && (
              <div className="absolute bottom-1/3 flex flex-wrap justify-center gap-3">
                {story.stickers.map((s, i) => (
                  <span key={i} className="text-4xl drop-shadow-lg">{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Emoji reaction row (shown when focused on input or tapped) */}
          <AnimatePresence>
            {showEmojis && !isOwn && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-20 left-0 right-0 flex justify-center gap-4 px-8 z-30"
              >
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiReact(emoji)}
                    className="text-4xl hover:scale-125 active:scale-90 transition-transform drop-shadow-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom actions */}
          <div className="relative z-20 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {!isOwn ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Send message..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onFocus={() => { setPaused(true); setShowEmojis(true); }}
                    onBlur={() => {
                      setTimeout(() => {
                        setPaused(false);
                        setShowEmojis(false);
                      }, 200);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                    className="w-full bg-white/10 backdrop-blur-sm text-white placeholder:text-white/50 rounded-full px-4 py-2.5 text-sm outline-none border border-white/20"
                  />
                </div>
                <button
                  onClick={handleLike}
                  className="p-2 transition-transform active:scale-90"
                >
                  <Heart
                    className={`w-6 h-6 transition-colors ${liked ? "text-red-500 fill-red-500" : "text-white"}`}
                  />
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sending}
                  className="p-2 transition-transform active:scale-90"
                >
                  <Send className="w-6 h-6 text-white" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center py-2">
                <p className="text-xs text-white/50">Your story • Swipe to see viewers</p>
              </div>
            )}
          </div>

          {/* Tap zones for navigation */}
          <div
            className="absolute left-0 top-14 bottom-16 w-1/3 z-10 cursor-pointer"
            onClick={handleTapLeft}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
          />
          <div
            className="absolute right-0 top-14 bottom-16 w-1/3 z-10 cursor-pointer"
            onClick={handleTapRight}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
