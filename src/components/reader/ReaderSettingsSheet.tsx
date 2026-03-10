import { useState } from "react";
import { X, Minus, Plus, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type ReaderTheme = "light" | "sepia" | "gray" | "dark";

interface ReaderSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  theme: ReaderTheme;
  onThemeChange: (theme: ReaderTheme) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
  lineHeight: number;
  onLineHeightChange: (lh: number) => void;
}

const themes: { key: ReaderTheme; label: string; bg: string; fg: string; accent: string }[] = [
  { key: "light", label: "Original", bg: "#ffffff", fg: "#1c1c1e", accent: "#ffffff" },
  { key: "sepia", label: "Quiet", bg: "#f4ecd8", fg: "#5b4636", accent: "#e8d5b0" },
  { key: "gray", label: "Paper", bg: "#e8e8e3", fg: "#3c3c3c", accent: "#d4d4cf" },
  { key: "dark", label: "Bold", bg: "#1c1c1e", fg: "#d1d1d6", accent: "#2c2c2e" },
];

const fonts = [
  { key: "Georgia, serif", label: "Aa", style: "font-serif" },
  { key: "'Inter', sans-serif", label: "Aa", style: "font-sans" },
  { key: "'Merriweather', serif", label: "Aa", style: "font-serif italic" },
];

export default function ReaderSettingsSheet({
  open, onClose, theme, onThemeChange, fontSize, onFontSizeChange,
  fontFamily, onFontFamilyChange, lineHeight, onLineHeightChange,
}: ReaderSettingsSheetProps) {
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
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-2xl max-w-lg mx-auto"
            style={{
              backgroundColor: theme === "dark" ? "#2c2c2e" : "#ffffff",
              color: theme === "dark" ? "#d1d1d6" : "#1c1c1e",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: theme === "dark" ? "#555" : "#ccc" }} />
            </div>

            <div className="px-6 pb-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold">Themes & Settings</h3>
                <button onClick={onClose} className="p-1.5 rounded-full" style={{ backgroundColor: theme === "dark" ? "#3a3a3c" : "#f2f2f7" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Font size controls */}
              <div className="flex items-center justify-between mb-6 rounded-xl p-3" style={{ backgroundColor: theme === "dark" ? "#1c1c1e" : "#f2f2f7" }}>
                <button
                  onClick={() => onFontSizeChange(Math.max(14, fontSize - 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg"
                  style={{ backgroundColor: theme === "dark" ? "#3a3a3c" : "#e5e5ea" }}
                >
                  <span className="text-sm font-medium">A</span>
                </button>

                <div className="flex-1 mx-4 h-1 rounded-full relative" style={{ backgroundColor: theme === "dark" ? "#3a3a3c" : "#d1d1d6" }}>
                  <div
                    className="absolute h-full rounded-full"
                    style={{
                      width: `${((fontSize - 14) / 16) * 100}%`,
                      backgroundColor: theme === "dark" ? "#636366" : "#8e8e93",
                    }}
                  />
                </div>

                <button
                  onClick={() => onFontSizeChange(Math.min(30, fontSize + 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg"
                  style={{ backgroundColor: theme === "dark" ? "#3a3a3c" : "#e5e5ea" }}
                >
                  <span className="text-lg font-medium">A</span>
                </button>
              </div>

              {/* Theme grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {themes.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => onThemeChange(t.key)}
                    className="rounded-xl p-3 text-center transition-all"
                    style={{
                      backgroundColor: t.accent,
                      border: theme === t.key ? "2px solid #007aff" : "2px solid transparent",
                      color: t.fg,
                    }}
                  >
                    <span className="text-xl font-serif font-bold block mb-1">Aa</span>
                    <span className="text-[11px] font-medium">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Line height */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">Line spacing</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onLineHeightChange(Math.max(1.4, lineHeight - 0.2))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg"
                    style={{ backgroundColor: theme === "dark" ? "#3a3a3c" : "#e5e5ea" }}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm w-8 text-center">{lineHeight.toFixed(1)}</span>
                  <button
                    onClick={() => onLineHeightChange(Math.min(2.4, lineHeight + 0.2))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg"
                    style={{ backgroundColor: theme === "dark" ? "#3a3a3c" : "#e5e5ea" }}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
