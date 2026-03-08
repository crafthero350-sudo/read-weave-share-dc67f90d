import { useState, useEffect, useCallback } from "react";
import { Search as SearchIcon, Plus, Check, BookOpen, ArrowLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

const categories = ["All", "Fiction", "Non-Fiction", "Philosophy", "Self-Help", "Science", "History"];

export default function SearchScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [books, setBooks] = useState<BookData[]>([]);
  const [userBookIds, setUserBookIds] = useState<Set<string>>(new Set());
  const [userBooks, setUserBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<BookData | null>(null);

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

  useEffect(() => { fetchBooks(); fetchUserBooks(); }, [fetchBooks, fetchUserBooks]);

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

  const filtered = query
    ? books.filter((b) => b.title.toLowerCase().includes(query.toLowerCase()) || b.author.toLowerCase().includes(query.toLowerCase()))
    : books;

  const currentlyReading = userBooks.filter((ub) => ub.status === "reading");
  const wantToRead = userBooks.filter((ub) => ub.status === "want_to_read");
  const finished = userBooks.filter((ub) => ub.status === "finished");

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
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${ub.progress}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{100 - ub.progress}% remaining</p>
                </div>
              )}
              {ub && ub.status === "finished" && (
                <span className="inline-flex items-center gap-1 text-xs text-accent font-medium bg-accent/10 px-2 py-1 rounded-full">✓ Finished</span>
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
                {ub?.status === "reading" && (
                  <button onClick={() => updateProgress(ub.id, Math.min(ub.progress + 10, 100))} className="flex-1 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                    +10% Progress
                  </button>
                )}
                {ub?.status === "want_to_read" && (
                  <button onClick={() => updateProgress(ub.id, 1)} className="flex-1 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                    Start Reading
                  </button>
                )}
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
          {selectedBook.price != null && selectedBook.price > 0 && (
            <button className="w-full py-3.5 rounded-full bg-accent text-accent-foreground font-semibold text-sm">
              Buy for ${selectedBook.price.toFixed(2)}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3">
          <h1 className="font-display text-2xl font-bold mb-3">Search & Library</h1>
          <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-3 py-2.5">
            <SearchIcon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search books, authors..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 pt-4 space-y-6">
        {/* Currently Reading */}
        {currentlyReading.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-bold mb-3">📖 Currently Reading</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {currentlyReading.map((ub, i) => (
                <motion.button
                  key={ub.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    const book = books.find((b) => b.id === ub.book_id);
                    if (book) setSelectedBook(book);
                  }}
                  className="flex-shrink-0 w-40 bg-card rounded-2xl border border-border overflow-hidden text-left"
                >
                  <div className="w-full h-48 bg-muted">
                    {ub.book.cover_url ? (
                      <img src={ub.book.cover_url} alt={ub.book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">{ub.book.title}</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold truncate">{ub.book.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate mb-2">{ub.book.author}</p>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${ub.progress}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{ub.progress}% • {100 - ub.progress}% left</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* Finished */}
        {finished.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-bold mb-3">✓ Finished</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {finished.map((ub, i) => (
                <motion.button
                  key={ub.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    const book = books.find((b) => b.id === ub.book_id);
                    if (book) setSelectedBook(book);
                  }}
                  className="flex-shrink-0 w-28 text-left"
                >
                  <div className="w-28 h-40 rounded-2xl overflow-hidden bg-muted">
                    {ub.book.cover_url ? (
                      <img src={ub.book.cover_url} alt={ub.book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">{ub.book.title}</div>
                    )}
                  </div>
                  <p className="text-xs font-medium truncate mt-1">{ub.book.title}</p>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* All Books / Search Results */}
        <section>
          <h2 className="font-display text-lg font-bold mb-3">
            {query ? "Search Results" : "Explore Books"}
          </h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((book, i) => (
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
                    {/* Library indicator */}
                    {userBookIds.has(book.id) && (
                      <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="w-3 h-3" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold truncate">{book.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{book.author}</p>
                    {book.price != null && book.price > 0 && (
                      <p className="text-[11px] font-bold text-accent mt-0.5">${book.price.toFixed(2)}</p>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-center text-muted-foreground text-sm mt-12">No results found</p>
          )}
        </section>
      </div>
    </div>
  );
}
