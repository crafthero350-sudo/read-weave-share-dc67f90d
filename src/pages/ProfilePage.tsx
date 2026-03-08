import { useState, useEffect } from "react";
import { Settings, Flame, BookOpen, Quote, Brain, Sparkles, Trash2 } from "lucide-react";
import { ActivityGraph } from "@/components/ActivityGraph";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/hooks/useFollow";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SavedCharacter {
  id: string;
  character_name: string;
  book_title: string;
  book_author: string;
  image_url: string;
}

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ booksRead: 0, posts: 0, discussions: 0 });
  const { followersCount, followingCount } = useFollow(user?.id || null);
  const [characters, setCharacters] = useState<SavedCharacter[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("user_books").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "finished"),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([booksRes, postsRes, commentsRes]) => {
      setStats({ booksRead: booksRes.count || 0, posts: postsRes.count || 0, discussions: commentsRes.count || 0 });
    });

    supabase.from("saved_characters").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setCharacters(data as SavedCharacter[]);
    });
  }, [user]);

  const deleteCharacter = async (id: string) => {
    const { error } = await supabase.from("saved_characters").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else setCharacters((prev) => prev.filter((c) => c.id !== id));
  };

  const initials = (profile?.display_name || profile?.username || "?")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="font-display text-2xl font-bold">Profile</h1>
          <button onClick={() => navigate("/settings")} className="p-2"><Settings className="w-5 h-5" strokeWidth={1.5} /></button>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
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
              <Flame className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">{profile?.reading_streak || 0} Day Streak</span>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3">
          {[
            { icon: BookOpen, label: "Books Read", value: stats.booksRead.toString() },
            { icon: Quote, label: "Posts", value: stats.posts.toString() },
            { icon: Brain, label: "Comments", value: stats.discussions.toString() },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl p-4 text-center border border-border">
              <stat.icon className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-lg font-semibold">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Reading Personality */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Reading Personality</p>
            <button onClick={() => navigate("/quiz")} className="text-xs text-accent font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> {profile?.reading_personality ? "Retake" : "Take Quiz"}
            </button>
          </div>
          <p className="text-lg font-display font-bold">{profile?.reading_personality || "Not yet discovered"}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {profile?.reading_personality
              ? "Your unique reading identity based on your preferences and habits."
              : "Take the quiz to discover your reading personality!"}
          </p>
        </motion.div>

        {/* Saved Characters */}
        {characters.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3 className="font-display text-lg font-bold mb-3">Saved Characters</h3>
            <div className="grid grid-cols-2 gap-3">
              {characters.map((char) => (
                <div key={char.id} className="bg-card rounded-2xl overflow-hidden border border-border relative group">
                  <img src={char.image_url} alt={char.character_name} className="w-full aspect-square object-cover" />
                  <div className="p-3">
                    <p className="font-semibold text-sm truncate">{char.character_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{char.book_title}</p>
                  </div>
                  <button
                    onClick={() => deleteCharacter(char.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <ActivityGraph />
      </div>
    </div>
  );
}
