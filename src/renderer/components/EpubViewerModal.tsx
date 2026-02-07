import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, List, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useViewerStore } from "../stores";

// epubjs type declarations
interface EpubNavItem {
  id: string;
  href: string;
  label: string;
  subitems?: EpubNavItem[];
}

interface EpubRendition {
  display: (target?: string) => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  themes: {
    fontSize: (size: string) => void;
    override: (name: string, value: string) => void;
    default: (styles: Record<string, Record<string, string>>) => void;
  };
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  destroy: () => void;
}

interface EpubBook {
  renderTo: (
    element: HTMLElement,
    options: { width: string; height: string; spread?: string },
  ) => EpubRendition;
  loaded: {
    navigation: Promise<{ toc: EpubNavItem[] }>;
    metadata: Promise<{ title?: string; creator?: string }>;
  };
  destroy: () => void;
}

export function EpubViewerModal() {
  const viewerFile = useViewerStore((s) => s.viewerFile);
  const closeViewer = useViewerStore((s) => s.closeViewer);

  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<EpubRendition | null>(null);

  const [toc, setToc] = useState<EpubNavItem[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<{
    title?: string;
    creator?: string;
  }>({});
  const [currentChapter, setCurrentChapter] = useState("");

  const isOpen = viewerFile?.type === "epub";

  const loadEpub = useCallback(async () => {
    if (!isOpen || !viewerRef.current) return;

    setLoading(true);

    try {
      // Read file as base64 from main process
      const base64 = await window.electronAPI.readFileAsBase64(viewerFile.path);

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      // Dynamic import epubjs (it's a CJS/UMD module)
      const ePub = (await import("epubjs")).default;

      // Clean up previous instance
      if (bookRef.current) {
        bookRef.current.destroy();
        bookRef.current = null;
        renditionRef.current = null;
      }

      // Clear the container
      if (viewerRef.current) {
        viewerRef.current.innerHTML = "";
      }

      const book = ePub(arrayBuffer) as unknown as EpubBook;
      bookRef.current = book;

      const rendition = book.renderTo(viewerRef.current, {
        width: "100%",
        height: "100%",
        spread: "none",
      });
      renditionRef.current = rendition;

      // Apply dark-mode friendly styles
      rendition.themes.default({
        body: {
          color: "var(--color-foreground, #e5e7eb) !important",
          "background-color": "transparent !important",
          "font-family": "system-ui, -apple-system, sans-serif",
          "line-height": "1.8",
          padding: "0 2rem !important",
        },
        "a, a:link, a:visited": {
          color: "hsl(210 100% 60%) !important",
        },
        "h1, h2, h3, h4, h5, h6": {
          color: "var(--color-foreground, #e5e7eb) !important",
        },
        p: {
          color: "var(--color-foreground, #e5e7eb) !important",
        },
        "span, div, li, td, th, dt, dd": {
          color: "var(--color-foreground, #e5e7eb) !important",
        },
      });

      rendition.themes.fontSize(`${fontSize}%`);

      // Track current chapter
      rendition.on("relocated", (location: unknown) => {
        const loc = location as { start?: { href?: string } };
        if (loc?.start?.href) {
          const chapter = toc.find((item) =>
            loc.start?.href?.includes(item.href),
          );
          if (chapter) {
            setCurrentChapter(chapter.label);
          }
        }
      });

      // Load navigation
      const nav = await book.loaded.navigation;
      setToc(nav.toc);

      // Load metadata
      const meta = await book.loaded.metadata;
      setMetadata(meta);

      // Display first page
      await rendition.display();
      setLoading(false);
    } catch (err) {
      console.error("Failed to load EPUB:", err);
      setLoading(false);
    }
  }, [isOpen, viewerFile?.path]);

  useEffect(() => {
    if (isOpen) {
      // Small delay to let the dialog mount
      const timer = setTimeout(loadEpub, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, loadEpub]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (bookRef.current) {
        bookRef.current.destroy();
        bookRef.current = null;
        renditionRef.current = null;
      }
    };
  }, []);

  const handlePrev = async () => {
    if (renditionRef.current) {
      await renditionRef.current.prev();
    }
  };

  const handleNext = async () => {
    if (renditionRef.current) {
      await renditionRef.current.next();
    }
  };

  const handleTocClick = async (href: string) => {
    if (renditionRef.current) {
      await renditionRef.current.display(href);
      setShowToc(false);
    }
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(50, Math.min(200, fontSize + delta));
    setFontSize(newSize);
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${newSize}%`);
    }
  };

  const handleClose = () => {
    if (bookRef.current) {
      bookRef.current.destroy();
      bookRef.current = null;
      renditionRef.current = null;
    }
    setToc([]);
    setShowToc(false);
    setFontSize(100);
    setLoading(true);
    setMetadata({});
    setCurrentChapter("");
    closeViewer();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] p-0 flex flex-col gap-0 [&>button]:hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/50 shrink-0">
          {/* TOC toggle */}
          <Button
            variant={showToc ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowToc(!showToc)}
          >
            <List className="h-4 w-4" />
          </Button>

          {/* Book title */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {metadata.title || viewerFile?.filename}
            </p>
            {metadata.creator && (
              <p className="text-xs text-muted-foreground truncate">
                {metadata.creator}
              </p>
            )}
          </div>

          {/* Current chapter indicator */}
          {currentChapter && (
            <span className="text-xs text-muted-foreground truncate max-w-48">
              {currentChapter}
            </span>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-1 border-l border-border pl-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Font size */}
          <div className="flex items-center gap-1 border-l border-border pl-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleFontSizeChange(-10)}
              disabled={fontSize <= 50}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-10 text-center">
              {fontSize}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleFontSizeChange(10)}
              disabled={fontSize >= 200}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-2"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Table of Contents sidebar */}
          {showToc && (
            <div className="w-64 border-r border-border bg-muted/30 shrink-0">
              <div className="p-3 border-b border-border">
                <h4 className="text-sm font-semibold">Table of Contents</h4>
              </div>
              <ScrollArea className="h-full">
                <div className="p-2 space-y-0.5">
                  {toc.map((item) => (
                    <TocItem
                      key={item.id}
                      item={item}
                      onClick={handleTocClick}
                      depth={0}
                    />
                  ))}
                  {toc.length === 0 && (
                    <p className="text-xs text-muted-foreground p-2">
                      No table of contents available
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* EPUB renderer */}
          <div className="flex-1 relative bg-background overflow-hidden">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm z-10">
                Loading EPUB...
              </div>
            )}
            <div ref={viewerRef} className="w-full h-full" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TocItem({
  item,
  onClick,
  depth,
}: {
  item: EpubNavItem;
  onClick: (href: string) => void;
  depth: number;
}) {
  return (
    <>
      <button
        onClick={() => onClick(item.href)}
        className="w-full text-left text-xs py-1.5 px-2 rounded hover:bg-accent hover:text-accent-foreground transition-colors truncate"
        style={{ paddingLeft: `${(depth + 1) * 0.5}rem` }}
      >
        {item.label.trim()}
      </button>
      {item.subitems?.map((sub) => (
        <TocItem key={sub.id} item={sub} onClick={onClick} depth={depth + 1} />
      ))}
    </>
  );
}
