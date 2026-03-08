import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Bell, ShoppingCart } from "lucide-react";
import { StoriesRow } from "@/components/StoriesRow";
import { PostCard, type PostData } from "@/components/PostCard";
import { CreatePostSheet } from "@/components/CreatePostSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import bookappLogo from "@/assets/bookapp-logo.png";

interface BookData {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  price?: number;
}

const categories = ["All", "Arts", "Biography", "History", "Literature", "Philosophy", "Religion", "Science"];

export default function HomeScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchBooks = useCallback(async () => {
    const { data } = await supabase
      .from("books")
      .select("id, title, author, cover_url, price")
      .order("title");
    if (data) setBooks(data as BookData[]);
  }, []);

  const fetchPosts = useCallback(async () => {
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", userIds);

    const bookIds = postsData.map((p) => p.book_id).filter(Boolean) as string[];
    let booksMap = new Map();
    if (bookIds.length > 0) {
      const { data: booksData } = await supabase
        .from("books")
        .select("id, title, author, cover_url")
        .in("id", bookIds);
      booksData?.forEach((b) => booksMap.set(b.id, b));
    }

    let likedPostIds = new Set<string>();
    let savedPostIds = new Set<string>();
    if (user) {
      const postIds = postsData.map((p) => p.id);
      const [likesRes, bookmarksRes] = await Promise.all([
        supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds),
        supabase.from("bookmarks").select("post_id").eq("user_id", user.id).in("post_id", postIds),
      ]);
      likesRes.data?.forEach((l) => likedPostIds.add(l.post_id!));
      bookmarksRes.data?.forEach((b) => savedPostIds.add(b.post_id));
    }

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    const enriched: PostData[] = postsData.map((p) => ({
      ...p,
      profile: profileMap.get(p.user_id),
      book: p.book_id ? booksMap.get(p.book_id) || null : null,
      user_liked: likedPostIds.has(p.id),
      user_saved: savedPostIds.has(p.id),
    }));

    setPosts(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPosts();
    fetchBooks();
  }, [fetchPosts, fetchBooks]);

  const filteredBooks = searchQuery
    ? books.filter((b) => b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.author.toLowerCase().includes(searchQuery.toLowerCase()))
    : books;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={bookappLogo} alt="BookApp" className="w-7 h-7" />
            <h1 className="bookapp-title text-xl">BookApp</h1>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 text-muted-foreground"><Bell className="w-5 h-5" strokeWidth={1.5} /></button>
            <button className="p-2 text-muted-foreground"><ShoppingCart className="w-5 h-5" strokeWidth={1.5} /></button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
            <Search className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search title, years, author, etc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </header>

      {/* Explore Book section */}
      <section className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold">Explore Book</h2>
          <button className="text-primary text-xs font-semibold">See all &gt;&gt;</button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Book grid */}
        <div className="grid grid-cols-3 gap-3">
          {filteredBooks.slice(0, 6).map((book, i) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col gap-1.5"
            >
              <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden shadow-sm bg-muted">
                {book.cover_url ? (
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center font-display">
                    {book.title}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold truncate">{book.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">by {book.author}</p>
                {book.price !== undefined && book.price > 0 && (
                  <p className="text-[11px] font-bold text-primary mt-0.5">${book.price.toFixed(2)}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stories */}
      <section className="mt-6 border-t border-border pt-4">
        <div className="flex items-center justify-between px-4 mb-2">
          <h2 className="font-display text-lg font-bold">Stories</h2>
        </div>
        <StoriesRow />
      </section>

      {/* Feed */}
      <section className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-display text-lg font-bold">Feed</h2>
          {user && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 text-primary text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" /> Post
            </button>
          )}
        </div>
        <div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-muted-foreground text-sm">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            posts.map((post, i) => (
              <PostCard key={post.id} post={post} index={i} onRefresh={fetchPosts} />
            ))
          )}
        </div>
      </section>

      <CreatePostSheet open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchPosts} />
    </div>
  );
}