import React, { useState, useRef } from "react";
import { ZoomIn, ZoomOut, X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileStore } from "../stores";

export function PdfViewer() {
  const files = useFileStore((s) => s.files);
  const selectedFileIds = useFileStore((s) => s.selectedFileIds);
  const [scale, setScale] = useState(1);
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedIds = Array.from(selectedFileIds);
  const singleFileId = selectedIds.length === 1 ? selectedIds[0] : null;
  const selectedFile = singleFileId
    ? files.find((f) => f.id === singleFileId)
    : null;

  if (!selectedFile || selectedFile.type !== "pdf") {
    return null;
  }

  const getStreamUrl = () => {
    return window.electronAPI.getStreamUrl(selectedFile.path);
  };

  const handleZoomIn = () => {
    setScale((s) => Math.min(s + 0.2, 2));
    setIframeKey((k) => k + 1);
  };

  const handleZoomOut = () => {
    setScale((s) => Math.max(s - 0.2, 0.5));
    setIframeKey((k) => k + 1);
  };

  const handleResetZoom = () => {
    setScale(1);
    setIframeKey((k) => k + 1);
  };

  const handleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(console.error);
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`border-t border-border bg-card flex flex-col ${isFullscreen ? "fixed inset-0 h-screen" : "h-96"}`}
      style={isFullscreen ? { zIndex: 9999 } : undefined}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/50">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {selectedFile.filename}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleZoomIn}
            disabled={scale >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleResetZoom}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden bg-background flex items-center justify-center">
        <iframe
          key={iframeKey}
          src={`${getStreamUrl()}#zoom=${Math.round(scale * 100)}`}
          className="w-full h-full border-0"
          title={selectedFile.filename}
        />
      </div>
    </div>
  );
}
