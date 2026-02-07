import React from "react";
import { Progress } from "@/components/ui/progress";
import { useScanStore } from "../stores";

export function ScanProgressBar() {
  const scanning = useScanStore((s) => s.scanning);
  const progress = useScanStore((s) => s.progress);

  if (!scanning || !progress) return null;

  const percent =
    progress.total > 0
      ? Math.round((progress.scanned / progress.total) * 100)
      : 0;

  return (
    <div className="px-4 py-1.5 border-b border-border bg-muted/50 flex items-center gap-3">
      <span className="text-xs text-muted-foreground shrink-0">
        Scanning: {progress.scanned}/{progress.total}
      </span>
      <Progress value={percent} className="flex-1 h-2" />
      <span className="text-xs text-muted-foreground truncate max-w-48">
        {progress.current}
      </span>
    </div>
  );
}
