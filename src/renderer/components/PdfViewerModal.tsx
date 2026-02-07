import React, { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useViewerStore } from "../stores";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export function PdfViewerModal() {
  const viewerFile = useViewerStore((s) => s.viewerFile);
  const closeViewer = useViewerStore((s) => s.closeViewer);

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [pageInputValue, setPageInputValue] = useState("1");
  const [loading, setLoading] = useState(true);

  const isOpen = viewerFile?.type === "pdf";

  const fileUrl = isOpen
    ? window.electronAPI.getStreamUrl(viewerFile.path)
    : null;

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: total }: { numPages: number }) => {
      setNumPages(total);
      setPageNumber(1);
      setPageInputValue("1");
      setLoading(false);
    },
    [],
  );

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("PDF load error:", error);
    setLoading(false);
  }, []);

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(numPages, page));
    setPageNumber(clamped);
    setPageInputValue(String(clamped));
  };

  const handlePageInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = parseInt(pageInputValue, 10);
      if (!isNaN(num)) {
        goToPage(num);
      }
    }
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleClose = () => {
    setPageNumber(1);
    setScale(1.0);
    setRotation(0);
    setLoading(true);
    closeViewer();
  };

  if (!isOpen || !fileUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] p-0 flex flex-col gap-0 [&>button]:hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/50 shrink-0">
          {/* File name */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {viewerFile.filename}
            </p>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => goToPage(pageNumber - 1)}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              <Input
                value={pageInputValue}
                onChange={(e) => setPageInputValue(e.target.value)}
                onKeyDown={handlePageInput}
                onBlur={() => {
                  const num = parseInt(pageInputValue, 10);
                  if (!isNaN(num)) goToPage(num);
                }}
                className="h-8 w-14 text-center text-xs"
              />
              <span className="text-xs text-muted-foreground">
                / {numPages}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => goToPage(pageNumber + 1)}
              disabled={pageNumber >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 border-l border-border pl-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomOut}
              disabled={scale <= 0.25}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomIn}
              disabled={scale >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRotate}
            >
              <RotateCw className="h-4 w-4" />
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

        {/* PDF Document */}
        <div className="flex-1 overflow-auto bg-muted/30 flex justify-center">
          {loading && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Loading PDF...
            </div>
          )}
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            className="py-4"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              className="shadow-lg"
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        </div>
      </DialogContent>
    </Dialog>
  );
}
