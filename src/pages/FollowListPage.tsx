import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageTransition } from "@/components/PageTransition";

interface ProfileItem {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function FollowListPage() {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "followers";
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"followers" | "following">(tab as any);
  const [followers, setFollowers] = useState<ProfileItem[]>([]);
  const [following, setFollowing] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      const [followerRes, followingRes] = await Promise.all([
        supabase.from("follows").select("follower_id").eq("following_id", userId),
        supabase.from("follows").select("following_id").eq("follower_id", userId),
      ]);

      const followerIds = followerRes.data?.map(f => f.follower_id) || [];
      const followingIds = followingRes.data?.map(f => f.following_id) || [];

      const allIds = [...new Set([...followerIds, ...followingIds])];
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", allIds);

        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        setFollowers(followerIds.map(id => profileMap.get(id)).filter(Boolean) as ProfileItem[]);
        setFollowing(followingIds.map(id => profileMap.get(id)).filter(Boolean) as ProfileItem[]);
      } else {
        setFollowers([]);
        setFollowing([]);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  const list = activeTab === "followers" ? followers : following;

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-14">
        <header className="sticky top-0 z-30 bg-background border-b border-border">
          <div className="flex items-center gap-3 px-4 h-11">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <h1 className="text-[15px] font-bold flex-1">Connections</h1>
          </div>
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("followers")}
              className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                activeTab === "followers" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"
              }`}
            >
              Followers
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                activeTab === "following" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"
              }`}
            >
              Following
            </button>
          </div>
        </header>

        <div className="px-2 pt-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-16">
              {activeTab === "followers" ? "No followers yet" : "Not following anyone"}
            </p>
          ) : (
            list.map((p, i) => (
              <motion.button
                key={p.user_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(p.user_id === user?.id ? "/profile" : `/user/${p.user_id}`)}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-accent transition-colors"
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold">{(p.display_name || p.username || "?")[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold truncate">{p.username || "user"}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.display_name}</p>
                </div>
              </motion.button>
            ))
          )}
        </div>
      </div>
    </PageTransition>
  );
}
