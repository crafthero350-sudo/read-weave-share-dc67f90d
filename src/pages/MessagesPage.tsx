import { useState, useEffect } from "react";
import { ArrowLeft, Search, Send, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageTransition } from "@/components/PageTransition";

interface Conversation {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  lastMessage: string;
  time: string;
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadFollowing() {
      if (!user) return;
      // Show people you follow as potential conversations
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .limit(30);

      if (!follows || follows.length === 0) {
        setLoading(false);
        return;
      }

      const ids = follows.map((f) => f.following_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", ids);

      const convos: Conversation[] = (profiles || []).map((p) => ({
        userId: p.user_id,
        displayName: p.display_name || p.username || "User",
        username: p.username || "",
        avatarUrl: p.avatar_url,
        lastMessage: "Tap to start chatting about books 📚",
        time: "",
      }));

      setConversations(convos);
      setLoading(false);
    }
    loadFollowing();
  }, [user]);

  const filtered = conversations.filter(
    (c) =>
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 h-11">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-1">
                <ArrowLeft className="w-6 h-6 text-foreground" />
              </button>
              <h1 className="text-lg font-bold text-foreground">Messages</h1>
            </div>
            <button className="p-2">
              <Send className="w-5 h-5 text-foreground" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="px-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Send className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">
                {search ? "No conversations found" : "Follow people to start messaging"}
              </p>
            </div>
          ) : (
            filtered.map((convo, i) => (
              <motion.button
                key={convo.userId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/user/${convo.userId}`)}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-accent transition-colors"
              >
                <div className="relative">
                  {convo.avatarUrl ? (
                    <img
                      src={convo.avatarUrl}
                      alt={convo.displayName}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
                      <span className="text-lg font-semibold text-foreground">
                        {convo.displayName[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <Circle className="absolute bottom-0 right-0 w-3.5 h-3.5 text-green-500 fill-green-500" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {convo.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {convo.lastMessage}
                  </p>
                </div>
                {convo.time && (
                  <span className="text-[11px] text-muted-foreground flex-shrink-0">
                    {convo.time}
                  </span>
                )}
              </motion.button>
            ))
          )}
        </div>
      </div>
    </PageTransition>
  );
}
