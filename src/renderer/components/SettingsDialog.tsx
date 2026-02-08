import React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettingsStore } from "../stores";

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const fileListView = useSettingsStore((s) => s.fileListView);
  const setFileListView = useSettingsStore((s) => s.setFileListView);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ── Appearance ── */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Appearance</h4>
            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Theme</Label>
                <p className="text-xs text-muted-foreground">
                  Switch between light and dark modes
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setTheme("light")}
                >
                  <Sun className="h-3.5 w-3.5" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="h-3.5 w-3.5" />
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setTheme("system")}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  System
                </Button>
              </div>
            </div>
          </div>

          {/* ── File List ── */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">File List</h4>
            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Default View</Label>
                <p className="text-xs text-muted-foreground">
                  How files are displayed in the file list
                </p>
              </div>
              <Select
                value={fileListView}
                onValueChange={(v) => setFileListView(v as "list" | "table")}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Keyboard Shortcuts ── */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Keyboard Shortcuts</h4>
            <Separator />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <ShortcutRow keys="⌘ C" action="Copy tags" />
              <ShortcutRow keys="⌘ V" action="Paste tags" />
              <ShortcutRow keys="⌘ Z" action="Undo last change" />
              <ShortcutRow keys="⌘ A" action="Select all files" />
              <ShortcutRow keys="⌘ S" action="Queue tag changes" />
              <ShortcutRow keys="⌘ ⇧ A" action="Apply all pending" />
              <ShortcutRow keys="Esc" action="Clear selection" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutRow({ keys, action }: { keys: string; action: string }) {
  return (
    <>
      <span className="text-muted-foreground">{action}</span>
      <div className="flex justify-end">
        <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {keys}
        </kbd>
      </div>
    </>
  );
}
