import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Camera, SwitchCamera, Zap, ZapOff } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";

const LENSES = [
  { id: "none", name: "Original", emoji: "✨", preview: "" },
  { id: "puppy", name: "Puppy", emoji: "🐶", preview: "sepia(0.2) saturate(1.3) brightness(1.1)" },
  { id: "flower", name: "Flowers", emoji: "🌸", preview: "saturate(1.5) brightness(1.08) hue-rotate(-10deg)" },
  { id: "vintage", name: "Retro", emoji: "📷", preview: "sepia(0.6) contrast(1.1) brightness(0.95)" },
  { id: "neon", name: "Neon", emoji: "💜", preview: "saturate(2) contrast(1.2) brightness(1.1) hue-rotate(20deg)" },
  { id: "angel", name: "Angel", emoji: "😇", preview: "brightness(1.2) saturate(0.8)" },
  { id: "devil", name: "Devil", emoji: "😈", preview: "saturate(1.4) contrast(1.3) hue-rotate(350deg)" },
  { id: "fish", name: "Fish Eye", emoji: "🐟", preview: "saturate(1.2) brightness(1.05)" },
  { id: "snow", name: "Snow", emoji: "❄️", preview: "brightness(1.15) saturate(0.7) contrast(0.95)" },
  { id: "fire", name: "Fire", emoji: "🔥", preview: "saturate(1.6) contrast(1.15) hue-rotate(-15deg) brightness(1.05)" },
  { id: "galaxy", name: "Galaxy", emoji: "🌌", preview: "saturate(1.3) hue-rotate(30deg) brightness(0.9) contrast(1.2)" },
  { id: "glitter", name: "Glitter", emoji: "✨", preview: "brightness(1.2) saturate(1.4) contrast(1.1)" },
];

export default function LensesPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [selectedLens, setSelectedLens] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [flashOn, setFlashOn] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleFlipCamera = () => {
    setFacingMode((m) => (m === "user" ? "environment" : "user"));
  };

  const filteredLenses = searchQuery
    ? LENSES.filter((l) => l.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : LENSES;

  const activeLens = LENSES[selectedLens];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Camera preview */}
      <div className="flex-1 relative overflow-hidden">
        {hasCamera ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{
              transform: facingMode === "user" ? "scaleX(-1)" : "none",
              filter: activeLens.preview || undefined,
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-900">
            <div className="text-center">
              <Camera className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <p className="text-white/50 text-sm">Camera not available</p>
            </div>
          </div>
        )}

        {/* Lens name overlay */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeLens.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-24 left-0 right-0 flex justify-center z-10"
          >
            {activeLens.id !== "none" && (
              <div className="bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full flex items-center gap-2">
                <span className="text-base">{activeLens.emoji}</span>
                <span className="text-white text-sm font-medium">{activeLens.name}</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Top controls */}
        <div className="absolute top-0 left-0 right-0 z-20 pt-[max(12px,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between px-4">
            <button
              onClick={() => navigate(-1)}
              className="w-11 h-11 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="w-11 h-11 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center"
              >
                <Search className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => setFlashOn(!flashOn)}
                className="w-11 h-11 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center"
              >
                {flashOn ? <Zap className="w-5 h-5 text-[#FFFC00]" fill="#FFFC00" /> : <ZapOff className="w-5 h-5 text-white" />}
              </button>
              <button
                onClick={handleFlipCamera}
                className="w-11 h-11 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center"
              >
                <SwitchCamera className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 mt-3"
              >
                <div className="flex items-center bg-black/30 backdrop-blur-md rounded-full px-4 py-2.5">
                  <Search className="w-4 h-4 text-white/50 mr-2" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search Lenses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-white text-sm placeholder:text-white/40 outline-none w-full"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Lens Carousel */}
      <div className="bg-black pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3 overflow-x-auto px-4 py-4 no-scrollbar snap-x snap-mandatory">
          {filteredLenses.map((lens, i) => {
            const originalIndex = LENSES.findIndex((l) => l.id === lens.id);
            const isSelected = selectedLens === originalIndex;
            return (
              <motion.button
                key={lens.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedLens(originalIndex)}
                className={`flex-shrink-0 snap-center flex flex-col items-center gap-1 transition-all ${
                  isSelected ? "scale-110" : ""
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all ${
                    isSelected
                      ? "ring-[3px] ring-[#FFFC00] bg-white/15"
                      : "ring-1 ring-white/20 bg-white/5"
                  }`}
                >
                  {lens.emoji}
                </div>
                <span className={`text-[10px] ${isSelected ? "text-[#FFFC00] font-semibold" : "text-white/60"}`}>
                  {lens.name}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Bottom nav hint */}
        <div className="flex items-center justify-center gap-8 py-2">
          <button onClick={() => navigate("/snap")} className="text-white/50 text-xs font-medium">Create</button>
          <button className="text-white/50 text-xs font-medium">Scan</button>
          <button className="text-[#FFFC00] text-xs font-bold">Browse</button>
          <button onClick={() => navigate("/snap-stories")} className="text-white/50 text-xs font-medium">Explore</button>
        </div>
      </div>
    </div>
  );
}
