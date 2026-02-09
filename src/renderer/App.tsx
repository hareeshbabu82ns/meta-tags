import React, { useEffect, useState, useRef } from "react";
import { Toaster } from "@/components/ui/sonner";
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
import { SettingsDialog } from "./components/SettingsDialog";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import {
  useLibraryStore,
  useFileStore,
  useScanStore,
  usePendingChangesStore,
  useSettingsStore,
} from "./stores";

export default function App() {
  const loadLibraries = useLibraryStore((s) => s.loadLibraries);
  const activeLibraryId = useLibraryStore((s) => s.activeLibraryId);
  const activeFolderPath = useLibraryStore((s) => s.activeFolderPath);
  const loadFiles = useFileStore((s) => s.loadFiles);
  const loadFilesByFolder = useFileStore((s) => s.loadFilesByFolder);
  const selectedFileIds = useFileStore((s) => s.selectedFileIds);

  const [leftSidebarWidth, setLeftSidebarWidth] = useState(256);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(480);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  // Apply persisted theme on mount
  useEffect(() => {
    useSettingsStore.getState().applyTheme();
  }, []);

  // Register global keyboard shortcuts
  useKeyboardShortcuts();

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

    // Listen for apply-progress events
    const unsubApplyProgress = window.electronAPI.onApplyProgress(
      (progress) => {
        usePendingChangesStore.setState({ applyProgress: progress });
      },
    );

    // Listen for apply-complete events
    const unsubApplyComplete = window.electronAPI.onApplyComplete((result) => {
      usePendingChangesStore.setState({ applying: false, applyProgress: null });
      // Dispatch a custom event so components can react
      window.dispatchEvent(
        new CustomEvent("meta-tags:apply-complete", { detail: result }),
      );
    });

    return () => {
      unsubProgress();
      unsubComplete();
      unsubApplyProgress();
      unsubApplyComplete();
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
          className="h-8 shrink-0 bg-background flex items-center justify-end px-3"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          <button
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>

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
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <Toaster position="bottom-right" richColors />
    </TooltipProvider>
  );
}
