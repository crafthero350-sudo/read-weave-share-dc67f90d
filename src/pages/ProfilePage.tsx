import { useState, useEffect } from "react";
import { Settings, Grid3X3, Bookmark, Film, Trash2, Sparkles } from "lucide-react";
import { NotionEmoji } from "@/components/NotionEmoji";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/hooks/useFollow";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EditProfileDialog } from "@/components/EditProfileDialog";

interface SavedCharacter {
  id: string;
  character_name: string;
  book_title: string;
  book_author: string;
  image_url: string;
}

interface UserPost {
  id: string;
  image_url: string | null;
  book_id: string | null;
  content: string;
  book_cover?: string | null;
}

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ booksRead: 0, posts: 0, discussions: 0 });
  const { followersCount, followingCount } = useFollow(user?.id || null);
  const [characters, setCharacters] = useState<SavedCharacter[]>([]);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "saved" | "characters">("posts");
  const [showEditProfile, setShowEditProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("user_books").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "finished"),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([booksRes, postsRes, commentsRes]) => {
      setStats({ booksRead: booksRes.count || 0, posts: postsRes.count || 0, discussions: commentsRes.count || 0 });
    });

    // Fetch user posts for grid
    supabase.from("posts").select("id, image_url, book_id, content").eq("user_id", user.id).order("created_at", { ascending: false }).then(async ({ data }) => {
      if (!data) return;
      const bookIds = data.map(p => p.book_id).filter(Boolean) as string[];
      let bookCovers = new Map<string, string>();
      if (bookIds.length > 0) {
        const { data: books } = await supabase.from("books").select("id, cover_url").in("id", bookIds);
        books?.forEach(b => { if (b.cover_url) bookCovers.set(b.id, b.cover_url); });
      }
      setPosts(data.map(p => ({ ...p, book_cover: p.book_id ? bookCovers.get(p.book_id) || null : null })));
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
      {/* Header — iOS large title style */}
      <header className="sticky top-0 z-30 ios-glass">
        <div className="flex items-center justify-between px-5 h-12">
          <h1 className="text-[17px] font-semibold tracking-tight">{profile?.username || "Profile"}</h1>
          <button
            aria-label="Settings"
            onClick={() => navigate("/settings")}
            className="ios-press w-10 h-10 rounded-full bg-secondary/70 flex items-center justify-center"
          >
            <Settings className="w-[19px] h-[19px] text-foreground" strokeWidth={1.6} />
          </button>
        </div>
      </header>

      <div className="px-5 pt-4">
        {/* Hero: large avatar + display name */}
        <div className="flex flex-col items-center text-center animate-spring-in">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-3xl font-bold text-foreground overflow-hidden shadow-md ring-1 ring-border">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <h2 className="ios-serif-title text-[26px] mt-3">{profile?.display_name || "Reader"}</h2>
          {profile?.bio && <p className="text-[14px] text-muted-foreground mt-1 max-w-xs">{profile.bio}</p>}
          {profile?.reading_personality && (
            <p className="text-[13px] mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pastel-lavender text-foreground">
              <NotionEmoji emoji="📚" size={14} /> {profile.reading_personality}
            </p>
          )}
        </div>

        {/* Statistics — soft pastel tiles */}
        <div className="grid grid-cols-3 gap-2.5 mt-6">
          <div className="ios-tile bg-pastel-mint text-center">
            <p className="text-[24px] font-bold tracking-tight leading-none">{stats.booksRead}</p>
            <p className="text-[11px] text-foreground/70 mt-1.5 uppercase tracking-wide font-medium">Books Read</p>
          </div>
          <div className="ios-tile bg-pastel-lavender text-center">
            <p className="text-[24px] font-bold tracking-tight leading-none">{stats.posts}</p>
            <p className="text-[11px] text-foreground/70 mt-1.5 uppercase tracking-wide font-medium">Posts</p>
          </div>
          <div className="ios-tile bg-pastel-peach text-center">
            <p className="text-[24px] font-bold tracking-tight leading-none">{stats.discussions}</p>
            <p className="text-[11px] text-foreground/70 mt-1.5 uppercase tracking-wide font-medium">Comments</p>
          </div>
        </div>

        {/* Followers row */}
        <div className="flex items-center justify-around mt-4 ios-card py-3">
          <button onClick={() => navigate(`/followers/${user?.id}?tab=followers`)} className="text-center ios-press">
            <p className="text-[17px] font-bold leading-tight">{followersCount}</p>
            <p className="text-[12px] text-muted-foreground">Followers</p>
          </button>
          <div className="w-px h-8 bg-border" />
          <button onClick={() => navigate(`/followers/${user?.id}?tab=following`)} className="text-center ios-press">
            <p className="text-[17px] font-bold leading-tight">{followingCount}</p>
            <p className="text-[12px] text-muted-foreground">Following</p>
          </button>
        </div>

        {/* Action buttons — iOS pill style */}
        <div className="flex gap-2.5 mt-4">
          <button
            onClick={() => setShowEditProfile(true)}
            className="ios-press flex-1 py-3 rounded-full bg-secondary text-foreground text-[14px] font-semibold"
          >
            Edit Profile
          </button>
          <button
            onClick={() => navigate("/quiz")}
            className="ios-press flex-1 py-3 rounded-full bg-primary text-primary-foreground text-[14px] font-semibold flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            {profile?.reading_personality ? "Retake Quiz" : "Take Quiz"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mt-6 mx-5 p-1 rounded-2xl bg-secondary/60">
        {[
          { key: "posts" as const, icon: Grid3X3, label: "Posts" },
          { key: "saved" as const, icon: Bookmark, label: "Saved" },
          { key: "characters" as const, icon: Film, label: "Characters" },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 rounded-xl text-[12px] font-semibold transition-all ${
              activeTab === key ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
            }`}
          >
            <Icon className="w-4 h-4" strokeWidth={1.7} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "posts" && (
        <div className="grid grid-cols-3 gap-1.5 px-5 mt-4">
          {posts.map((p) => (
            <button key={p.id} className="ios-press aspect-square rounded-2xl bg-secondary overflow-hidden shadow-xs" onClick={() => navigate(`/?post=${p.id}`)}>
              {(p.image_url || p.book_cover) ? (
                <img src={p.image_url || p.book_cover!} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-2">
                  <p className="text-[10px] text-muted-foreground text-center line-clamp-4">{p.content}</p>
                </div>
              )}
            </button>
          ))}
          {posts.length === 0 && (
            <div className="col-span-3 py-16 text-center">
              <Grid3X3 className="w-10 h-10 mx-auto text-muted-foreground mb-2" strokeWidth={1} />
              <p className="text-sm text-muted-foreground">No posts yet</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "saved" && (
        <div className="px-5 mt-4">
          <div className="ios-card py-16 text-center">
            <Bookmark className="w-10 h-10 mx-auto text-muted-foreground mb-2" strokeWidth={1} />
            <p className="text-sm text-muted-foreground">Saved posts will appear here</p>
          </div>
        </div>
      )}

      {activeTab === "characters" && (
        <div className="grid grid-cols-3 gap-1.5 px-5 mt-4">
          {characters.map((char) => (
            <div key={char.id} className="aspect-square bg-secondary relative group rounded-2xl overflow-hidden shadow-xs">
              <img src={char.image_url} alt={char.character_name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-center text-background">
                  <p className="text-xs font-semibold">{char.character_name}</p>
                  <p className="text-[10px]">{char.book_title}</p>
                </div>
              </div>
              <button
                onClick={() => deleteCharacter(char.id)}
                className="absolute top-1 right-1 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          ))}
          {characters.length === 0 && (
            <div className="col-span-3 py-16 text-center">
              <Film className="w-10 h-10 mx-auto text-muted-foreground mb-2" strokeWidth={1} />
              <p className="text-sm text-muted-foreground">No saved characters yet</p>
            </div>
          )}
        </div>
      )}
      <EditProfileDialog open={showEditProfile} onClose={() => setShowEditProfile(false)} />
    </div>
  );
}
