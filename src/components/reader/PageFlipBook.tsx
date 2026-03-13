import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import { PageFlip } from "page-flip";

interface PageFlipBookProps {
  pages: string[];
  currentPage: number;
  onPageChange: (page: number) => void;
  onTapCenter: () => void;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  theme: "light" | "sepia" | "gray" | "dark";
  palette: { bg: string; fg: string; muted: string; border: string };
}

export interface PageFlipBookRef {
  goToPage: (page: number) => void;
  flipNext: () => void;
  flipPrev: () => void;
}

const PageFlipBook = forwardRef<PageFlipBookRef, PageFlipBookProps>(
  ({ pages, currentPage, onPageChange, onTapCenter, fontSize, fontFamily, lineHeight, theme, palette }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const flipRef = useRef<PageFlip | null>(null);
    const pagesRef = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);
    const suppressEvent = useRef(false);

    useImperativeHandle(ref, () => ({
      goToPage: (page: number) => {
        if (flipRef.current) {
          suppressEvent.current = true;
          flipRef.current.turnToPage(page);
        }
      },
      flipNext: () => flipRef.current?.flipNext(),
      flipPrev: () => flipRef.current?.flipPrev(),
    }));

    // Initialize PageFlip
    useEffect(() => {
      if (!containerRef.current || !pagesRef.current || pages.length === 0) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      // Destroy previous instance
      if (flipRef.current) {
        try { flipRef.current.destroy(); } catch {}
        flipRef.current = null;
      }

      const pageFlip = new PageFlip(container, {
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
        size: "stretch",
        minWidth: 280,
        maxWidth: 1200,
        minHeight: 400,
        maxHeight: 1800,
        maxShadowOpacity: 0.18,
        showCover: false,
        mobileScrollSupport: false,
        clickEventForward: false,
        useMouseEvents: true,
        swipeDistance: 40,
        showPageCorners: true,
        disableFlipByClick: false,
        flippingTime: 450,
        usePortrait: true,
        startZIndex: 0,
        autoSize: true,
        drawShadow: true,
        startPage: currentPage,
      });

      // Load HTML pages from the hidden container
      const pageElements = pagesRef.current.querySelectorAll(".pf-page");
      if (pageElements.length > 0) {
        pageFlip.loadFromHTML(pageElements as unknown as HTMLElement[]);
      }

      pageFlip.on("flip", (e: any) => {
        if (suppressEvent.current) {
          suppressEvent.current = false;
          return;
        }
        onPageChange(e.data);
      });

      flipRef.current = pageFlip;
      setReady(true);

      return () => {
        try { pageFlip.destroy(); } catch {}
        flipRef.current = null;
      };
      // Only re-init when pages change
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pages.length, theme]);

    // Handle tap on center for controls toggle
    const handleClick = useCallback((e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      // Only center 40% triggers controls
      if (x > width * 0.3 && x < width * 0.7) {
        onTapCenter();
      }
    }, [onTapCenter]);

    // Page content styling
    const pageStyle: React.CSSProperties = {
      fontFamily,
      fontSize: `${fontSize}px`,
      lineHeight,
      color: palette.fg,
      backgroundColor: palette.bg,
      padding: "2.5rem 1.5rem 3rem",
      overflow: "hidden",
      boxSizing: "border-box",
    };

    // Gutter shadow style for realism
    const gutterShadow = theme === "dark"
      ? "inset 6px 0 16px -6px rgba(0,0,0,0.4)"
      : "inset 6px 0 16px -6px rgba(0,0,0,0.08)";

    return (
      <div className="flex-1 relative overflow-hidden" onClick={handleClick}>
        {/* The actual PageFlip canvas renders here */}
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{
            boxShadow: gutterShadow,
          }}
        />

        {/* Hidden page elements for PageFlip to consume */}
        <div ref={pagesRef} className="hidden">
          {pages.map((text, i) => (
            <div
              key={`${theme}-${i}`}
              className="pf-page"
              data-density="soft"
              style={{
                ...pageStyle,
                position: "relative",
              }}
            >
              {/* Subtle page edge */}
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 16,
                  bottom: 16,
                  width: 2,
                  background: theme === "dark"
                    ? "linear-gradient(180deg, transparent, rgba(255,255,255,0.04) 50%, transparent)"
                    : "linear-gradient(180deg, transparent, rgba(0,0,0,0.05) 50%, transparent)",
                  pointerEvents: "none",
                }}
              />
              <p style={{ whiteSpace: "pre-line", margin: 0 }}>{text}</p>
              {/* Page number */}
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  fontSize: 11,
                  color: palette.muted,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                }}
              >
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

PageFlipBook.displayName = "PageFlipBook";
export default PageFlipBook;
