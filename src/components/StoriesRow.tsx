import { useState } from "react";
import { stories } from "@/data/mockData";
import { StoryViewer } from "./StoryViewer";
import { motion } from "framer-motion";

export function StoriesRow() {
  const [activeStory, setActiveStory] = useState<number | null>(null);

  return (
    <>
      <div className="flex gap-4 overflow-x-auto px-4 py-3 scrollbar-hide">
        {stories.map((story, i) => (
          <motion.button
            key={story.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setActiveStory(i)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div className="story-ring-active">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground">
                {story.avatar}
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground w-16 truncate text-center">
              {story.username}
            </span>
          </motion.button>
        ))}
      </div>

      {activeStory !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={activeStory}
          onClose={() => setActiveStory(null)}
        />
      )}
    </>
  );
}
