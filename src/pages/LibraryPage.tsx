import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Grid3X3, List, Plus, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";

interface UserBook {
  id: string;
  book_id: string;
  status: string;
  progress: number;
  current_page: number;
  book: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
  };
}

type SortMode = "recent" | "title" | "author";
type ViewMode = "grid" | "list";

export default function LibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userBooks, setUserBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [activeTab, setActiveTab] = useState<"all" | "reading" | "finished" | "want">("all");

  const fetchUserBooks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_books")
      .select("id, book_id, status, progress, current_page, book:books(id, title, author, cover_url)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (data) {
      setUserBooks(
        data.map((ub: any) => ({
          ...ub,
          book: ub.book,
          progress: ub.progress || 0,
          current_page: ub.current_page || 0,
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchUserBooks(); }, [fetchUserBooks]);

  const filtered = userBooks.filter((ub) => {
    if (activeTab === "all") return true;
    if (activeTab === "reading") return ub.status === "reading";
    if (activeTab === "finished") return ub.status === "finished";
    if (activeTab === "want") return ub.status === "want_to_read";
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === "title") return a.book.title.localeCompare(b.book.title);
    if (sortMode === "author") return a.book.author.localeCompare(b.book.author);
    return 0; // recent is default order from DB
  });

  const tabs = [
    { key: "all" as const, label: "All" },
    { key: "reading" as const, label: "Reading" },
    { key: "want" as const, label: "Want to Read" },
    { key: "finished" as const, label: "Finished" },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        {/* Apple Books style header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg">
          <div className="flex items-center justify-between px-5 pt-14 pb-2">
            <h1 className="text-[34px] font-bold tracking-tight text-foreground">Library</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
              >
                {viewMode === "grid" ? (
                  <List className="w-5 h-5 text-[#0A84FF]" strokeWidth={1.5} />
                ) : (
                  <Grid3X3 className="w-5 h-5 text-[#0A84FF]" strokeWidth={1.5} />
                )}
              </button>
              <button
                onClick={() => navigate("/search")}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <Plus className="w-5 h-5 text-[#0A84FF]" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 px-5 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort bar */}
          <div className="flex items-center justify-between px-5 py-2.5">
            <button
              onClick={() => {
                const modes: SortMode[] = ["recent", "title", "author"];
                const idx = modes.indexOf(sortMode);
                setSortMode(modes[(idx + 1) % modes.length]);
              }}
              className="flex items-center gap-1 text-sm text-muted-foreground"
            >
              <span>Sort: {sortMode === "recent" ? "Recent" : sortMode === "title" ? "Title" : "Author"}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-muted-foreground">{sorted.length} books</span>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <BookOpen className="w-10 h-10 text-muted-foreground" strokeWidth={1.2} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No Books Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {activeTab === "all"
                ? "Start building your library by adding books"
                : `No books in "${tabs.find(t => t.key === activeTab)?.label}" collection`}
            </p>
            <button
              onClick={() => navigate("/search")}
              className="px-5 py-2.5 bg-[#0A84FF] text-white rounded-full text-sm font-semibold"
            >
              Browse Books
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="px-5 pt-2 grid grid-cols-3 gap-x-4 gap-y-5">
            {sorted.map((ub, i) => (
              <motion.button
                key={ub.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/read/${ub.book_id}`)}
                className="text-left"
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-md bg-muted">
                  {ub.book.cover_url ? (
                    <img src={ub.book.cover_url} alt={ub.book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2 bg-gradient-to-br from-muted to-secondary">
                      <span className="text-xs text-muted-foreground text-center leading-tight">{ub.book.title}</span>
                    </div>
                  )}
                  {/* Progress indicator */}
                  {ub.status === "reading" && ub.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                      <div
                        className="h-full bg-[#0A84FF] transition-all"
                        style={{ width: `${ub.progress}%` }}
                      />
                    </div>
                  )}
                  {ub.status === "finished" && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white text-[10px]">✓</span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium mt-1.5 truncate text-foreground">{ub.book.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{ub.book.author}</p>
                {ub.status === "reading" && (
                  <p className="text-[10px] text-[#0A84FF] font-medium mt-0.5">{ub.progress}% complete</p>
                )}
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="px-5 pt-2 space-y-0">
            {sorted.map((ub, i) => (
              <motion.button
                key={ub.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/read/${ub.book_id}`)}
                className="flex items-center gap-3.5 w-full py-3 border-b border-border/50 text-left"
              >
                <div className="w-12 h-[72px] rounded-md overflow-hidden shadow-sm bg-muted flex-shrink-0">
                  {ub.book.cover_url ? (
                    <img src={ub.book.cover_url} alt={ub.book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-secondary">
                      <BookOpen className="w-5 h-5 text-muted-foreground" strokeWidth={1.2} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{ub.book.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{ub.book.author}</p>
                  {ub.status === "reading" && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1 rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-[#0A84FF] transition-all" style={{ width: `${ub.progress}%` }} />
                      </div>
                      <span className="text-[10px] text-[#0A84FF] font-medium">{ub.progress}%</span>
                    </div>
                  )}
                  {ub.status === "finished" && (
                    <span className="text-[10px] text-green-500 font-medium mt-1 block">Finished ✓</span>
                  )}
                  {ub.status === "want_to_read" && (
                    <span className="text-[10px] text-muted-foreground mt-1 block">Want to Read</span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
