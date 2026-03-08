import { useState, useEffect } from "react";
import { X, Heart, MessageCircle, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StoryData {
  id: string;
  username: string;
  avatar: string;
  content: string;
  type: string;
  bookTitle?: string;
  imageUrl?: string | null;
  backgroundColor?: string;
  stickers?: string[];
}

interface StoryViewerProps {
  stories: StoryData[];
  initialIndex: number;
  onClose: () => void;
}

export function StoryViewer({ stories, initialIndex, onClose }: StoryViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const story = stories[index];

  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (index < stories.length - 1) {
            setIndex((i) => i + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [index, stories.length, onClose]);

  if (!story) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col"
        style={{ backgroundColor: story.backgroundColor || "#1a1a2e" }}
      >
        {/* Background image */}
        {story.imageUrl && (
          <img src={story.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Progress bars */}
        <div className="flex gap-1 px-3 pt-3 relative z-10">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-100"
                style={{ width: i < index ? "100%" : i === index ? `${progress}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs text-white font-medium">
              {story.avatar}
            </div>
            <p className="text-sm font-medium text-white">{story.username}</p>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-8 relative z-10">
          <div className="text-center">
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl text-white text-center leading-relaxed font-light"
            >
              {story.content}
            </motion.p>
            {story.stickers && story.stickers.length > 0 && (
              <div className="flex justify-center gap-2 mt-4">
                {story.stickers.map((s, i) => (
                  <span key={i} className="text-3xl">{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 px-4 pb-8 relative z-10">
          <input
            type="text"
            placeholder="Send message"
            className="flex-1 bg-white/10 text-white placeholder:text-white/40 rounded-full px-4 py-2.5 text-sm outline-none"
          />
          <Heart className="w-6 h-6 text-white" />
          <Send className="w-6 h-6 text-white" />
        </div>

        {/* Tap zones */}
        <div
          className="absolute left-0 top-16 bottom-20 w-1/3 z-10"
          onClick={() => index > 0 && setIndex(index - 1)}
        />
        <div
          className="absolute right-0 top-16 bottom-20 w-1/3 z-10"
          onClick={() => {
            if (index < stories.length - 1) setIndex(index + 1);
            else onClose();
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
