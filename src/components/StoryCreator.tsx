import { useState, useEffect } from "react";
import { X, Type, Image, Smile } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { NotionEmoji } from "@/components/NotionEmoji";

const bgColors = [
  "#1a1a2e", "#16213e", "#0f3460", "#533483",
  "#e94560", "#f97316", "#22c55e", "#06b6d4",
  "#ec4899", "#8b5cf6", "#1e1e1e", "#fafafa",
];

const stickers = ["📚", "❤️", "🔥", "⭐", "💡", "🎯", "✨", "📖", "🧠", "💬", "🌟", "👏"];

interface StoryCreatorProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function StoryCreator({ open, onClose, onCreated }: StoryCreatorProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [bgColor, setBgColor] = useState(bgColors[0]);
  const [textStyle, setTextStyle] = useState<"normal" | "bold" | "italic">("normal");
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState("everyone");
  const [showStickers, setShowStickers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!user || (!content.trim() && !imageFile)) return;
    setSubmitting(true);

    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/stories/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("media").upload(path, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        content: content.trim() || null,
        image_url: imageUrl,
        background_color: bgColor,
        text_style: textStyle,
        sticker_data: selectedStickers,
        privacy,
      });

      if (error) throw error;

      toast.success("Story published!");
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      setSelectedStickers([]);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to publish story");
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
          className="fixed inset-0 z-[60] bg-black flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 z-10">
            <button onClick={onClose}><X className="w-6 h-6 text-white" /></button>
            <div className="flex items-center gap-2">
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="bg-white/10 text-white text-xs rounded-full px-3 py-1.5 outline-none appearance-none"
              >
                <option value="everyone">Everyone</option>
                <option value="followers">Followers</option>
                <option value="close_friends">Close Friends</option>
              </select>
            </div>
          </div>

          {/* Canvas */}
          <div
            className="flex-1 flex items-center justify-center mx-4 rounded-2xl relative overflow-hidden"
            style={{ backgroundColor: imagePreview ? "transparent" : bgColor }}
          >
            {imagePreview && (
              <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="relative z-10 w-full px-8">
              <textarea
                placeholder="Type your story..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`w-full bg-transparent text-white text-center outline-none resize-none placeholder:text-white/40 ${
                  textStyle === "bold" ? "text-2xl font-bold" :
                  textStyle === "italic" ? "text-xl italic font-light" :
                  "text-lg"
                }`}
                rows={4}
              />
              {selectedStickers.length > 0 && (
                <div className="flex justify-center gap-2 mt-4">
                  {selectedStickers.map((s, i) => (
                    <NotionEmoji key={i} emoji={s} size={32} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sticker picker */}
          <AnimatePresence>
            {showStickers && (
              <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="bg-neutral-900 rounded-t-2xl px-4 py-4"
              >
                <div className="grid grid-cols-6 gap-3">
                  {stickers.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedStickers((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])}
                      className={`text-2xl p-2 rounded-lg ${selectedStickers.includes(s) ? "bg-white/20" : ""}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom tools */}
          <div className="px-4 py-4 space-y-3">
            {/* Color picker */}
            <div className="flex gap-2 overflow-x-auto">
              {bgColors.map((c) => (
                <button
                  key={c}
                  onClick={() => setBgColor(c)}
                  className={`w-7 h-7 rounded-full flex-shrink-0 ${bgColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-black" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setTextStyle((s) => s === "normal" ? "bold" : s === "bold" ? "italic" : "normal")}
                  className="text-white p-2"
                >
                  <Type className="w-5 h-5" />
                </button>
                <label className="text-white p-2 cursor-pointer">
                  <Image className="w-5 h-5" />
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </label>
                <button onClick={() => setShowStickers(!showStickers)} className="text-white p-2">
                  <Smile className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || (!content.trim() && !imageFile)}
                className="bg-white text-black px-6 py-2 rounded-full text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? "Sharing..." : "Share Story"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
