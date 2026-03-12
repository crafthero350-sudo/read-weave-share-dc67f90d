import { useState, useEffect } from "react";
import { Search, Send, SquarePen, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageTransition } from "@/components/PageTransition";
import { formatDistanceToNow } from "date-fns";
import { isUserOnline } from "@/hooks/usePresence";

interface Conversation {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isOnline: boolean;
  lastSeenAt: string | null;
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadConversations() {
      if (!user) return;

      const { data: msgs } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!msgs || msgs.length === 0) {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id)
          .limit(30);

        if (follows && follows.length > 0) {
          const ids = follows.map((f) => f.following_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, username, avatar_url")
            .in("user_id", ids);

          // Fetch presence for these users
          const { data: presenceData } = await supabase
            .from("user_presence")
            .select("user_id, is_online, last_seen_at")
            .in("user_id", ids);

          const presenceMap = new Map(
            (presenceData || []).map((p: any) => [p.user_id, p])
          );

          setConversations(
            (profiles || []).map((p) => {
              const presence = presenceMap.get(p.user_id);
              return {
                userId: p.user_id,
                displayName: p.display_name || p.username || "User",
                username: p.username || "",
                avatarUrl: p.avatar_url,
                lastMessage: "Tap to start chatting 📚",
                time: "",
                unreadCount: 0,
                isOnline: presence ? isUserOnline(presence.last_seen_at, presence.is_online) : false,
                lastSeenAt: presence?.last_seen_at || null,
              };
            })
          );
        }
        setLoading(false);
        return;
      }

      const convoMap = new Map<
        string,
        { lastMsg: typeof msgs[0]; unread: number }
      >();

      for (const msg of msgs) {
        const partnerId =
          msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!convoMap.has(partnerId)) {
          convoMap.set(partnerId, { lastMsg: msg, unread: 0 });
        }
        if (msg.receiver_id === user.id && !msg.read) {
          const entry = convoMap.get(partnerId)!;
          entry.unread++;
        }
      }

      const partnerIds = [...convoMap.keys()];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", partnerIds);

      // Fetch presence
      const { data: presenceData } = await supabase
        .from("user_presence")
        .select("user_id, is_online, last_seen_at")
        .in("user_id", partnerIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );
      const presenceMap = new Map(
        (presenceData || []).map((p: any) => [p.user_id, p])
      );

      const convos: Conversation[] = partnerIds.map((pid) => {
        const entry = convoMap.get(pid)!;
        const pf = profileMap.get(pid);
        const presence = presenceMap.get(pid);
        return {
          userId: pid,
          displayName: pf?.display_name || pf?.username || "User",
          username: pf?.username || "",
          avatarUrl: pf?.avatar_url || null,
          lastMessage: entry.lastMsg.content,
          time: formatDistanceToNow(new Date(entry.lastMsg.created_at), {
            addSuffix: false,
          }),
          unreadCount: entry.unread,
          isOnline: presence ? isUserOnline(presence.last_seen_at, presence.is_online) : false,
          lastSeenAt: presence?.last_seen_at || null,
        };
      });

      setConversations(convos);
      setLoading(false);
    }
    loadConversations();
  }, [user]);

  // Subscribe to presence changes
  useEffect(() => {
    const channel = supabase
      .channel("presence-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        (payload) => {
          const updated = payload.new as any;
          if (!updated?.user_id) return;
          setConversations((prev) =>
            prev.map((c) =>
              c.userId === updated.user_id
                ? {
                    ...c,
                    isOnline: isUserOnline(updated.last_seen_at, updated.is_online),
                    lastSeenAt: updated.last_seen_at,
                  }
                : c
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = conversations.filter(
    (c) =>
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase())
  );

  const formatLastSeen = (lastSeenAt: string | null, online: boolean) => {
    if (online) return "Active now";
    if (!lastSeenAt) return "";
    return `Active ${formatDistanceToNow(new Date(lastSeenAt), { addSuffix: true })}`;
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-14">
        <header className="sticky top-0 z-30 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 h-11">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1">
              <span className="text-lg font-bold text-foreground">
                {profile?.username || "Messages"}
              </span>
              <ChevronDown className="w-4 h-4 text-foreground" strokeWidth={2} />
            </button>
            <button className="p-1">
              <SquarePen className="w-6 h-6 text-foreground" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        <div className="px-4 py-2">
          <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2">
          <p className="text-base font-bold text-foreground">Messages</p>
          <button className="text-sm font-semibold text-[#0095f6]">Requests</button>
        </div>

        <div className="px-0">
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
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/chat/${convo.userId}`)}
                className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-accent/50 transition-colors"
              >
                <div className="relative flex-shrink-0">
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
                  {convo.isOnline && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-[2.5px] border-background" />
                  )}
                </div>

                <div className="flex-1 text-left min-w-0">
                  <p className={`text-sm truncate ${convo.unreadCount > 0 ? "font-bold text-foreground" : "font-normal text-foreground"}`}>
                    {convo.username || convo.displayName}
                  </p>
                  <p className={`text-xs truncate ${convo.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {convo.lastMessage}
                    {convo.time && <span> · {convo.time}</span>}
                  </p>
                </div>

                {convo.unreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[#0095f6] flex-shrink-0" />
                )}
              </motion.button>
            ))
          )}
        </div>
      </div>
    </PageTransition>
  );
}
