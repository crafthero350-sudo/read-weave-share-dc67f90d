import { X, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ReaderTheme } from "./ReaderSettingsSheet";

interface TOCItem {
  title: string;
  page: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  theme: ReaderTheme;
  items: TOCItem[];
  currentPage: number;
  onGoToPage: (page: number) => void;
  totalPages: number;
  progress: number;
}

export default function ReaderTOCSheet({ open, onClose, theme, items, currentPage, onGoToPage, totalPages, progress }: Props) {
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

            <div className="px-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold">Contents</h3>
                  <p className="text-xs" style={{ color: muted }}>{Math.round(progress)}% complete</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-full" style={{ backgroundColor: surface }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8">
              {items.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: muted }}>No chapters available</p>
              ) : (
                <div className="space-y-1">
                  {items.map((item, i) => {
                    const isActive = currentPage >= item.page && (i === items.length - 1 || currentPage < items[i + 1].page);
                    return (
                      <button
                        key={i}
                        onClick={() => { onGoToPage(item.page); onClose(); }}
                        className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-all"
                        style={{
                          backgroundColor: isActive ? surface : "transparent",
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        <span className="text-sm">{item.title}</span>
                        <span className="text-xs" style={{ color: muted }}>{item.page + 1}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
