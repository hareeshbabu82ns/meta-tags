import React, { useEffect, useState } from "react";
import { Disc3, Image, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFileStore } from "../stores";
import { getFileCategory } from "../../shared/types";

export function AlbumArt() {
  const files = useFileStore((s) => s.files);
  const selectedFileIds = useFileStore((s) => s.selectedFileIds);
  const [artSrc, setArtSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const selectedIds = Array.from(selectedFileIds);
  const singleFileId = selectedIds.length === 1 ? selectedIds[0] : null;
  const selectedFile = singleFileId
    ? files.find((f) => f.id === singleFileId)
    : null;

  const isAudio = selectedFile
    ? getFileCategory(selectedFile.type) === "audio"
    : false;

  const loadArt = () => {
    if (!selectedFile || !isAudio) {
      setArtSrc(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    window.electronAPI
      .getAlbumArt(selectedFile.path)
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setArtSrc(`data:${result.format};base64,${result.data}`);
        } else {
          setArtSrc(null);
        }
      })
      .catch(() => {
        if (!cancelled) setArtSrc(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    return loadArt();
  }, [selectedFile?.id, isAudio]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    const imagePath = await window.electronAPI.selectImageFile();
    if (!imagePath) return;

    setUploading(true);
    try {
      const success = await window.electronAPI.setAlbumArt(
        selectedFile.path,
        imagePath,
      );
      if (success) {
        // Reload album art to show the new image
        loadArt();
      }
    } catch (err) {
      console.error("Failed to upload album art:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const success = await window.electronAPI.removeAlbumArt(
        selectedFile.path,
      );
      if (success) {
        setArtSrc(null);
      }
    } catch (err) {
      console.error("Failed to remove album art:", err);
    } finally {
      setUploading(false);
    }
  };

  if (!selectedFile || !isAudio) return null;

  return (
    <div className="border-b border-border bg-card">
      <div className="relative group aspect-square w-full max-h-64 bg-muted/30 flex items-center justify-center overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Disc3 className="h-8 w-8 animate-spin" />
            <span className="text-xs">Loading artwork...</span>
          </div>
        ) : artSrc ? (
          <>
            <img
              src={artSrc}
              alt="Album Art"
              className="w-full h-full object-contain"
            />
            {/* Overlay with actions on hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleUpload}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Replace cover art</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleRemove}
                    disabled={uploading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remove cover art</TooltipContent>
              </Tooltip>
            </div>
          </>
        ) : (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Image className="h-12 w-12 opacity-30" />
            <span className="text-xs">
              {uploading ? "Uploading..." : "Click to add cover art"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
