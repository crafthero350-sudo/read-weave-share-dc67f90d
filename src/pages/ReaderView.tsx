import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Bookmark, BookmarkCheck, List, Search, Type } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageFlip from "@/components/reader/PageFlip";
import ReaderSettingsSheet, { type ReaderTheme } from "@/components/reader/ReaderSettingsSheet";
import ReaderBookmarksSheet from "@/components/reader/ReaderBookmarksSheet";
import ReaderTOCSheet from "@/components/reader/ReaderTOCSheet";

// Theme palettes matching Apple Books
const themePalettes: Record<ReaderTheme, { bg: string; fg: string; muted: string; border: string }> = {
  light: { bg: "#ffffff", fg: "#1c1c1e", muted: "#8e8e93", border: "#e5e5ea" },
  sepia: { bg: "#f4ecd8", fg: "#5b4636", muted: "#8b7355", border: "#d4c4a8" },
  gray: { bg: "#e8e8e3", fg: "#3c3c3c", muted: "#6c6c6c", border: "#c8c8c3" },
  dark: { bg: "#1c1c1e", fg: "#d1d1d6", muted: "#636366", border: "#38383a" },
};

export default function ReaderView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Book data
  const [book, setBook] = useState<any>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Reader state
  const [currentPage, setCurrentPage] = useState(0);
  const [showControls, setShowControls] = useState(false);

  // Settings
  const [theme, setTheme] = useState<ReaderTheme>(() =>
    (localStorage.getItem("reader-theme") as ReaderTheme) || "light"
  );
  const [fontSize, setFontSize] = useState(() =>
    parseInt(localStorage.getItem("reader-font-size") || "18")
  );
  const [fontFamily, setFontFamily] = useState(() =>
    localStorage.getItem("reader-font-family") || "Georgia, serif"
  );
  const [lineHeight, setLineHeight] = useState(() =>
    parseFloat(localStorage.getItem("reader-line-height") || "1.8")
  );

  // Panels
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bmTab, setBmTab] = useState<"bookmarks" | "highlights">("bookmarks");

  // Data
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [tocItems, setTocItems] = useState<{ title: string; page: number }[]>([]);

  // Session tracking
  const sessionStart = useRef(Date.now());
  const sessionId = useRef<string | null>(null);

  // Fetch book from DB
  useEffect(() => {
    async function loadBook() {
      if (!id) return;
      const { data } = await supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setBook(data);
        // Use content array from DB, or generate sample pages
        if (data.content && data.content.length > 0) {
          setPages(data.content);
          // Generate TOC from chapter markers
          const toc: { title: string; page: number }[] = [];
          data.content.forEach((page: string, i: number) => {
            if (page.startsWith("Chapter") || page.startsWith("CHAPTER") || page.match(/^[A-Z\s]+\n/)) {
              const title = page.split("\n")[0].trim();
              toc.push({ title, page: i });
            }
          });
          setTocItems(toc);
        } else {
          // Generate sample content
          setPages(generateSamplePages(data.title, data.author));
        }
      }
      setLoading(false);
    }
    loadBook();
  }, [id]);

  // Load bookmarks & highlights
  useEffect(() => {
    if (!user || !id) return;
    const loadData = async () => {
      const [bmRes, hlRes] = await Promise.all([
        supabase.from("reader_bookmarks").select("*").eq("book_id", id).eq("user_id", user.id).order("page_number"),
        supabase.from("reader_highlights").select("*").eq("book_id", id).eq("user_id", user.id).order("page_number"),
      ]);
      if (bmRes.data) setBookmarks(bmRes.data);
      if (hlRes.data) setHighlights(hlRes.data);
    };
    loadData();
  }, [user, id]);

  // Load saved position
  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("user_books")
      .select("current_page")
      .eq("book_id", id)
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.current_page) setCurrentPage(data.current_page);
      });
  }, [user, id]);

  // Start reading session
  useEffect(() => {
    if (!user || !id) return;
    sessionStart.current = Date.now();
    supabase.from("reading_sessions").insert({
      user_id: user.id,
      book_id: id,
    }).select("id").single().then(({ data }) => {
      if (data) sessionId.current = data.id;
    });

    return () => {
      // End session on unmount
      if (sessionId.current) {
        const duration = Math.round((Date.now() - sessionStart.current) / 1000);
        supabase.from("reading_sessions").update({
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
        }).eq("id", sessionId.current).then(() => {});
      }
    };
  }, [user, id]);

  // Persist settings
  useEffect(() => { localStorage.setItem("reader-theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("reader-font-size", String(fontSize)); }, [fontSize]);
  useEffect(() => { localStorage.setItem("reader-font-family", fontFamily); }, [fontFamily]);
  useEffect(() => { localStorage.setItem("reader-line-height", String(lineHeight)); }, [lineHeight]);

  // Save progress
  const saveProgress = useCallback(async (page: number) => {
    if (!user || !id || pages.length === 0) return;
    const progress = Math.round(((page + 1) / pages.length) * 100);
    await supabase.from("user_books").upsert({
      user_id: user.id,
      book_id: id,
      current_page: page,
      progress,
      status: progress >= 100 ? "finished" : "reading",
    }, { onConflict: "user_id,book_id" as any });
  }, [user, id, pages.length]);

  const goNext = useCallback(() => {
    if (currentPage < pages.length - 1) {
      const next = currentPage + 1;
      setCurrentPage(next);
      saveProgress(next);
    }
  }, [currentPage, pages.length, saveProgress]);

  const goPrev = useCallback(() => {
    if (currentPage > 0) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      saveProgress(prev);
    }
  }, [currentPage, saveProgress]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    saveProgress(page);
  }, [saveProgress]);

  // Bookmark toggle
  const isBookmarked = bookmarks.some((b) => b.page_number === currentPage);
  const toggleBookmark = async () => {
    if (!user || !id) return;
    if (isBookmarked) {
      const bm = bookmarks.find((b) => b.page_number === currentPage);
      if (bm) {
        await supabase.from("reader_bookmarks").delete().eq("id", bm.id);
        setBookmarks((prev) => prev.filter((b) => b.id !== bm.id));
      }
    } else {
      const { data } = await supabase.from("reader_bookmarks").insert({
        user_id: user.id,
        book_id: id,
        page_number: currentPage,
        chapter_title: tocItems.find((t) => t.page <= currentPage)?.title || null,
      }).select().single();
      if (data) setBookmarks((prev) => [...prev, data]);
    }
  };

  const deleteBookmark = async (bmId: string) => {
    await supabase.from("reader_bookmarks").delete().eq("id", bmId);
    setBookmarks((prev) => prev.filter((b) => b.id !== bmId));
  };

  const deleteHighlight = async (hlId: string) => {
    await supabase.from("reader_highlights").delete().eq("id", hlId);
    setHighlights((prev) => prev.filter((h) => h.id !== hlId));
  };

  const palette = themePalettes[theme];
  const totalPages = pages.length;
  const progress = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: palette.bg }}>
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: palette.fg, borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: palette.bg, color: palette.fg }}>
        <p>Book not found</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: palette.bg, color: palette.fg }}>
      {/* Top bar */}
      <AnimatePresence>
        {showControls && (
          <motion.header
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute top-0 left-0 right-0 z-40"
            style={{
              backgroundColor: palette.bg + "ee",
              backdropFilter: "blur(20px)",
              borderBottom: `0.5px solid ${palette.border}`,
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
              <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm" style={{ color: "#007AFF" }}>
                <ChevronLeft className="w-5 h-5" strokeWidth={2} />
                <span>Library</span>
              </button>
              <div className="text-center flex-1 mx-4">
                <p className="text-xs font-medium truncate" style={{ color: palette.muted }}>{book.title}</p>
              </div>
              <button onClick={toggleBookmark} className="p-1">
                {isBookmarked ? (
                  <BookmarkCheck className="w-5 h-5" style={{ color: "#007AFF" }} strokeWidth={2} />
                ) : (
                  <Bookmark className="w-5 h-5" style={{ color: palette.muted }} strokeWidth={1.5} />
                )}
              </button>
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between px-4 pb-2 max-w-lg mx-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: palette.muted }}>⏱ {currentPage + 1}</span>
              </div>
              <span className="text-xs" style={{ color: palette.muted }}>
                {totalPages - currentPage - 1} pages left
              </span>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Reading area */}
      <PageFlip
        currentPage={currentPage}
        totalPages={totalPages}
        onNext={goNext}
        onPrev={goPrev}
        onTapCenter={() => setShowControls(!showControls)}
        theme={theme}
      >
        <div
          className="h-full overflow-y-auto overscroll-none"
          style={{
            padding: "3rem 1.75rem 4rem",
            fontFamily,
            fontSize: `${fontSize}px`,
            lineHeight: lineHeight,
            color: palette.fg,
          }}
        >
          <p className="whitespace-pre-line">{pages[currentPage]}</p>
        </div>
      </PageFlip>

      {/* Bottom bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-40"
            style={{
              backgroundColor: palette.bg + "ee",
              backdropFilter: "blur(20px)",
              borderTop: `0.5px solid ${palette.border}`,
            }}
          >
            <div className="max-w-lg mx-auto">
              {/* Progress slider */}
              <div className="px-6 pt-3">
                <input
                  type="range"
                  min={0}
                  max={totalPages - 1}
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value))}
                  className="w-full h-1 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${palette.fg} ${progress}%, ${palette.border} ${progress}%)`,
                    accentColor: palette.fg,
                  }}
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px]" style={{ color: palette.muted }}>
                    Page {currentPage + 1}
                  </span>
                  <span className="text-[11px]" style={{ color: palette.muted }}>
                    {totalPages} pages
                  </span>
                </div>
              </div>

              {/* Action buttons - Apple Books style */}
              <div className="flex items-center justify-around py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button onClick={() => setTocOpen(true)} className="flex flex-col items-center gap-0.5 p-2">
                  <List className="w-5 h-5" style={{ color: palette.muted }} strokeWidth={1.5} />
                  <span className="text-[10px]" style={{ color: palette.muted }}>Contents</span>
                </button>
                <button onClick={() => { setBmTab("bookmarks"); setBookmarksOpen(true); }} className="flex flex-col items-center gap-0.5 p-2">
                  <Bookmark className="w-5 h-5" style={{ color: palette.muted }} strokeWidth={1.5} />
                  <span className="text-[10px]" style={{ color: palette.muted }}>Bookmarks</span>
                </button>
                <button onClick={() => setSettingsOpen(true)} className="flex flex-col items-center gap-0.5 p-2">
                  <Type className="w-5 h-5" style={{ color: palette.muted }} strokeWidth={1.5} />
                  <span className="text-[10px]" style={{ color: palette.muted }}>Settings</span>
                </button>
                <button onClick={() => setSearchOpen(true)} className="flex flex-col items-center gap-0.5 p-2">
                  <Search className="w-5 h-5" style={{ color: palette.muted }} strokeWidth={1.5} />
                  <span className="text-[10px]" style={{ color: palette.muted }}>Search</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheets */}
      <ReaderSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        fontFamily={fontFamily}
        onFontFamilyChange={setFontFamily}
        lineHeight={lineHeight}
        onLineHeightChange={setLineHeight}
      />

      <ReaderBookmarksSheet
        open={bookmarksOpen}
        onClose={() => setBookmarksOpen(false)}
        theme={theme}
        bookmarks={bookmarks}
        highlights={highlights}
        onGoToPage={goToPage}
        onDeleteBookmark={deleteBookmark}
        onDeleteHighlight={deleteHighlight}
        activeTab={bmTab}
        onTabChange={setBmTab}
      />

      <ReaderTOCSheet
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        theme={theme}
        items={tocItems}
        currentPage={currentPage}
        onGoToPage={goToPage}
        totalPages={totalPages}
        progress={progress}
      />

      {/* Search modal */}
      <ReaderSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        theme={theme}
        pages={pages}
        onGoToPage={goToPage}
      />
    </div>
  );
}

// In-book search component
function ReaderSearch({ open, onClose, theme, pages, onGoToPage }: {
  open: boolean; onClose: () => void; theme: ReaderTheme;
  pages: string[]; onGoToPage: (p: number) => void;
}) {
  const [query, setQuery] = useState("");
  const palette = themePalettes[theme];

  const results = query.length > 2
    ? pages.reduce<{ page: number; snippet: string }[]>((acc, text, i) => {
        if (text.toLowerCase().includes(query.toLowerCase())) {
          const idx = text.toLowerCase().indexOf(query.toLowerCase());
          const start = Math.max(0, idx - 40);
          const end = Math.min(text.length, idx + query.length + 40);
          acc.push({ page: i, snippet: "..." + text.slice(start, end) + "..." });
        }
        return acc;
      }, [])
    : [];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ backgroundColor: palette.bg + "f5" }}
          >
            <div className="max-w-lg mx-auto p-4">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ backgroundColor: theme === "dark" ? "#2c2c2e" : "#f2f2f7" }}
                >
                  <Search className="w-4 h-4" style={{ color: palette.muted }} />
                  <input
                    type="text"
                    placeholder="Search in book..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: palette.fg }}
                  />
                </div>
                <button onClick={() => { onClose(); setQuery(""); }} className="text-sm" style={{ color: "#007AFF" }}>
                  Cancel
                </button>
              </div>

              <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => { onGoToPage(r.page); onClose(); setQuery(""); }}
                    className="w-full text-left p-3 rounded-xl"
                    style={{ backgroundColor: theme === "dark" ? "#2c2c2e" : "#f2f2f7" }}
                  >
                    <p className="text-xs mb-1" style={{ color: palette.muted }}>Page {r.page + 1}</p>
                    <p className="text-sm" style={{ color: palette.fg }}>{r.snippet}</p>
                  </button>
                ))}
                {query.length > 2 && results.length === 0 && (
                  <p className="text-sm text-center py-8" style={{ color: palette.muted }}>No results found</p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Generate sample pages for books without content
function generateSamplePages(title: string, author: string): string[] {
  const intro = `${title}\nby ${author}\n\n───────\n\nThis book awaits your reading journey. The full content will appear here once loaded.`;

  const sampleChapters = [
    `Chapter 1: The Beginning\n\nEvery great story begins with a single step into the unknown. The world stretches before us like an unwritten page, full of possibility and wonder.\n\nAs we turn each page, we discover not just the story of others, but reflections of ourselves — our hopes, our fears, our deepest aspirations.`,
    `The morning light filtered through ancient windows, casting long shadows across worn wooden floors. In this quiet moment, the world seemed to hold its breath, waiting for something extraordinary to unfold.\n\nBooks lined the walls from floor to ceiling, their spines a tapestry of colors and titles that spoke of adventures yet to be had.`,
    `Chapter 2: Discovery\n\nKnowledge is a garden. If it is not cultivated, it cannot be harvested. Every reader knows the sweet satisfaction of understanding blooming from careful attention.\n\nThe pages rustle softly, each one a doorway to a different world, a different time, a different perspective on the human experience.`,
    `The characters we meet in books become companions on our journey through life. They teach us empathy, courage, and the beauty of seeing the world through different eyes.\n\nIn the quiet hours of reading, we find not escape, but a deeper engagement with reality itself.`,
    `Chapter 3: Reflection\n\nWhat we learn from great books stays with us forever. The ideas planted by wise authors grow into mighty trees of understanding in the gardens of our minds.\n\nReading is not merely the consumption of words — it is a conversation across time, a dialogue between the reader and the author that transcends the boundaries of era and place.`,
  ];

  return [intro, ...sampleChapters];
}

// Need to declare searchOpen state - let me fix
// This is handled in the component above via useState
