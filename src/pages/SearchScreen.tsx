import { useState, useEffect, useCallback } from "react";
import { Search as SearchIcon, Plus, Check, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface BookData {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  description: string | null;
}

const categories = ["All", "Fiction", "Non-Fiction", "Philosophy", "Self-Help"];

export default function SearchScreen() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [books, setBooks] = useState<BookData[]>([]);
  const [userBookIds, setUserBookIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchBooks = useCallback(async () => {
    const { data } = await supabase
      .from("books")
      .select("id, title, author, cover_url, description")
      .order("title");
    if (data) setBooks(data);
    setLoading(false);
  }, []);

  const fetchUserBooks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_books")
      .select("book_id")
      .eq("user_id", user.id);
    if (data) setUserBookIds(new Set(data.map((ub) => ub.book_id)));
  }, [user]);

  useEffect(() => {
    fetchBooks();
    fetchUserBooks();
  }, [fetchBooks, fetchUserBooks]);

  const addToLibrary = async (bookId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("user_books").insert({
        user_id: user.id,
        book_id: bookId,
        status: "want_to_read",
      });
      if (error) throw error;
      setUserBookIds((prev) => new Set([...prev, bookId]));
      toast.success("Added to library!");
    } catch (err: any) {
      toast.error(err.message || "Failed to add book");
    }
  };

  const removeFromLibrary = async (bookId: string) => {
    if (!user) return;
    try {
      await supabase.from("user_books").delete().eq("user_id", user.id).eq("book_id", bookId);
      setUserBookIds((prev) => {
        const next = new Set(prev);
        next.delete(bookId);
        return next;
      });
      toast.success("Removed from library");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove book");
    }
  };

  const filtered = query
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(query.toLowerCase()) ||
          b.author.toLowerCase().includes(query.toLowerCase())
      )
    : books;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
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
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-foreground text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 pt-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((book, i) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex flex-col gap-2"
              >
                <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden shadow-sm bg-muted">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                      {book.title}
                    </div>
                  )}
                  {/* Add/Remove button */}
                  <button
                    onClick={() =>
                      userBookIds.has(book.id) ? removeFromLibrary(book.id) : addToLibrary(book.id)
                    }
                    className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                      userBookIds.has(book.id)
                        ? "bg-foreground text-background"
                        : "bg-background/80 text-foreground backdrop-blur-sm"
                    }`}
                  >
                    {userBookIds.has(book.id) ? (
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    ) : (
                      <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    )}
                  </button>
                </div>
                <div>
                  <p className="text-xs font-medium truncate">{book.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{book.author}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-12">No results found</p>
        )}
      </div>
    </div>
  );
}
