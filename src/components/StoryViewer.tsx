import { useState, useEffect } from "react";
import { X, Heart, MessageCircle, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Story } from "@/data/mockData";

interface StoryViewerProps {
  stories: Story[];
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-foreground flex flex-col"
      >
        {/* Progress bars */}
        <div className="flex gap-1 px-3 pt-3">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-primary-foreground/30 overflow-hidden">
              <div
                className="h-full bg-primary-foreground rounded-full transition-all duration-100"
                style={{ width: i < index ? "100%" : i === index ? `${progress}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs text-primary-foreground font-medium">
              {story.avatar}
            </div>
            <div>
              <p className="text-sm font-medium text-primary-foreground">{story.username}</p>
              {story.bookTitle && (
                <p className="text-xs text-primary-foreground/60">{story.bookTitle}</p>
              )}
            </div>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-8">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl text-primary-foreground text-center leading-relaxed font-light"
          >
            {story.content}
          </motion.p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 px-4 pb-8">
          <input
            type="text"
            placeholder="Send message"
            className="flex-1 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/40 rounded-full px-4 py-2.5 text-sm outline-none"
          />
          <Heart className="w-6 h-6 text-primary-foreground" />
          <MessageCircle className="w-6 h-6 text-primary-foreground" />
          <Send className="w-6 h-6 text-primary-foreground" />
        </div>

        {/* Tap zones */}
        <div
          className="absolute left-0 top-16 bottom-20 w-1/3"
          onClick={() => index > 0 && setIndex(index - 1)}
        />
        <div
          className="absolute right-0 top-16 bottom-20 w-1/3"
          onClick={() => {
            if (index < stories.length - 1) setIndex(index + 1);
            else onClose();
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
