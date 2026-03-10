import { useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";

interface PageFlipProps {
  currentPage: number;
  totalPages: number;
  onNext: () => void;
  onPrev: () => void;
  onTapCenter: () => void;
  children: React.ReactNode;
  theme: string;
}

export default function PageFlip({ currentPage, totalPages, onNext, onPrev, onTapCenter, children, theme }: PageFlipProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const [direction, setDirection] = useState(0);

  // Shadow based on drag
  const shadowOpacity = useTransform(dragX, [-200, 0, 200], [0.3, 0, 0.3]);
  const pageRotation = useTransform(dragX, [-300, 0, 300], [8, 0, -8]);

  const handleDragEnd = useCallback((_: any, info: any) => {
    setIsDragging(false);
    const threshold = 60;
    const velocity = info.velocity.x;

    if (info.offset.x < -threshold || velocity < -300) {
      if (currentPage < totalPages - 1) {
        setDirection(1);
        onNext();
      }
    } else if (info.offset.x > threshold || velocity > 300) {
      if (currentPage > 0) {
        setDirection(-1);
        onPrev();
      }
    }
  }, [currentPage, totalPages, onNext, onPrev]);

  const handleTap = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.3) {
      if (currentPage > 0) { setDirection(-1); onPrev(); }
    } else if (x > width * 0.7) {
      if (currentPage < totalPages - 1) { setDirection(1); onNext(); }
    } else {
      onTapCenter();
    }
  }, [isDragging, currentPage, totalPages, onNext, onPrev, onTapCenter]);

  const variants = {
    enter: (d: number) => ({
      x: d > 0 ? "40%" : "-40%",
      opacity: 0,
      scale: 0.95,
      rotateY: d > 0 ? -12 : 12,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
    },
    exit: (d: number) => ({
      x: d > 0 ? "-30%" : "30%",
      opacity: 0,
      scale: 0.96,
      rotateY: d > 0 ? 8 : -8,
    }),
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden select-none"
      style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
      onClick={handleTap}
    >
      {/* Page shadow effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          background: "linear-gradient(90deg, rgba(0,0,0,0.06) 0%, transparent 8%, transparent 92%, rgba(0,0,0,0.06) 100%)",
          opacity: shadowOpacity,
        }}
      />

      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={currentPage}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 35,
            mass: 0.8,
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          style={{ rotateY: pageRotation }}
          className="absolute inset-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Subtle page edge */}
      <div
        className="absolute right-0 top-4 bottom-4 w-[2px] z-10 pointer-events-none"
        style={{
          background: theme === "dark"
            ? "linear-gradient(180deg, transparent, rgba(255,255,255,0.05) 50%, transparent)"
            : "linear-gradient(180deg, transparent, rgba(0,0,0,0.06) 50%, transparent)",
        }}
      />
    </div>
  );
}
