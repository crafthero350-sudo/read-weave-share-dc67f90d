import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlashlightIcon as Flash,
  X,
  Type,
  Pencil,
  Smile,
  Music,
  Download,
  Send,
  RefreshCw,
  Zap,
  ZapOff,
  Camera,
  SwitchCamera,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const FILTERS = [
  { id: "none", label: "No Filter", emoji: "✨", color: "#FFFC00" },
  { id: "warm", label: "Warm", emoji: "🌅", color: "#FF6B35" },
  { id: "cool", label: "Cool", emoji: "❄️", color: "#4ECDC4" },
  { id: "vintage", label: "Vintage", emoji: "📸", color: "#C8860A" },
  { id: "bw", label: "B&W", emoji: "🖤", color: "#333" },
  { id: "glow", label: "Glow", emoji: "💫", color: "#FFD700" },
  { id: "dreamy", label: "Dreamy", emoji: "🦋", color: "#E8A0BF" },
  { id: "neon", label: "Neon", emoji: "🔮", color: "#A855F7" },
];

const FILTER_CSS: Record<string, string> = {
  none: "",
  warm: "sepia(0.3) saturate(1.4) brightness(1.05)",
  cool: "saturate(0.8) hue-rotate(20deg) brightness(1.05)",
  vintage: "sepia(0.5) contrast(1.1) brightness(0.95)",
  bw: "grayscale(1) contrast(1.1)",
  glow: "brightness(1.15) saturate(1.3)",
  dreamy: "brightness(1.1) saturate(0.9) blur(0.3px)",
  neon: "saturate(1.8) contrast(1.2) brightness(1.1)",
};

export default function SnapCameraPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [flashOn, setFlashOn] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [captured, setCaptured] = useState<string | null>(null);
  const [showTools, setShowTools] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [textOverlay, setTextOverlay] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCamera(true);
    } catch {
      setHasCamera(false);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    const filter = FILTER_CSS[FILTERS[selectedFilter].id];
    if (filter) ctx.filter = filter;
    ctx.drawImage(video, 0, 0);
    ctx.filter = "none";

    if (textOverlay) {
      ctx.save();
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.font = "bold 48px -apple-system, system-ui, sans-serif";
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 3;
      ctx.textAlign = "center";
      const y = canvas.height * 0.85;
      ctx.strokeText(textOverlay, canvas.width / 2, y);
      ctx.fillText(textOverlay, canvas.width / 2, y);
      ctx.restore();
    }

    setCaptured(canvas.toDataURL("image/jpeg", 0.92));
  };

  const handleFlipCamera = () => {
    setFacingMode((m) => (m === "user" ? "environment" : "user"));
  };

  const handleDiscard = () => {
    setCaptured(null);
    setTextOverlay("");
    setShowTextInput(false);
  };

  const handleSendTo = async () => {
    if (!captured || !user) return;
    setUploading(true);
    try {
      const blob = await (await fetch(captured)).blob();
      const path = `snaps/${user.id}/${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage.from("media").upload(path, blob);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);

      // Save as story
      const expires = new Date();
      expires.setHours(expires.getHours() + 24);
      await supabase.from("stories").insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
        content: textOverlay || null,
        background_color: "#000000",
        expires_at: expires.toISOString(),
        privacy: "everyone",
      });
      toast.success("Snap sent to your story!");
      handleDiscard();
    } catch {
      toast.error("Failed to send snap");
    }
    setUploading(false);
  };

  const handleSave = () => {
    if (!captured) return;
    const link = document.createElement("a");
    link.download = `snap-${Date.now()}.jpg`;
    link.href = captured;
    link.click();
    toast.success("Saved to device!");
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCaptured(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGallerySelect} />

      {/* Camera preview or captured image */}
      <div className="flex-1 relative overflow-hidden">
        {captured ? (
          <img src={captured} alt="Captured" className="w-full h-full object-cover" />
        ) : hasCamera ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{
              transform: facingMode === "user" ? "scaleX(-1)" : "none",
              filter: FILTER_CSS[FILTERS[selectedFilter].id] || undefined,
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-900">
            <div className="text-center">
              <Camera className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <p className="text-white/50 text-sm">Camera not available</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-5 py-2.5 bg-[#FFFC00] text-black rounded-full text-sm font-bold"
              >
                Upload from Gallery
              </button>
            </div>
          </div>
        )}

        {/* Rounded corners overlay */}
        <div className="absolute inset-0 pointer-events-none rounded-[16px] ring-1 ring-black/10" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 pt-[max(12px,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between px-4">
            {!captured ? (
              <>
                <button
                  onClick={() => navigate(-1)}
                  className="w-11 h-11 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFlashOn(!flashOn)}
                    className="w-11 h-11 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center"
                  >
                    {flashOn ? (
                      <Zap className="w-5 h-5 text-[#FFFC00]" fill="#FFFC00" />
                    ) : (
                      <ZapOff className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <button
                    onClick={handleFlipCamera}
                    className="w-11 h-11 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center"
                  >
                    <SwitchCamera className="w-5 h-5 text-white" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={handleDiscard}
                  className="w-11 h-11 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <div />
              </>
            )}
          </div>
        </div>

        {/* Right side tools (only on captured) */}
        <AnimatePresence>
          {captured && showTools && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="absolute right-3 top-20 flex flex-col gap-3 z-20"
            >
              {[
                { icon: Type, label: "Text", action: () => setShowTextInput(true) },
                { icon: Pencil, label: "Draw", action: () => toast("Drawing coming soon") },
                { icon: Smile, label: "Stickers", action: () => toast("Stickers coming soon") },
                { icon: Music, label: "Music", action: () => toast("Music coming soon") },
              ].map(({ icon: Icon, label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
                  title={label}
                >
                  <Icon className="w-5 h-5 text-white" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text overlay display */}
        {textOverlay && (
          <div className="absolute bottom-32 left-0 right-0 flex justify-center z-10 px-8">
            <div className="bg-black/50 backdrop-blur-sm px-6 py-3 rounded-lg">
              <p className="text-white text-lg font-bold text-center">{textOverlay}</p>
            </div>
          </div>
        )}

        {/* Text input overlay */}
        <AnimatePresence>
          {showTextInput && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 flex items-center justify-center z-30 px-8"
            >
              <div className="w-full max-w-sm">
                <input
                  autoFocus
                  type="text"
                  placeholder="Type your text..."
                  value={textOverlay}
                  onChange={(e) => setTextOverlay(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setShowTextInput(false)}
                  className="w-full bg-transparent text-white text-2xl font-bold text-center outline-none placeholder:text-white/40 border-b-2 border-white/30 pb-2"
                />
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => setShowTextInput(false)}
                    className="px-6 py-2 bg-[#FFFC00] text-black rounded-full text-sm font-bold"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom section */}
      <div className="bg-black pb-[max(16px,env(safe-area-inset-bottom))]">
        {!captured ? (
          <>
            {/* Lens filter carousel */}
            <div className="flex items-center justify-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
              {FILTERS.map((filter, i) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(i)}
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${
                    selectedFilter === i
                      ? "ring-2 ring-[#FFFC00] scale-110"
                      : "ring-1 ring-white/20"
                  }`}
                  style={{
                    backgroundColor:
                      selectedFilter === i ? filter.color + "33" : "rgba(255,255,255,0.1)",
                  }}
                >
                  {filter.emoji}
                </button>
              ))}
            </div>

            {/* Capture controls */}
            <div className="flex items-center justify-between px-8 py-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden"
              >
                <ImageIcon className="w-5 h-5 text-white" />
              </button>

              <button
                onClick={handleCapture}
                className="w-[72px] h-[72px] rounded-full border-[4px] border-white flex items-center justify-center active:scale-90 transition-transform"
              >
                <div className="w-[60px] h-[60px] rounded-full bg-white" />
              </button>

              <button
                onClick={() => navigate("/snap-stories")}
                className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center"
              >
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#FFFC00] to-[#FF6B35] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-black">😊</span>
                </div>
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center"
              >
                <Download className="w-5 h-5 text-white" />
              </button>
            </div>

            <button
              onClick={handleSendTo}
              disabled={uploading}
              className="flex items-center gap-2 bg-[#FFFC00] text-black rounded-full px-6 py-3 font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send To
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
