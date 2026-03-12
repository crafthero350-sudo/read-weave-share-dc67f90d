import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Send, Camera, Mic, Image as ImageIcon, Smile, Phone, Video, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageTransition } from "@/components/PageTransition";
import { formatDistanceToNow } from "date-fns";
import { isUserOnline } from "@/hooks/usePresence";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  message_type: string;
  media_url: string | null;
}

interface Profile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [sending, setSending] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherLastSeen, setOtherLastSeen] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Load other user profile and presence
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (data) setOtherUser(data);
      });

    supabase
      .from("user_presence")
      .select("is_online, last_seen_at")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setOtherOnline(isUserOnline((data as any).last_seen_at, (data as any).is_online));
          setOtherLastSeen((data as any).last_seen_at);
        }
      });
  }, [userId]);

  // Subscribe to other user's presence changes
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`presence-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence", filter: `user_id=eq.${userId}` },
        (payload) => {
          const updated = payload.new as any;
          setOtherOnline(isUserOnline(updated.last_seen_at, updated.is_online));
          setOtherLastSeen(updated.last_seen_at);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const loadMessages = useCallback(async () => {
    if (!user || !userId) return;
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true })
      .limit(200);

    if (data) setMessages(data as Message[]);

    await supabase
      .from("direct_messages")
      .update({ read: true })
      .eq("sender_id", userId)
      .eq("receiver_id", user.id)
      .eq("read", false);
  }, [user, userId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Realtime messages
  useEffect(() => {
    if (!user || !userId) return;
    const channel = supabase
      .channel(`dm-${user.id}-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === user.id && msg.receiver_id === userId) ||
            (msg.sender_id === userId && msg.receiver_id === user.id)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            if (msg.receiver_id === user.id) {
              supabase.from("direct_messages").update({ read: true }).eq("id", msg.id);
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, userId]);

  const handleSend = async () => {
    if ((!newMsg.trim() && !mediaFile) || !user || !userId || sending) return;
    setSending(true);
    const content = newMsg.trim();
    setNewMsg("");

    let mediaUrl: string | null = null;
    let messageType = "text";

    if (mediaFile) {
      messageType = mediaFile.type.startsWith("audio/") ? "voice" : "image";
      const ext = mediaFile.name.split(".").pop() || "bin";
      const path = `chat/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, mediaFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        mediaUrl = urlData.publicUrl;
      }
      setMediaFile(null);
      setMediaPreview(null);
    }

    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: userId,
      content: content || (messageType === "image" ? "📷 Photo" : "🎤 Voice message"),
      message_type: messageType,
      media_url: mediaUrl,
    });

    if (error) setNewMsg(content);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    const reader = new FileReader();
    reader.onload = () => setMediaPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        setMediaFile(file);
        setMediaPreview("voice");
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      // Microphone not available
    }
  };

  const displayName = otherUser?.display_name || otherUser?.username || "User";
  const statusText = otherOnline
    ? "Active now"
    : otherLastSeen
    ? `Active ${formatDistanceToNow(new Date(otherLastSeen), { addSuffix: true })}`
    : "";

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-30 bg-background border-b border-border">
          <div className="flex items-center justify-between px-3 h-14">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button onClick={() => navigate("/messages")} className="p-1">
                <ArrowLeft className="w-6 h-6 text-foreground" />
              </button>
              <button onClick={() => navigate(`/user/${userId}`)} className="flex items-center gap-3 min-w-0">
                {otherUser?.avatar_url ? (
                  <div className="relative">
                    <img src={otherUser.avatar_url} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
                    {otherOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                      <span className="text-sm font-semibold text-foreground">{displayName[0]?.toUpperCase()}</span>
                    </div>
                    {otherOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>
                )}
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                  {statusText && (
                    <p className={`text-[11px] font-medium ${otherOnline ? "text-green-500" : "text-muted-foreground"}`}>
                      {statusText}
                    </p>
                  )}
                </div>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-1"><Phone className="w-5 h-5 text-foreground" strokeWidth={1.5} /></button>
              <button className="p-1"><Video className="w-5 h-5 text-foreground" strokeWidth={1.5} /></button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">Start your conversation with {displayName} 📚</p>
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => {
              const isMe = msg.sender_id === user?.id;
              const showTime = i === 0 || new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 300000;

              return (
                <div key={msg.id}>
                  {showTime && (
                    <p className="text-center text-[10px] text-muted-foreground my-3">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className={`flex ${isMe ? "justify-end" : "justify-start"} mb-0.5`}
                  >
                    {!isMe && (
                      <div className="flex-shrink-0 mr-2 self-end">
                        {otherUser?.avatar_url ? (
                          <img src={otherUser.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                            <span className="text-[10px] font-semibold text-foreground">{displayName[0]?.toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] ${
                        msg.message_type === "image" ? "p-1" : "px-3.5 py-2"
                      } text-sm leading-relaxed ${
                        isMe
                          ? "text-white rounded-2xl rounded-br-md"
                          : "bg-secondary text-foreground rounded-2xl rounded-bl-md"
                      }`}
                      style={isMe ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)" } : undefined}
                    >
                      {msg.message_type === "image" && msg.media_url && (
                        <img src={msg.media_url} alt="Shared image" className="rounded-xl max-w-full max-h-64 object-cover" />
                      )}
                      {msg.message_type === "voice" && msg.media_url && (
                        <div className="flex items-center gap-2 min-w-[180px]">
                          <audio controls src={msg.media_url} className="h-8 w-full" style={{ maxWidth: 200 }} />
                        </div>
                      )}
                      {msg.message_type === "text" && msg.content}
                      {msg.message_type !== "text" && msg.message_type !== "image" && msg.message_type !== "voice" && msg.content}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Media preview */}
        {mediaPreview && (
          <div className="px-3 py-2 border-t border-border bg-background">
            <div className="relative inline-block">
              {mediaPreview === "voice" ? (
                <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                  <Mic className="w-4 h-4 text-foreground" />
                  <span className="text-sm text-foreground">Voice message ready</span>
                </div>
              ) : (
                <img src={mediaPreview} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
              )}
              <button
                onClick={() => { setMediaPreview(null); setMediaFile(null); }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-foreground text-background rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        <div className="sticky bottom-0 bg-background border-t border-border px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2">
            <button className="p-1.5 flex-shrink-0">
              <Camera className="w-6 h-6 text-foreground" strokeWidth={1.5} />
            </button>
            <div className="flex-1 flex items-center bg-secondary rounded-full px-4 py-2.5 gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Message..."
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
              />
              {!newMsg.trim() && !mediaFile && (
                <>
                  <button onClick={toggleRecording} className={`p-0.5 flex-shrink-0 ${recording ? "text-red-500" : ""}`}>
                    <Mic className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="p-0.5 flex-shrink-0">
                    <ImageIcon className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                  </button>
                  <button className="p-0.5 flex-shrink-0">
                    <Smile className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                  </button>
                </>
              )}
            </div>
            {(newMsg.trim() || mediaFile) && (
              <button onClick={handleSend} disabled={sending} className="p-2 flex-shrink-0">
                <Send className="w-6 h-6 text-[#0095f6]" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
