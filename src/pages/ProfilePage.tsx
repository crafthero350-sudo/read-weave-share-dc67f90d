import { useState, useEffect } from "react";
import { Settings, Flame, BookOpen, Quote, Brain } from "lucide-react";
import { ActivityGraph } from "@/components/ActivityGraph";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/hooks/useFollow";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ booksRead: 0, posts: 0, discussions: 0 });
  const { followersCount, followingCount } = useFollow(user?.id || null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("user_books").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "finished"),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([booksRes, postsRes, commentsRes]) => {
      setStats({
        booksRead: booksRes.count || 0,
        posts: postsRes.count || 0,
        discussions: commentsRes.count || 0,
      });
    });
  }, [user]);

  const initials = (profile?.display_name || profile?.username || "?")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <button onClick={() => navigate("/settings")} className="p-2">
            <Settings className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold">
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{profile?.display_name || "Reader"}</h2>
            <p className="text-sm text-muted-foreground">@{profile?.username || "user"}</p>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm"><strong>{stats.posts}</strong> <span className="text-muted-foreground text-xs">posts</span></span>
              <span className="text-sm"><strong>{followersCount}</strong> <span className="text-muted-foreground text-xs">followers</span></span>
              <span className="text-sm"><strong>{followingCount}</strong> <span className="text-muted-foreground text-xs">following</span></span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Flame className="w-4 h-4 text-foreground" />
              <span className="text-sm font-medium">{profile?.reading_streak || 0} Day Streak</span>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-4">
          {[
            { icon: BookOpen, label: "Books Read", value: stats.booksRead.toString() },
            { icon: Quote, label: "Posts", value: stats.posts.toString() },
            { icon: Brain, label: "Comments", value: stats.discussions.toString() },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-elevated rounded-xl p-4 text-center">
              <stat.icon className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-lg font-semibold">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-surface-elevated rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Reading Personality</p>
          <p className="text-lg font-semibold">{profile?.reading_personality || "The Explorer"}</p>
          <p className="text-sm text-muted-foreground mt-1">
            You gravitate towards deep, thought-provoking works that challenge perspectives.
          </p>
        </motion.div>

        <ActivityGraph />
      </div>
    </div>
  );
}
