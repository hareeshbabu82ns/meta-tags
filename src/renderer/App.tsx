import React, { useEffect, useState, useRef } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "./components/Sidebar";
import { FileList } from "./components/FileList";
import { TagInspector } from "./components/TagInspector";
import { AudioPlayer } from "./components/AudioPlayer";
import { AlbumArt } from "./components/AlbumArt";
import { PdfViewer } from "./components/PdfViewer";
import { PdfViewerModal } from "./components/PdfViewerModal";
import { EpubViewerModal } from "./components/EpubViewerModal";
import { PendingChangesPanel } from "./components/PendingChangesPanel";
import { ScanProgressBar } from "./components/ScanProgressBar";
import { useLibraryStore, useFileStore, useScanStore } from "./stores";

export default function App() {
  const loadLibraries = useLibraryStore((s) => s.loadLibraries);
  const activeLibraryId = useLibraryStore((s) => s.activeLibraryId);
  const activeFolderPath = useLibraryStore((s) => s.activeFolderPath);
  const loadFiles = useFileStore((s) => s.loadFiles);
  const loadFilesByFolder = useFileStore((s) => s.loadFilesByFolder);
  const selectedFileIds = useFileStore((s) => s.selectedFileIds);

  const [leftSidebarWidth, setLeftSidebarWidth] = useState(256); // w-64 = 256px
  const [rightSidebarWidth, setRightSidebarWidth] = useState(480);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  useEffect(() => {
    loadLibraries();

    // Listen for scan events
    const unsubProgress = window.electronAPI.onScanProgress((progress) => {
      useScanStore.setState({ scanning: true, progress });
    });
    const unsubComplete = window.electronAPI.onScanComplete(async () => {
      useScanStore.setState({ scanning: false, progress: null });
      // Reload files and folder tree
      await useLibraryStore.getState().refreshFolderTree();
      await useFileStore.getState().loadFiles();
    });

    return () => {
      unsubProgress();
      unsubComplete();
    };
  }, []);

  useEffect(() => {
    if (activeFolderPath) {
      loadFilesByFolder(activeFolderPath);
    } else if (activeLibraryId) {
      loadFiles();
    }
  }, [activeLibraryId, activeFolderPath]);

  // Left sidebar resize handlers
  const handleLeftMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = leftSidebarWidth;
    setIsResizingLeft(true);
  };

  // Right sidebar resize handlers
  const handleRightMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = rightSidebarWidth;
    setIsResizingRight(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const diff = e.clientX - resizeStartX.current;
        const newWidth = Math.max(
          200,
          Math.min(500, resizeStartWidth.current + diff),
        );
        setLeftSidebarWidth(newWidth);
      } else if (isResizingRight) {
        const diff = e.clientX - resizeStartX.current;
        const newWidth = Math.max(
          300,
          Math.min(700, resizeStartWidth.current - diff),
        );
        setRightSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizingLeft, isResizingRight]);

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background text-foreground">
        {/* Scan progress bar at the very top */}
        <ScanProgressBar />

        {/* Draggable title bar area for macOS */}
        <div
          className="h-8 shrink-0 bg-background"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        />

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div style={{ width: `${leftSidebarWidth}px` }}>
            <Sidebar />
          </div>

          {/* Left resize divider */}
          <div
            onMouseDown={handleLeftMouseDown}
            className={`w-1 bg-border cursor-col-resize hover:bg-primary transition-colors ${
              isResizingLeft ? "bg-primary" : ""
            }`}
            style={{ userSelect: "none" }}
          />

          {/* Center: File list */}
          <div className="flex-1 overflow-hidden">
            <FileList />
          </div>

          {/* Right resize divider */}
          {selectedFileIds.size > 0 && (
            <>
              <div
                onMouseDown={handleRightMouseDown}
                className={`w-1 bg-border cursor-col-resize hover:bg-primary transition-colors ${
                  isResizingRight ? "bg-primary" : ""
                }`}
                style={{ userSelect: "none" }}
              />

              {/* Right: Media Preview + Tag Inspector */}
              <div
                style={{ width: `${rightSidebarWidth}px` }}
                className="border-l border-border overflow-hidden flex flex-col"
              >
                {/* Audio Player - only shown for audio files */}
                <AudioPlayer />
                {/* Album Art - only shown for audio files */}
                <AlbumArt />
                {/* PDF Viewer - only shown for PDF files */}
                <PdfViewer />
                {/* Tag Inspector takes remaining space */}
                <div className="flex-1 overflow-hidden border-t border-border">
                  <TagInspector />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom: Pending changes (collapsible) */}
        <PendingChangesPanel />
      </div>

      {/* Document Viewer Modals */}
      <PdfViewerModal />
      <EpubViewerModal />
    </TooltipProvider>
  );
}
