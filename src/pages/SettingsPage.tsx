import { useState, useEffect } from "react";
import { ArrowLeft, User, Shield, Heart, Bookmark, Users, Bell, Moon, Sun, LogOut, ChevronRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";

import avatar1 from "@/assets/avatars/avatar-1.png";
import avatar2 from "@/assets/avatars/avatar-2.png";
import avatar3 from "@/assets/avatars/avatar-3.png";
import avatar4 from "@/assets/avatars/avatar-4.png";
import avatar5 from "@/assets/avatars/avatar-5.png";
import avatar6 from "@/assets/avatars/avatar-6.png";
import avatar7 from "@/assets/avatars/avatar-7.png";
import avatar8 from "@/assets/avatars/avatar-8.png";
import avatar9 from "@/assets/avatars/avatar-9.png";
import avatar10 from "@/assets/avatars/avatar-10.png";

const avatarOptions = [
  { id: "1", src: avatar1 },
  { id: "2", src: avatar2 },
  { id: "3", src: avatar3 },
  { id: "4", src: avatar4 },
  { id: "5", src: avatar5 },
  { id: "6", src: avatar6 },
  { id: "7", src: avatar7 },
  { id: "8", src: avatar8 },
  { id: "9", src: avatar9 },
  { id: "10", src: avatar10 },
];

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [isPrivate, setIsPrivate] = useState(false);
  const [storyPrivacy, setStoryPrivacy] = useState("everyone");
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("profiles").select("is_private").eq("user_id", user.id).single(),
      supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
    ]).then(([profileRes, settingsRes]) => {
      setIsPrivate(profileRes.data?.is_private || false);
      if (settingsRes.data) {
        setStoryPrivacy((settingsRes.data as any).story_privacy || "everyone");
      }
    });
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url;

      // Upload new avatar if selected
      if (selectedAvatar) {
        const avatarSrc = avatarOptions.find((a) => a.id === selectedAvatar)!.src;
        const res = await fetch(avatarSrc);
        const blob = await res.blob();
        const path = `${user.id}/avatar.png`;
        await supabase.storage.from("media").upload(path, blob, { upsert: true });
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        avatarUrl = urlData.publicUrl + "?t=" + Date.now(); // cache bust
      }

      await supabase.from("profiles").update({
        display_name: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        is_private: isPrivate,
        avatar_url: avatarUrl,
      }).eq("user_id", user.id);

      await supabase.from("user_settings").upsert({
        user_id: user.id,
        story_privacy: storyPrivacy,
      }, { onConflict: "user_id" });

      await refreshProfile();
      toast.success("Profile updated!");
      setActiveSection(null);
      setSelectedAvatar(null);
      setShowAvatarPicker(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const initials = (profile?.display_name || profile?.username || "?")
    .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  // Current avatar preview src
  const currentAvatarPreview = selectedAvatar
    ? avatarOptions.find((a) => a.id === selectedAvatar)?.src
    : profile?.avatar_url;

  if (activeSection === "edit") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => { setActiveSection(null); setSelectedAvatar(null); setShowAvatarPicker(false); }} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-sm font-semibold">Edit Profile</h1>
            <button onClick={saveProfile} disabled={saving} className="text-sm font-semibold text-foreground disabled:text-muted-foreground">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </header>
        <div className="px-4 pt-6 space-y-4">
          {/* Avatar with change button */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
              {currentAvatarPreview ? (
                <img src={currentAvatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-foreground">{initials}</span>
              )}
            </div>
            <button
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="text-xs font-semibold text-foreground"
            >
              Change Avatar
            </button>
          </div>

          {/* Avatar picker grid */}
          {showAvatarPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="grid grid-cols-5 gap-2.5 pb-2"
            >
              {avatarOptions.map((av) => (
                <button
                  key={av.id}
                  onClick={() => setSelectedAvatar(av.id)}
                  className="relative"
                >
                  <div className={`w-full aspect-square rounded-full overflow-hidden border-2 transition-all ${
                    selectedAvatar === av.id ? "border-foreground scale-105" : "border-border"
                  }`}>
                    <img src={av.src} alt="" className="w-full h-full object-cover" />
                  </div>
                  {selectedAvatar === av.id && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-foreground flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-background" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </motion.div>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none resize-none text-foreground" />
          </div>
        </div>
      </div>
    );
  }

  if (activeSection === "privacy") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => setActiveSection(null)} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-sm font-semibold">Privacy</h1>
          </div>
        </header>
        <div className="px-4 pt-4 space-y-4">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">Private Account</p>
              <p className="text-xs text-muted-foreground">Only approved followers can see your content</p>
            </div>
            <button onClick={() => setIsPrivate(!isPrivate)} className={`w-12 h-7 rounded-full transition-colors ${isPrivate ? "bg-foreground" : "bg-muted"}`}>
              <div className={`w-5 h-5 rounded-full bg-background transition-transform ${isPrivate ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Story Privacy</p>
            {["everyone", "followers", "close_friends"].map((opt) => (
              <button key={opt} onClick={() => setStoryPrivacy(opt)} className="flex items-center justify-between w-full py-3">
                <span className="text-sm capitalize">{opt.replace("_", " ")}</span>
                <div className={`w-5 h-5 rounded-full border-2 ${storyPrivacy === opt ? "border-foreground bg-foreground" : "border-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <button onClick={saveProfile} disabled={saving} className="w-full bg-foreground text-background rounded-xl py-3 text-sm font-medium mt-4">
            {saving ? "Saving..." : "Save Privacy Settings"}
          </button>
        </div>
      </div>
    );
  }

  if (activeSection === "liked") {
    return <SavedLikedSection type="liked" onBack={() => setActiveSection(null)} />;
  }

  if (activeSection === "saved") {
    return <SavedLikedSection type="saved" onBack={() => setActiveSection(null)} />;
  }

  if (activeSection === "close_friends") {
    return <CloseFriendsSection onBack={() => setActiveSection(null)} />;
  }

  const menuItems = [
    { icon: User, label: "Edit Profile", key: "edit" },
    { icon: Shield, label: "Privacy", key: "privacy" },
    { icon: Heart, label: "Liked Posts", key: "liked" },
    { icon: Bookmark, label: "Saved Posts", key: "saved" },
    { icon: Users, label: "Close Friends", key: "close_friends" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/profile")} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-sm font-semibold">Settings</h1>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-1">
        {menuItems.map((item, i) => (
          <motion.button
            key={item.key}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => setActiveSection(item.key)}
            className="flex items-center justify-between w-full py-3.5 border-b border-border"
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-sm">{item.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        ))}

        {/* Dark mode toggle */}
        <div className="flex items-center justify-between py-3.5 border-b border-border">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} /> : <Sun className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />}
            <span className="text-sm">Dark Mode</span>
          </div>
          <button onClick={toggleTheme} className={`w-12 h-7 rounded-full transition-colors ${theme === "dark" ? "bg-foreground" : "bg-muted"}`}>
            <div className={`w-5 h-5 rounded-full bg-background transition-transform ${theme === "dark" ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        <button onClick={handleSignOut} className="flex items-center gap-3 w-full py-3.5 text-destructive">
          <LogOut className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-sm font-medium">Log Out</span>
        </button>
      </div>
    </div>
  );
}

function SavedLikedSection({ type, onBack }: { type: "liked" | "saved"; onBack: () => void }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      if (type === "liked") {
        const { data: likes } = await supabase.from("likes").select("post_id").eq("user_id", user.id).not("post_id", "is", null);
        if (likes?.length) {
          const postIds = likes.map((l) => l.post_id!);
          const { data } = await supabase.from("posts").select("id, content, type, created_at").in("id", postIds).order("created_at", { ascending: false });
          setPosts(data || []);
        }
      } else {
        const { data: bookmarks } = await supabase.from("bookmarks").select("post_id").eq("user_id", user.id);
        if (bookmarks?.length) {
          const postIds = bookmarks.map((b) => b.post_id);
          const { data } = await supabase.from("posts").select("id, content, type, created_at").in("id", postIds).order("created_at", { ascending: false });
          setPosts(data || []);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [user, type]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-sm font-semibold">{type === "liked" ? "Liked Posts" : "Saved Posts"}</h1>
        </div>
      </header>
      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" /></div>
        ) : posts.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm mt-12">No {type} posts yet</p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="py-3 border-b border-border">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">{p.type}</span>
              <p className="text-sm mt-1.5 line-clamp-2">{p.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CloseFriendsSection({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [cfRes, followersRes] = await Promise.all([
        supabase.from("close_friends").select("friend_id").eq("user_id", user.id),
        supabase.from("follows").select("follower_id").eq("following_id", user.id),
      ]);

      const friendIds = new Set(cfRes.data?.map((f) => f.friend_id) || []);
      const followerIds = followersRes.data?.map((f) => f.follower_id) || [];

      if (followerIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", followerIds);
        setFollowers((profiles || []).map((p) => ({ ...p, isCloseFriend: friendIds.has(p.user_id) })));
      }
      setFriends(Array.from(friendIds));
      setLoading(false);
    };
    fetch();
  }, [user]);

  const toggleCloseFriend = async (friendId: string, isClose: boolean) => {
    if (!user) return;
    if (isClose) {
      await supabase.from("close_friends").delete().eq("user_id", user.id).eq("friend_id", friendId);
    } else {
      await supabase.from("close_friends").insert({ user_id: user.id, friend_id: friendId });
    }
    setFollowers((prev) => prev.map((f) => f.user_id === friendId ? { ...f, isCloseFriend: !isClose } : f));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-sm font-semibold">Close Friends</h1>
        </div>
      </header>
      <div className="px-4 pt-4">
        <p className="text-xs text-muted-foreground mb-4">People on your close friends list can see your close friends stories.</p>
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" /></div>
        ) : followers.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm mt-12">No followers yet</p>
        ) : (
          followers.map((f) => {
            const ini = (f.display_name || f.username || "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
            return (
              <div key={f.user_id} className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-medium overflow-hidden">
                    {f.avatar_url ? (
                      <img src={f.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      ini
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{f.display_name || "User"}</p>
                    <p className="text-xs text-muted-foreground">@{f.username || "user"}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleCloseFriend(f.user_id, f.isCloseFriend)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${f.isCloseFriend ? "bg-accent text-accent-foreground" : "bg-foreground text-background"}`}
                >
                  {f.isCloseFriend ? "Remove" : "Add"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
