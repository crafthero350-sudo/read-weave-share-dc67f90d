import { motion, AnimatePresence } from "framer-motion";
import { X, Share2, Copy, Check } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

interface ShareQuoteSheetProps {
  open: boolean;
  onClose: () => void;
  quote: string;
  bookTitle: string;
  bookAuthor: string;
}

const cardGradients = [
  { name: "Mint", bg: "linear-gradient(135deg, #d9f5e8 0%, #a8e6cf 100%)", fg: "#1a4731" },
  { name: "Lavender", bg: "linear-gradient(135deg, #ece4f7 0%, #c8b6e2 100%)", fg: "#2a1f47" },
  { name: "Peach", bg: "linear-gradient(135deg, #fde4d6 0%, #f8c5a8 100%)", fg: "#5c2a14" },
  { name: "Cream", bg: "linear-gradient(135deg, #faf6ee 0%, #f0e8d4 100%)", fg: "#3a3633" },
];

export default function ShareQuoteSheet({ open, onClose, quote, bookTitle, bookAuthor }: ShareQuoteSheetProps) {
  const [gradient, setGradient] = useState(cardGradients[0]);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const shareText = `"${quote}"\n\n— ${bookAuthor}, ${bookTitle}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText, title: bookTitle });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    toast.success("Quote copied");
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-background rounded-t-3xl max-w-lg mx-auto pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <p className="text-[15px] font-semibold text-foreground">Share quote</p>
              <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-full bg-secondary">
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>

            {/* Quote card preview */}
            <div className="px-5 pt-2">
              <div
                ref={cardRef}
                className="rounded-3xl p-7 shadow-sm"
                style={{ background: gradient.bg, color: gradient.fg }}
              >
                <div className="text-5xl leading-none font-serif opacity-50 mb-2">“</div>
                <p
                  className="text-[17px] leading-relaxed font-serif"
                  style={{ fontFamily: "Georgia, 'New York', serif" }}
                >
                  {quote}
                </p>
                <div className="mt-5 pt-4 border-t border-current/15">
                  <p className="text-[13px] font-semibold">{bookTitle}</p>
                  <p className="text-[12px] opacity-70">{bookAuthor}</p>
                </div>
              </div>
            </div>

            {/* Gradient picker */}
            <div className="px-5 pt-4 flex items-center gap-2.5">
              {cardGradients.map((g) => (
                <button
                  key={g.name}
                  onClick={() => setGradient(g)}
                  aria-label={`Color ${g.name}`}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${
                    gradient.name === g.name ? "border-foreground scale-110" : "border-border/40"
                  }`}
                  style={{ background: g.bg }}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="px-5 pt-5 grid grid-cols-2 gap-3">
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 py-3.5 rounded-full bg-secondary text-foreground text-[14px] font-semibold"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 py-3.5 rounded-full bg-primary text-primary-foreground text-[14px] font-semibold"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
