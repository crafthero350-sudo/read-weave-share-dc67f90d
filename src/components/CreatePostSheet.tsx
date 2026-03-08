import { useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const postTypes = [
  { value: "quote", label: "Quote" },
  { value: "review", label: "Review" },
  { value: "recommendation", label: "Recommendation" },
  { value: "discussion", label: "Discussion" },
] as const;

interface CreatePostSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface BookOption {
  id: string;
  title: string;
  author: string;
}

export function CreatePostSheet({ open, onClose, onCreated }: CreatePostSheetProps) {
  const { user } = useAuth();
  const [type, setType] = useState<string>("quote");
  const [content, setContent] = useState("");
  const [bookId, setBookId] = useState<string | null>(null);
  const [books, setBooks] = useState<BookOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from("books").select("id, title, author").then(({ data }) => {
        if (data) setBooks(data);
      });
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        type,
        content: content.trim(),
        book_id: bookId,
      });
      if (error) throw error;

      // Log activity
      await supabase.from("activity_log").insert({
        user_id: user.id,
        activity_type: "post",
        metadata: { type },
      });

      toast.success("Post created!");
      setContent("");
      setBookId(null);
      setType("quote");
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[85vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <button onClick={onClose}><X className="w-5 h-5" /></button>
              <h3 className="text-sm font-semibold">New Post</h3>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                className="text-sm font-semibold text-foreground disabled:text-muted-foreground"
              >
                Post
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Type picker */}
              <div className="flex gap-2 overflow-x-auto">
                {postTypes.map((pt) => (
                  <button
                    key={pt.value}
                    onClick={() => setType(pt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      type === pt.value
                        ? "bg-foreground text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>

              {/* Book selector */}
              <select
                value={bookId || ""}
                onChange={(e) => setBookId(e.target.value || null)}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none appearance-none"
              >
                <option value="">No book (optional)</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} — {b.author}
                  </option>
                ))}
              </select>

              {/* Content */}
              <textarea
                placeholder={
                  type === "quote"
                    ? "Share a quote..."
                    : type === "review"
                    ? "Write your review..."
                    : type === "recommendation"
                    ? "What book would you recommend?"
                    : "Start a discussion..."
                }
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none resize-none placeholder:text-muted-foreground"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
