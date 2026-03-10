import { useState, useEffect, useCallback } from "react";
import { Search as SearchIcon, Plus, Check, ArrowLeft, Globe, Sparkles, User, BookOpen, TrendingUp, Download, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { NotionEmoji } from "@/components/NotionEmoji";
import { Badge } from "@/components/ui/badge";

interface BookData {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  description: string | null;
  price: number | null;
}

interface UserBook {
  id: string;
  book_id: string;
  status: string;
  progress: number;
  current_page: number;
  book: { id: string; title: string; author: string; cover_url: string | null };
}

interface PostResult {
  id: string;
  content: string;
  type: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null };
}

interface DiscoverBook {
  key: string;
  title: string;
  author: string;
  cover_i: number | null;
  first_publish_year: number | null;
  subjects: string[];
  isbn: string | null;
  languages: string[];
  status: "FREE" | "INFO_ONLY";
  gutenberg_id: number | null;
  epub_url: string | null;
}

interface TrendingBook {
  gutenberg_id: number;
  title: string;
  author: string;
  cover_url: string | null;
  subjects: string[];
  download_count: number;
  epub_url: string | null;
  status: "FREE";
}

interface UserResult {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

type SearchFilter = "all" | "books" | "discover" | "posts" | "users" | "ai";

export default function SearchScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<SearchFilter>("all");
  const [books, setBooks] = useState<BookData[]>([]);
  const [userBookIds, setUserBookIds] = useState<Set<string>>(new Set());
  const [userBooks, setUserBooks] = useState<UserBook[]>([]);
  const [postResults, setPostResults] = useState<PostResult[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [discoverBooks, setDiscoverBooks] = useState<DiscoverBook[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<TrendingBook[]>([]);
  const [aiResults, setAiResults] = useState("");
  const [loading, setLoading] = useState(true);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [importingBook, setImportingBook] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookData | null>(null);
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  const fetchBooks = useCallback(async () => {
    const { data } = await supabase.from("books").select("id, title, author, cover_url, description, price").order("title");
    if (data) setBooks(data as BookData[]);
    setLoading(false);
  }, []);

  const fetchUserBooks = useCallback(async () => {
    if (!user) return;
    const [ubRes, ubDetailRes] = await Promise.all([
      supabase.from("user_books").select("book_id").eq("user_id", user.id),
      supabase.from("user_books").select("id, book_id, status, progress, current_page, book:books(id, title, author, cover_url)").eq("user_id", user.id).order("updated_at", { ascending: false }),
    ]);
    if (ubRes.data) setUserBookIds(new Set(ubRes.data.map((ub) => ub.book_id)));
    if (ubDetailRes.data) {
      setUserBooks(ubDetailRes.data.map((ub: any) => ({ ...ub, progress: ub.progress || 0, current_page: ub.current_page || 0 })));
    }
  }, [user]);

  const fetchTrending = useCallback(async () => {
    setTrendingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("book-discover", {
        body: { action: "trending" },
      });
      if (error) throw error;
      setTrendingBooks(data?.trending || []);
    } catch {
      // Silent fail for trending
    }
    setTrendingLoading(false);
  }, []);

  const searchDiscover = useCallback(async (q: string) => {
    if (!q.trim()) { setDiscoverBooks([]); return; }
    setDiscoverLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("book-discover", {
        body: { action: "search", query: q },
      });
      if (error) throw error;
      setDiscoverBooks(data?.results || []);
    } catch {
      toast.error("Failed to search books");
    }
    setDiscoverLoading(false);
  }, []);

  const searchPosts = useCallback(async (q: string) => {
    if (!q.trim()) { setPostResults([]); return; }
    const { data: postsData } = await supabase
      .from("posts").select("id, content, type, image_url, created_at, user_id")
      .ilike("content", `%${q}%`).order("created_at", { ascending: false }).limit(20);
    if (!postsData?.length) { setPostResults([]); return; }
    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", userIds);
    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
    setPostResults(postsData.map((p) => ({ ...p, profile: profileMap.get(p.user_id) })));
  }, []);

  const searchUsers = useCallback(async (q: string) => {
    if (!q.trim()) { setUserResults([]); return; }
    const { data } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url, bio")
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(20);
    setUserResults((data || []) as UserResult[]);
  }, []);

  const searchAI = useCallback(async (q: string) => {
    if (!q.trim()) { setAiResults(""); return; }
    setAiLoading(true);
    setAiResults("");
    try {
      const resp = await supabase.functions.invoke("ai-recommend", { body: { mood: q } });
      if (resp.error) throw resp.error;

      // The ai-recommend function streams SSE — read & parse the stream
      if (resp.data instanceof ReadableStream) {
        const reader = resp.data.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content || "";
                fullText += content;
                setAiResults(fullText);
              } catch { /* skip non-json lines */ }
            }
          }
        }
        if (!fullText) setAiResults("No recommendations found.");
      } else if (typeof resp.data === "string") {
        setAiResults(resp.data || "No recommendations found.");
      } else if (resp.data && typeof resp.data === "object") {
        setAiResults(resp.data.recommendation || resp.data.text || JSON.stringify(resp.data));
      } else {
        setAiResults("No recommendations found.");
      }
    } catch { setAiResults("Failed to get AI recommendations."); }
    setAiLoading(false);
  }, []);

  useEffect(() => { fetchBooks(); fetchUserBooks(); fetchTrending(); }, [fetchBooks, fetchUserBooks, fetchTrending]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query.trim()) {
        searchPosts(query);
        searchUsers(query);
        if (activeFilter === "discover" || activeFilter === "all") searchDiscover(query);
        if (activeFilter === "ai") searchAI(query);
      } else {
        setPostResults([]); setUserResults([]); setDiscoverBooks([]); setAiResults("");
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [query, activeFilter, searchPosts, searchUsers, searchDiscover, searchAI]);

  const addToLibrary = async (bookId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("user_books").insert({ user_id: user.id, book_id: bookId, status: "want_to_read" });
      if (error) throw error;
      setUserBookIds((prev) => new Set([...prev, bookId]));
      toast.success("Added to library!");
      fetchUserBooks();
    } catch (err: any) { toast.error(err.message || "Failed to add book"); }
  };

  const importFreeBook = async (book: DiscoverBook | TrendingBook) => {
    if (!user) return;
    const bookKey = "key" in book ? book.key : `gut-${book.gutenberg_id}`;
    setImportingBook(bookKey);
    try {
      const gutId = book.gutenberg_id;
      if (!gutId) throw new Error("No Gutenberg ID");

      // Fetch full book data with text content
      const { data: epubData, error: epubError } = await supabase.functions.invoke("book-discover", {
        body: { action: "get_epub", gutenberg_id: gutId },
      });
      if (epubError) throw epubError;

      const title = book.title;
      const author = book.author;
      const coverUrl = "cover_i" in book && book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
        : "cover_url" in book ? book.cover_url : null;

      // Check if book already exists in DB
      const { data: existing } = await supabase.from("books")
        .select("id").eq("title", title).eq("author", author).maybeSingle();

      let bookId: string;
      if (existing) {
        bookId = existing.id;
        // Update content if we have text
        if (epubData?.text_content?.length) {
          await supabase.from("books").update({
            content: epubData.text_content,
            description: (epubData.subjects || []).join(", ") || null,
          }).eq("id", bookId);
        }
      } else {
        const { data: newBook, error } = await supabase.from("books").insert({
          title,
          author,
          cover_url: coverUrl,
          content: epubData?.text_content || null,
          description: ("subjects" in book ? book.subjects : epubData?.subjects || []).join(", ") || null,
          price: 0,
        }).select("id").single();
        if (error) throw error;
        bookId = newBook.id;
      }

      // Add to user library
      const { error: ubError } = await supabase.from("user_books").insert({
        user_id: user.id, book_id: bookId, status: "want_to_read",
      });
      if (ubError && !ubError.message.includes("duplicate")) throw ubError;

      setUserBookIds((prev) => new Set([...prev, bookId]));
      toast.success(`"${title}" imported! Ready to read.`);
      fetchBooks();
      fetchUserBooks();
    } catch (err: any) {
      toast.error(err.message || "Failed to import book");
    }
    setImportingBook(null);
  };

  const removeFromLibrary = async (bookId: string) => {
    if (!user) return;
    await supabase.from("user_books").delete().eq("user_id", user.id).eq("book_id", bookId);
    setUserBookIds((prev) => { const n = new Set(prev); n.delete(bookId); return n; });
    fetchUserBooks();
    toast.success("Removed from library");
  };

  const updateProgress = async (userBookId: string, newProgress: number) => {
    const status = newProgress >= 100 ? "finished" : newProgress > 0 ? "reading" : "want_to_read";
    await supabase.from("user_books").update({
      progress: Math.min(newProgress, 100), status,
      ...(newProgress >= 100 ? { finished_at: new Date().toISOString() } : {}),
      ...(newProgress > 0 && status === "reading" ? { started_at: new Date().toISOString() } : {}),
    }).eq("id", userBookId);
    if (user) {
      await supabase.from("activity_log").insert({ user_id: user.id, activity_type: "reading", metadata: { progress: newProgress } });
    }
    fetchUserBooks();
  };

  const filteredBooks = query
    ? books.filter((b) => b.title.toLowerCase().includes(query.toLowerCase()) || b.author.toLowerCase().includes(query.toLowerCase()))
    : books;

  const displayedDiscover = showFreeOnly ? discoverBooks.filter((b) => b.status === "FREE") : discoverBooks;

  const showBooks = activeFilter === "all" || activeFilter === "books";
  const showPosts = (activeFilter === "all" || activeFilter === "posts") && query.trim();
  const showUsers = (activeFilter === "all" || activeFilter === "users") && query.trim();
  const showDiscover = activeFilter === "discover";
  const showAI = activeFilter === "ai" && query.trim();

  // Book detail view
  if (selectedBook) {
    const ub = userBooks.find((u) => u.book_id === selectedBook.id);
    const inLibrary = userBookIds.has(selectedBook.id);
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => setSelectedBook(null)} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="font-display text-lg font-bold truncate">{selectedBook.title}</h1>
          </div>
        </header>
        <div className="px-4 pt-6 space-y-6">
          <div className="flex gap-4">
            <div className="w-32 aspect-[2/3] rounded-2xl overflow-hidden bg-muted shadow-sm flex-shrink-0">
              {selectedBook.cover_url ? (
                <img src={selectedBook.cover_url} alt={selectedBook.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">{selectedBook.title}</div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="font-display text-xl font-bold">{selectedBook.title}</h2>
              <p className="text-sm text-muted-foreground">by {selectedBook.author}</p>
              {selectedBook.price != null && selectedBook.price === 0 && (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Free to Read</Badge>
              )}
              {selectedBook.price != null && selectedBook.price > 0 && (
                <p className="text-lg font-bold text-accent">${selectedBook.price.toFixed(2)}</p>
              )}
              {ub && ub.status === "reading" && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{ub.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${ub.progress}%` }} />
                  </div>
                </div>
              )}
              {ub && ub.status === "finished" && (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">✓ Finished</span>
              )}
            </div>
          </div>
          {selectedBook.description && (
            <div>
              <h3 className="font-semibold text-sm mb-1">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedBook.description}</p>
            </div>
          )}
          <div className="flex gap-2">
            {inLibrary ? (
              <>
                <button onClick={() => navigate(`/read/${selectedBook.id}`)} className="flex-1 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2">
                  <BookOpen className="w-4 h-4" /> Read Now
                </button>
                <button onClick={() => { removeFromLibrary(selectedBook.id); setSelectedBook(null); }} className="px-6 py-3 rounded-full border-2 border-border text-foreground font-semibold text-sm">
                  Remove
                </button>
              </>
            ) : (
              <button onClick={() => addToLibrary(selectedBook.id)} className="flex-1 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                Add to Library
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const filters: { value: SearchFilter; label: string; icon?: React.ReactNode }[] = [
    { value: "all", label: "All" },
    { value: "discover", label: "Discover", icon: <Globe className="w-3 h-3" /> },
    { value: "books", label: "Library" },
    { value: "users", label: "Users", icon: <User className="w-3 h-3" /> },
    { value: "posts", label: "Posts" },
    { value: "ai", label: "AI", icon: <Sparkles className="w-3 h-3" /> },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3">
          <h1 className="font-display text-2xl font-bold mb-3">Search</h1>
          <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-3 py-2.5">
            <SearchIcon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <input
              type="text"
              placeholder={
                activeFilter === "ai" ? "Ask AI for book recommendations..." :
                activeFilter === "discover" ? "Search free & public domain books..." :
                "Search books, users, posts..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && activeFilter === "ai") searchAI(query); }}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeFilter === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {f.icon}{f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 pt-4 space-y-6">

        {/* Discover Section */}
        {showDiscover && (
          <>
            {/* Free only toggle */}
            {query.trim() && discoverBooks.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{displayedDiscover.length} results</p>
                <button
                  onClick={() => setShowFreeOnly(!showFreeOnly)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    showFreeOnly ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "text-muted-foreground bg-muted"
                  }`}
                >
                  {showFreeOnly ? "✓ Free Only" : "Show Free Only"}
                </button>
              </div>
            )}

            {/* Search results */}
            {query.trim() ? (
              discoverLoading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-muted-foreground">Searching books & checking free availability...</span>
                </div>
              ) : displayedDiscover.length > 0 ? (
                <div className="space-y-2">
                  {displayedDiscover.map((db, i) => {
                    const bookKey = db.key;
                    const isImporting = importingBook === bookKey;
                    return (
                      <motion.div
                        key={bookKey}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                      >
                        <div className="w-14 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {db.cover_i ? (
                            <img src={`https://covers.openlibrary.org/b/id/${db.cover_i}-M.jpg`} alt={db.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground p-1 text-center">{db.title}</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{db.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{db.author}</p>
                          {db.first_publish_year && <p className="text-[10px] text-muted-foreground">{db.first_publish_year}</p>}
                          <div className="mt-1">
                            {db.status === "FREE" ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0">
                                Free to Read
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                Info Only
                              </Badge>
                            )}
                          </div>
                        </div>
                        {db.status === "FREE" ? (
                          <button
                            onClick={() => importFreeBook(db)}
                            disabled={isImporting}
                            className="px-3 py-2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                          >
                            {isImporting ? (
                              <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            Read Now
                          </button>
                        ) : (
                          <button className="px-3 py-2 rounded-full bg-muted text-muted-foreground text-xs font-medium flex items-center gap-1.5 flex-shrink-0">
                            <Eye className="w-3.5 h-3.5" />Details
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-8">No results found</p>
              )
            ) : (
              /* Trending free books when no query */
              <section>
                <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" /> Trending Free Books
                </h2>
                {trendingLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : trendingBooks.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {trendingBooks.map((tb, i) => {
                      const bookKey = `gut-${tb.gutenberg_id}`;
                      const isImporting = importingBook === bookKey;
                      return (
                        <motion.div
                          key={tb.gutenberg_id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex flex-col gap-1.5"
                        >
                          <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-muted">
                            {tb.cover_url ? (
                              <img src={tb.cover_url} alt={tb.title} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground p-2 text-center">{tb.title}</div>
                            )}
                            <div className="absolute top-1.5 left-1.5">
                              <Badge className="bg-emerald-500/90 text-white border-0 text-[9px] px-1.5 py-0">FREE</Badge>
                            </div>
                          </div>
                          <p className="text-xs font-semibold truncate">{tb.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{tb.author}</p>
                          <button
                            onClick={() => importFreeBook(tb)}
                            disabled={isImporting}
                            className="w-full py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            {isImporting ? (
                              <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Download className="w-3 h-3" /> Import
                              </>
                            )}
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-4">Could not load trending books</p>
                )}
              </section>
            )}
          </>
        )}

        {/* AI Results */}
        {showAI && (
          <section>
            <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> AI Recommendations
            </h2>
            {aiLoading ? (
              <div className="flex items-center gap-3 py-8 justify-center">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">AI is thinking...</span>
              </div>
            ) : aiResults ? (
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{aiResults}</p>
              </div>
            ) : query.trim() ? (
              <p className="text-center text-muted-foreground text-sm py-4">Press Enter to get AI recommendations</p>
            ) : null}
          </section>
        )}

        {/* User results */}
        {showUsers && userResults.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2"><User className="w-5 h-5" /> People</h2>
            <div className="space-y-1">
              {userResults.filter(u => u.user_id !== user?.id).map((u, i) => (
                <motion.button
                  key={u.user_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/user/${u.user_id}`)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-accent transition-colors"
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {(u.display_name || u.username || "?")[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="text-left min-w-0">
                    <p className="text-sm font-semibold truncate">{u.username || "user"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.display_name}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* Post results */}
        {showPosts && postResults.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2"><NotionEmoji emoji="📝" size={20} /> Posts</h2>
            <div className="space-y-2">
              {postResults.map((p) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border">
                  {p.profile?.avatar_url ? (
                    <img src={p.profile.avatar_url} className="w-9 h-9 rounded-full object-cover flex-shrink-0" alt="" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">{(p.profile?.display_name || "?")[0]}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">{p.profile?.username || "user"}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p.type}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{p.content}</p>
                  </div>
                  {p.image_url && <img src={p.image_url} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" alt="" />}
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Library books */}
        {showBooks && (
          <section>
            <h2 className="font-display text-lg font-bold mb-3">{query ? "Book Results" : "Explore Books"}</h2>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {filteredBooks.map((book, i) => (
                  <motion.button
                    key={book.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedBook(book)}
                    className="flex flex-col gap-1.5 text-left"
                  >
                    <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-muted">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center font-display">{book.title}</div>
                      )}
                      {userBookIds.has(book.id) && (
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="w-3 h-3" strokeWidth={2.5} />
                        </div>
                      )}
                      {book.price === 0 && (
                        <div className="absolute top-1.5 left-1.5">
                          <Badge className="bg-emerald-500/90 text-white border-0 text-[9px] px-1.5 py-0">FREE</Badge>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold truncate">{book.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{book.author}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
            {!loading && filteredBooks.length === 0 && (
              <p className="text-center text-muted-foreground text-sm mt-12">No books found</p>
            )}
          </section>
        )}

        {/* Trending on home when "all" and no query */}
        {activeFilter === "all" && !query.trim() && trendingBooks.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Free Public Domain Books
            </h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {trendingBooks.slice(0, 6).map((tb) => {
                const bookKey = `gut-${tb.gutenberg_id}`;
                return (
                  <div key={tb.gutenberg_id} className="flex-shrink-0 w-28 flex flex-col gap-1.5">
                    <div className="relative w-28 h-40 rounded-xl overflow-hidden bg-muted">
                      {tb.cover_url ? (
                        <img src={tb.cover_url} alt={tb.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground p-2 text-center">{tb.title}</div>
                      )}
                      <div className="absolute top-1 left-1">
                        <Badge className="bg-emerald-500/90 text-white border-0 text-[8px] px-1 py-0">FREE</Badge>
                      </div>
                    </div>
                    <p className="text-[11px] font-semibold truncate">{tb.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{tb.author}</p>
                    <button
                      onClick={() => importFreeBook(tb)}
                      disabled={importingBook === bookKey}
                      className="w-full py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold disabled:opacity-50"
                    >
                      {importingBook === bookKey ? "..." : "Import"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {query && !showDiscover && !showAI && showPosts && postResults.length === 0 && showBooks && filteredBooks.length === 0 && userResults.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-12">No results found for "{query}"</p>
        )}
      </div>
    </div>
  );
}
