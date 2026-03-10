import { X, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ReaderTheme } from "./ReaderSettingsSheet";

interface Bookmark {
  id: string;
  page_number: number;
  chapter_title: string | null;
  created_at: string;
}

interface Highlight {
  id: string;
  page_number: number;
  highlighted_text: string;
  color: string;
  note: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  theme: ReaderTheme;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  onGoToPage: (page: number) => void;
  onDeleteBookmark: (id: string) => void;
  onDeleteHighlight: (id: string) => void;
  activeTab: "bookmarks" | "highlights";
  onTabChange: (tab: "bookmarks" | "highlights") => void;
}

export default function ReaderBookmarksSheet({
  open, onClose, theme, bookmarks, highlights,
  onGoToPage, onDeleteBookmark, onDeleteHighlight,
  activeTab, onTabChange,
}: Props) {
  const bg = theme === "dark" ? "#2c2c2e" : "#ffffff";
  const fg = theme === "dark" ? "#d1d1d6" : "#1c1c1e";
  const muted = theme === "dark" ? "#636366" : "#8e8e93";
  const surface = theme === "dark" ? "#3a3a3c" : "#f2f2f7";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/20"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-2xl max-w-lg mx-auto max-h-[70vh] flex flex-col"
            style={{ backgroundColor: bg, color: fg }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: theme === "dark" ? "#555" : "#ccc" }} />
            </div>

            <div className="px-6 pb-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Bookmarks & Highlights</h3>
                <button onClick={onClose} className="p-1.5 rounded-full" style={{ backgroundColor: surface }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex rounded-lg p-1 mb-4" style={{ backgroundColor: surface }}>
                {(["bookmarks", "highlights"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => onTabChange(tab)}
                    className="flex-1 py-2 text-sm font-medium rounded-md transition-all capitalize"
                    style={{
                      backgroundColor: activeTab === tab ? bg : "transparent",
                      boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8">
              {activeTab === "bookmarks" ? (
                bookmarks.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: muted }}>No bookmarks yet</p>
                ) : (
                  <div className="space-y-2">
                    {bookmarks.map((bm) => (
                      <div
                        key={bm.id}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{ backgroundColor: surface }}
                      >
                        <button onClick={() => { onGoToPage(bm.page_number); onClose(); }} className="flex-1 text-left">
                          <p className="text-sm font-medium">{bm.chapter_title || `Page ${bm.page_number + 1}`}</p>
                          <p className="text-xs" style={{ color: muted }}>Page {bm.page_number + 1}</p>
                        </button>
                        <button onClick={() => onDeleteBookmark(bm.id)} className="p-2 text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                highlights.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: muted }}>No highlights yet</p>
                ) : (
                  <div className="space-y-2">
                    {highlights.map((hl) => (
                      <div
                        key={hl.id}
                        className="p-3 rounded-xl"
                        style={{ backgroundColor: surface }}
                      >
                        <button onClick={() => { onGoToPage(hl.page_number); onClose(); }} className="w-full text-left">
                          <div className="flex items-start gap-2">
                            <div className="w-1 h-full rounded-full mt-1" style={{ backgroundColor: hl.color === "yellow" ? "#FFD60A" : hl.color === "green" ? "#34C759" : hl.color === "blue" ? "#007AFF" : "#FF6B6B", minHeight: "2rem" }} />
                            <div className="flex-1">
                              <p className="text-sm italic">"{hl.highlighted_text}"</p>
                              {hl.note && <p className="text-xs mt-1" style={{ color: muted }}>{hl.note}</p>}
                              <p className="text-xs mt-1" style={{ color: muted }}>Page {hl.page_number + 1}</p>
                            </div>
                          </div>
                        </button>
                        <div className="flex justify-end">
                          <button onClick={() => onDeleteHighlight(hl.id)} className="p-1 text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
