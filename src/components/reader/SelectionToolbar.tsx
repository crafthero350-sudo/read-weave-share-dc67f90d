import { motion, AnimatePresence } from "framer-motion";
import { Share2, Highlighter, Trash2 } from "lucide-react";

export const HIGHLIGHT_COLORS = [
  { name: "yellow", value: "#FFF4A3", text: "Yellow" },
  { name: "mint", value: "#C8F2DC", text: "Mint" },
  { name: "lavender", value: "#E2D6F5", text: "Lavender" },
  { name: "peach", value: "#FDD9C2", text: "Peach" },
];

interface SelectionToolbarProps {
  x: number;
  y: number;
  visible: boolean;
  existingHighlightId: string | null;
  onHighlight: (color: string) => void;
  onRemove: () => void;
  onShare: () => void;
}

export default function SelectionToolbar({
  x,
  y,
  visible,
  existingHighlightId,
  onHighlight,
  onRemove,
  onShare,
}: SelectionToolbarProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.95 }}
          transition={{ type: "spring", damping: 22, stiffness: 320 }}
          className="fixed z-[80] -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-foreground text-background shadow-2xl"
          style={{ left: x, top: y }}
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.name}
              aria-label={`Highlight ${c.text}`}
              onClick={() => onHighlight(c.name)}
              className="w-7 h-7 rounded-full border-2 border-white/20 active:scale-90 transition-transform"
              style={{ backgroundColor: c.value }}
            />
          ))}
          <div className="w-px h-6 bg-background/20 mx-1" />
          {existingHighlightId && (
            <button
              aria-label="Remove highlight"
              onClick={onRemove}
              className="w-9 h-9 flex items-center justify-center rounded-full active:scale-90"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            aria-label="Share quote"
            onClick={onShare}
            className="w-9 h-9 flex items-center justify-center rounded-full active:scale-90"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function getHighlightColor(name: string): string {
  return HIGHLIGHT_COLORS.find((c) => c.name === name)?.value || HIGHLIGHT_COLORS[0].value;
}

/** Render text with highlights as colored <mark> spans. */
export function renderHighlightedText(
  text: string,
  highlights: { id: string; highlighted_text: string; color: string }[],
  onHighlightClick: (id: string) => void
) {
  if (!highlights.length) return text;

  // Find all matches with positions (first occurrence per highlight to avoid overlap mess)
  const ranges: { start: number; end: number; color: string; id: string }[] = [];
  highlights.forEach((h) => {
    if (!h.highlighted_text) return;
    const idx = text.indexOf(h.highlighted_text);
    if (idx >= 0) {
      ranges.push({ start: idx, end: idx + h.highlighted_text.length, color: h.color, id: h.id });
    }
  });

  if (!ranges.length) return text;
  ranges.sort((a, b) => a.start - b.start);

  // Merge non-overlapping
  const merged: typeof ranges = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (!last || r.start >= last.end) merged.push(r);
  }

  const out: React.ReactNode[] = [];
  let cursor = 0;
  merged.forEach((r, i) => {
    if (cursor < r.start) out.push(text.slice(cursor, r.start));
    out.push(
      <mark
        key={`hl-${r.id}-${i}`}
        data-highlight-id={r.id}
        onClick={(e) => {
          e.stopPropagation();
          onHighlightClick(r.id);
        }}
        style={{
          backgroundColor: getHighlightColor(r.color),
          color: "inherit",
          padding: "2px 0",
          borderRadius: "3px",
          cursor: "pointer",
        }}
      >
        {text.slice(r.start, r.end)}
      </mark>
    );
    cursor = r.end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}
