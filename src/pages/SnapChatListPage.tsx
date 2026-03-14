import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, SquarePen, Camera, Users, MessageCircle } from "lucide-react";
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
  messageType: string;
}

// Snapchat-style status colors
const STATUS_COLORS: Record<string, string> = {
  sent_snap: "#FF3B30",       // Red square = sent snap
  received_snap: "#FF3B30",   // Red = snap
  sent_chat: "#007AFF",       // Blue = chat
  received_chat: "#007AFF",
  default: "#6E6E73",
};

export default function SnapChatListPage() {
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

        if (follows?.length) {
          const ids = follows.map((f) => f.following_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, username, avatar_url")
            .in("user_id", ids);

          setConversations(
            (profiles || []).map((p) => ({
              userId: p.user_id,
              displayName: p.display_name || p.username || "User",
              username: p.username || "",
              avatarUrl: p.avatar_url,
              lastMessage: "Tap to chat",
              time: "",
              unreadCount: 0,
              isOnline: false,
              messageType: "default",
            }))
          );
        }
        setLoading(false);
        return;
      }

      const convoMap = new Map<string, { lastMsg: typeof msgs[0]; unread: number }>();
      for (const msg of msgs) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!convoMap.has(partnerId)) {
          convoMap.set(partnerId, { lastMsg: msg, unread: 0 });
        }
        if (msg.receiver_id === user.id && !msg.read) {
          convoMap.get(partnerId)!.unread++;
        }
      }

      const partnerIds = [...convoMap.keys()];
      const [profilesRes, presenceRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", partnerIds),
        supabase.from("user_presence").select("user_id, is_online, last_seen_at").in("user_id", partnerIds),
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));
      const presenceMap = new Map((presenceRes.data || []).map((p: any) => [p.user_id, p]));

      const convos: Conversation[] = partnerIds.map((pid) => {
        const entry = convoMap.get(pid)!;
        const pf = profileMap.get(pid);
        const pr = presenceMap.get(pid);
        const isSent = entry.lastMsg.sender_id === user.id;
        const msgType = entry.lastMsg.message_type;

        let statusKey = "default";
        if (msgType === "image") statusKey = isSent ? "sent_snap" : "received_snap";
        else statusKey = isSent ? "sent_chat" : "received_chat";

        return {
          userId: pid,
          displayName: pf?.display_name || pf?.username || "User",
          username: pf?.username || "",
          avatarUrl: pf?.avatar_url || null,
          lastMessage: entry.lastMsg.content,
          time: formatDistanceToNow(new Date(entry.lastMsg.created_at), { addSuffix: false }),
          unreadCount: entry.unread,
          isOnline: pr ? isUserOnline(pr.last_seen_at, pr.is_online) : false,
          messageType: statusKey,
        };
      });

      setConversations(convos);
      setLoading(false);
    }
    loadConversations();
  }, [user]);

  const filtered = conversations.filter(
    (c) =>
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase())
  );

  const renderAvatar = (url: string | null, name: string) => {
    const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    if (url) {
      return <img src={url} alt={name} className="w-12 h-12 rounded-full object-cover" />;
    }
    return (
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
        <span className="text-white font-bold text-sm">{initials}</span>
      </div>
    );
  };

  const getStatusIcon = (type: string) => {
    const color = STATUS_COLORS[type] || STATUS_COLORS.default;
    if (type.includes("snap")) {
      return <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />;
    }
    return <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: color }} />;
  };

  const getStatusLabel = (convo: Conversation) => {
    if (convo.messageType === "sent_snap") return "Delivered";
    if (convo.messageType === "received_snap") return "New Snap";
    if (convo.messageType === "sent_chat") return "Delivered";
    if (convo.messageType === "received_chat") return "New Chat";
    return convo.lastMessage;
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 h-12 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/profile")} className="w-9 h-9">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">
                    {(profile?.display_name || profile?.username || "U")[0].toUpperCase()}
                  </span>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2">
                <Search className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </button>
              <button className="p-2">
                <Users className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </button>
              <button className="p-2">
                <SquarePen className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </header>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 bg-secondary rounded-full px-4 py-2.5">
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

        {/* Quick actions */}
        <div className="flex items-center gap-3 px-4 pb-3">
          {[
            { icon: Camera, label: "Camera", color: "#FFFC00", bg: "#FFFC00", textColor: "#000" },
            { icon: MessageCircle, label: "Chat", color: "#007AFF", bg: "#007AFF", textColor: "#fff" },
          ].map(({ icon: Icon, label, bg, textColor }) => (
            <button
              key={label}
              onClick={() => label === "Camera" ? navigate("/snap") : null}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{ backgroundColor: bg, color: textColor }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Chat list */}
        <div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <MessageCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">No conversations yet</p>
            </div>
          ) : (
            filtered.map((convo, i) => (
              <motion.button
                key={convo.userId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => navigate(`/chat/${convo.userId}`)}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary/50 transition-colors active:bg-secondary/80"
              >
                <div className="relative flex-shrink-0">
                  {renderAvatar(convo.avatarUrl, convo.displayName)}
                  {convo.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#34C759] border-2 border-background" />
                  )}
                </div>

                <div className="flex-1 text-left min-w-0">
                  <p className={`text-sm truncate ${convo.unreadCount > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                    {convo.displayName}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(convo.messageType)}
                    <p className={`text-xs truncate ${convo.unreadCount > 0 ? "font-semibold" : ""}`}
                      style={{ color: STATUS_COLORS[convo.messageType] || STATUS_COLORS.default }}>
                      {getStatusLabel(convo)}
                      {convo.time && <span className="text-muted-foreground font-normal"> · {convo.time}</span>}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); navigate("/snap"); }}
                  className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                >
                  <Camera className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                </button>
              </motion.button>
            ))
          )}
        </div>
      </div>
    </PageTransition>
  );
}
