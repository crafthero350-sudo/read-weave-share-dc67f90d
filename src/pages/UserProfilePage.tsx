import { useState, useEffect } from "react";
import { ArrowLeft, Flame, BookOpen, Quote, Brain, Lock } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/hooks/useFollow";

interface UserProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  reading_streak: number | null;
  reading_personality: string | null;
  is_private: boolean;
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({ booksRead: 0, posts: 0, comments: 0 });
  const [loading, setLoading] = useState(true);
  const { status, loading: followLoading, toggleFollow, followersCount, followingCount, isPrivate } = useFollow(userId || null);

  const isSelf = user?.id === userId;

  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
      setProfile(data as any);

      const [booksRes, postsRes, commentsRes] = await Promise.all([
        supabase.from("user_books").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "finished"),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      setStats({ booksRead: booksRes.count || 0, posts: postsRes.count || 0, comments: commentsRes.count || 0 });
      setLoading(false);
    };
    fetch();
  }, [userId]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = (profile.display_name || profile.username || "?")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const canViewContent = !isPrivate || status === "following" || isSelf;

  const followButtonLabel = status === "following" ? "Following" : status === "requested" ? "Requested" : "Follow";

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-sm font-semibold">@{profile.username || "user"}</h1>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold">{initials}</div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{profile.display_name || "Reader"}</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm"><strong>{stats.posts}</strong> <span className="text-muted-foreground">posts</span></span>
              <span className="text-sm"><strong>{followersCount}</strong> <span className="text-muted-foreground">followers</span></span>
              <span className="text-sm"><strong>{followingCount}</strong> <span className="text-muted-foreground">following</span></span>
            </div>
          </div>
        </motion.div>

        {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}

        {!isSelf && (
          <div className="flex gap-2">
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                status === "following"
                  ? "bg-muted text-foreground"
                  : status === "requested"
                  ? "bg-muted text-muted-foreground"
                  : "bg-foreground text-background"
              }`}
            >
              {followButtonLabel}
            </button>
          </div>
        )}

        {!canViewContent && (
          <div className="text-center py-12">
            <Lock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">This account is private</p>
            <p className="text-xs text-muted-foreground mt-1">Follow to see their posts and reading activity</p>
          </div>
        )}

        {canViewContent && (
          <>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: BookOpen, label: "Books Read", value: stats.booksRead.toString() },
                { icon: Quote, label: "Posts", value: stats.posts.toString() },
                { icon: Brain, label: "Comments", value: stats.comments.toString() },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface-elevated rounded-xl p-4 text-center">
                  <stat.icon className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground" strokeWidth={1.5} />
                  <p className="text-lg font-semibold">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {profile.reading_personality && (
              <div className="bg-surface-elevated rounded-xl p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Reading Personality</p>
                <p className="text-lg font-semibold">{profile.reading_personality}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
