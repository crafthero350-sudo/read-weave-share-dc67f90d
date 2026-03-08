import { Settings, Flame, BookOpen, Quote, Brain } from "lucide-react";
import { ActivityGraph } from "@/components/ActivityGraph";
import { BookCard } from "@/components/BookCard";
import { books } from "@/data/mockData";
import { motion } from "framer-motion";

const finishedBooks = books.filter((b) => b.progress === 100);

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <button className="p-2">
            <Settings className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-8">
        {/* Avatar & info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold">
            EM
          </div>
          <div>
            <h2 className="text-lg font-semibold">Emily Martin</h2>
            <p className="text-sm text-muted-foreground">@emily_reads</p>
            <div className="flex items-center gap-1 mt-1">
              <Flame className="w-4 h-4 text-foreground" />
              <span className="text-sm font-medium">12 Day Reading Streak</span>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4"
        >
          {[
            { icon: BookOpen, label: "Books Read", value: "24" },
            { icon: Quote, label: "Highlights", value: "156" },
            { icon: Brain, label: "Discussions", value: "43" },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-elevated rounded-xl p-4 text-center">
              <stat.icon className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-lg font-semibold">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Reading Personality */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-surface-elevated rounded-xl p-5"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Reading Personality</p>
          <p className="text-lg font-semibold">The Philosopher</p>
          <p className="text-sm text-muted-foreground mt-1">
            You gravitate towards deep, thought-provoking works that challenge perspectives.
          </p>
        </motion.div>

        {/* Activity Graph */}
        <ActivityGraph />

        {/* Top Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="section-title mb-3">Top Highlight</h3>
          <div className="bg-surface-elevated rounded-xl p-5">
            <p className="text-sm italic leading-relaxed">
              "You have power over your mind — not outside events. Realize this, and you will find strength."
            </p>
            <p className="text-xs text-muted-foreground mt-2">Meditations — Marcus Aurelius</p>
            <p className="text-xs text-muted-foreground mt-0.5">❤️ 128 likes</p>
          </div>
        </motion.div>

        {/* Finished books */}
        {finishedBooks.length > 0 && (
          <section>
            <h3 className="section-title mb-4">Books Finished</h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {finishedBooks.map((book, i) => (
                <BookCard key={book.id} book={book} size="medium" index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
