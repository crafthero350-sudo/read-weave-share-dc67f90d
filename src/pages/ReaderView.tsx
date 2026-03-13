import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Bookmark, BookmarkCheck, List, Search, Type, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageFlipBook, { type PageFlipBookRef } from "@/components/reader/PageFlipBook";
import ReaderSettingsSheet, { type ReaderTheme } from "@/components/reader/ReaderSettingsSheet";
import ReaderBookmarksSheet from "@/components/reader/ReaderBookmarksSheet";
import ReaderTOCSheet from "@/components/reader/ReaderTOCSheet";

// Strict iOS color tokens
const themePalettes: Record<ReaderTheme, { bg: string; fg: string; muted: string; border: string }> = {
  light: { bg: "#FFFFFF", fg: "#000000", muted: "#6E6E73", border: "#D1D1D6" },
  sepia: { bg: "#F4ECD8", fg: "#3B2F1E", muted: "#8B7355", border: "#D4C4A8" },
  gray:  { bg: "#E8E8E3", fg: "#1C1C1E", muted: "#6E6E73", border: "#C8C8C3" },
  dark:  { bg: "#1C1C1E", fg: "#D1D1D6", muted: "#636366", border: "#38383A" },
};

export default function ReaderView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const flipBookRef = useRef<PageFlipBookRef>(null);

  const [book, setBook] = useState<any>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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

  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [tocItems, setTocItems] = useState<{ title: string; page: number }[]>([]);

  // Session tracking
  const sessionStart = useRef(Date.now());
  const sessionId = useRef<string | null>(null);

  // Fetch book
  useEffect(() => {
    async function loadBook() {
      if (!id) return;
      const { data } = await supabase.from("books").select("*").eq("id", id).single();
      if (data) {
        setBook(data);
        if (data.content && data.content.length > 0) {
          setPages(data.content);
          const toc: { title: string; page: number }[] = [];
          data.content.forEach((page: string, i: number) => {
            if (page.startsWith("Chapter") || page.startsWith("CHAPTER") || page.match(/^[A-Z\s]+\n/)) {
              toc.push({ title: page.split("\n")[0].trim(), page: i });
            }
          });
          setTocItems(toc);
        } else {
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
    supabase.from("reading_sessions").insert({ user_id: user.id, book_id: id })
      .select("id").single().then(({ data }) => {
        if (data) sessionId.current = data.id;
      });
    return () => {
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
      user_id: user.id, book_id: id, current_page: page, progress,
      status: progress >= 100 ? "finished" : "reading",
    }, { onConflict: "user_id,book_id" as any });
  }, [user, id, pages.length]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    saveProgress(page);
  }, [saveProgress]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    saveProgress(page);
    flipBookRef.current?.goToPage(page);
  }, [saveProgress]);

  // Bookmark
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
        user_id: user.id, book_id: id, page_number: currentPage,
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
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "#F2F2F7" }}>
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "#000", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "#F2F2F7" }}>
        <p style={{ color: "#6E6E73", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", fontSize: 17 }}>
          Book not found
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{ color: "#007AFF", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", fontSize: 17 }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        backgroundColor: palette.bg,
        color: palette.fg,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', sans-serif",
      }}
    >
      {/* === TOP NAV BAR === */}
      <AnimatePresence>
        {showControls && (
          <motion.header
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="absolute top-0 left-0 right-0 z-40"
            style={{
              backgroundColor: palette.bg + "F0",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderBottom: `0.5px solid ${palette.border}`,
            }}
          >
            <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 max-w-lg mx-auto">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-0.5 min-w-[44px] min-h-[44px]"
                style={{ color: "#007AFF" }}
              >
                <ChevronLeft className="w-[22px] h-[22px]" strokeWidth={2.5} />
                <span style={{ fontSize: 17 }}>Library</span>
              </button>

              <div className="text-center flex-1 mx-4 truncate">
                <p className="text-[13px] font-medium truncate" style={{ color: palette.muted, letterSpacing: -0.08 }}>
                  {book.title}
                </p>
              </div>

              <button
                onClick={toggleBookmark}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-[22px] h-[22px]" style={{ color: "#007AFF" }} strokeWidth={2} />
                ) : (
                  <Bookmark className="w-[22px] h-[22px]" style={{ color: palette.muted }} strokeWidth={1.5} />
                )}
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* === PAGE FLIP READING AREA === */}
      <PageFlipBook
        ref={flipBookRef}
        pages={pages}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onTapCenter={() => setShowControls(!showControls)}
        fontSize={fontSize}
        fontFamily={fontFamily}
        lineHeight={lineHeight}
        theme={theme}
        palette={palette}
      />

      {/* === BOTTOM CONTROLS === */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="absolute bottom-0 left-0 right-0 z-40"
            style={{
              backgroundColor: palette.bg + "F0",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderTop: `0.5px solid ${palette.border}`,
            }}
          >
            <div className="max-w-lg mx-auto">
              {/* Page progress slider */}
              <div className="px-5 pt-3">
                <input
                  type="range"
                  min={0}
                  max={Math.max(totalPages - 1, 1)}
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value))}
                  className="w-full h-[3px] rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #007AFF ${progress}%, ${palette.border} ${progress}%)`,
                    WebkitAppearance: "none",
                    outline: "none",
                  }}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span style={{ fontSize: 11, color: palette.muted, letterSpacing: -0.08 }}>
                    Page {currentPage + 1}
                  </span>
                  <span style={{ fontSize: 11, color: palette.muted, letterSpacing: -0.08 }}>
                    {totalPages - currentPage - 1} pages left
                  </span>
                </div>
              </div>

              {/* Apple Books bottom action bar */}
              <div className="flex items-center justify-around py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {[
                  { icon: <List className="w-[22px] h-[22px]" strokeWidth={1.4} />, label: "Contents", action: () => setTocOpen(true) },
                  { icon: <Bookmark className="w-[22px] h-[22px]" strokeWidth={1.4} />, label: "Bookmarks", action: () => { setBmTab("bookmarks"); setBookmarksOpen(true); } },
                  { icon: <Type className="w-[20px] h-[20px]" strokeWidth={1.6} />, label: "Aa", action: () => setSettingsOpen(true) },
                  { icon: <Search className="w-[20px] h-[20px]" strokeWidth={1.6} />, label: "Search", action: () => setSearchOpen(true) },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    className="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center"
                    style={{ color: palette.muted }}
                  >
                    {btn.icon}
                    <span style={{ fontSize: 10, letterSpacing: -0.08 }}>{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === SHEETS === */}
      <ReaderSettingsSheet
        open={settingsOpen} onClose={() => setSettingsOpen(false)}
        theme={theme} onThemeChange={setTheme}
        fontSize={fontSize} onFontSizeChange={setFontSize}
        fontFamily={fontFamily} onFontFamilyChange={setFontFamily}
        lineHeight={lineHeight} onLineHeightChange={setLineHeight}
      />
      <ReaderBookmarksSheet
        open={bookmarksOpen} onClose={() => setBookmarksOpen(false)}
        theme={theme} bookmarks={bookmarks} highlights={highlights}
        onGoToPage={goToPage} onDeleteBookmark={deleteBookmark}
        onDeleteHighlight={deleteHighlight} activeTab={bmTab} onTabChange={setBmTab}
      />
      <ReaderTOCSheet
        open={tocOpen} onClose={() => setTocOpen(false)}
        theme={theme} items={tocItems} currentPage={currentPage}
        onGoToPage={goToPage} totalPages={totalPages} progress={progress}
      />
      <ReaderSearch
        open={searchOpen} onClose={() => setSearchOpen(false)}
        theme={theme} pages={pages} onGoToPage={goToPage}
      />
    </div>
  );
}

// === SEARCH ===
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
          acc.push({ page: i, snippet: "…" + text.slice(start, end) + "…" });
        }
        return acc;
      }, [])
    : [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
          style={{ backgroundColor: palette.bg + "F5" }}
        >
          <div className="max-w-lg mx-auto p-4">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: theme === "dark" ? "#2C2C2E" : "#F2F2F7" }}
              >
                <Search className="w-4 h-4" style={{ color: palette.muted }} />
                <input
                  type="text"
                  placeholder="Search in book…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: palette.fg, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}
                />
              </div>
              <button
                onClick={() => { onClose(); setQuery(""); }}
                style={{ color: "#007AFF", fontSize: 17, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}
              >
                Cancel
              </button>
            </div>

            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => { onGoToPage(r.page); onClose(); setQuery(""); }}
                  className="w-full text-left p-3 rounded-xl"
                  style={{ backgroundColor: theme === "dark" ? "#2C2C2E" : "#F2F2F7" }}
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
      )}
    </AnimatePresence>
  );
}

// === SAMPLE PAGES ===
function generateSamplePages(title: string, author: string): string[] {
  const intro = `${title}\nby ${author}\n\n───────\n\nThis book awaits your reading journey. The full content will appear here once loaded.`;
  const chapters = [
    `Chapter 1: The Beginning\n\nEvery great story begins with a single step into the unknown. The world stretches before us like an unwritten page, full of possibility and wonder.\n\nAs we turn each page, we discover not just the story of others, but reflections of ourselves — our hopes, our fears, our deepest aspirations.\n\nThe morning light filtered through ancient windows, casting long shadows across worn wooden floors. In this quiet moment, the world seemed to hold its breath.`,
    `Books lined the walls from floor to ceiling, their spines a tapestry of colors and titles that spoke of adventures yet to be had.\n\nShe reached for the nearest volume, her fingers tracing the embossed lettering on its cover. The leather was warm to the touch, as though the book itself held some inner fire.\n\n"Every book is a door," her grandmother used to say. "You just need the courage to turn the handle."`,
    `Chapter 2: Discovery\n\nKnowledge is a garden. If it is not cultivated, it cannot be harvested. Every reader knows the sweet satisfaction of understanding blooming from careful attention.\n\nThe pages rustle softly, each one a doorway to a different world, a different time, a different perspective on the human experience.\n\nIn the library's deepest alcove, she found what she had been searching for — not a book, but a beginning.`,
    `The characters we meet in books become companions on our journey through life. They teach us empathy, courage, and the beauty of seeing the world through different eyes.\n\nIn the quiet hours of reading, we find not escape, but a deeper engagement with reality itself.\n\n"To read is to fly," the old librarian whispered, adjusting his spectacles. "It is to see the world from a place you could never otherwise reach."`,
    `Chapter 3: Reflection\n\nWhat we learn from great books stays with us forever. The ideas planted by wise authors grow into mighty trees of understanding in the gardens of our minds.\n\nReading is not merely the consumption of words — it is a conversation across time, a dialogue between the reader and the author that transcends the boundaries of era and place.\n\nAnd so the story continues, page by page, word by word, into the infinite landscape of imagination.`,
  ];
  return [intro, ...chapters];
}
