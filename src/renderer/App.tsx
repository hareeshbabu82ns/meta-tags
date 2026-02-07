import React, { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "./components/Sidebar";
import { FileList } from "./components/FileList";
import { TagInspector } from "./components/TagInspector";
import { AudioPlayer } from "./components/AudioPlayer";
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

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background text-foreground">
        {/* Scan progress bar at the very top */}
        <ScanProgressBar />

        {/* Draggable title bar area for macOS */}
        <div
          className="h-8 flex-shrink-0 bg-background"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        />

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <Sidebar />

          {/* Center: File list */}
          <div className="flex-1 overflow-hidden">
            <FileList />
          </div>

          {/* Right: Tag Inspector */}
          {selectedFileIds.size > 0 && (
            <div className="w-80 border-l border-border overflow-hidden">
              <TagInspector />
            </div>
          )}
        </div>

        {/* Bottom: Pending changes (collapsible) */}
        <PendingChangesPanel />

        {/* Bottom: Audio player */}
        <AudioPlayer />
      </div>
    </TooltipProvider>
  );
}
