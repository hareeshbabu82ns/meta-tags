import React, { useState, useMemo } from "react";
import { Plus, Trash2, Edit2, HelpCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TagRule } from "../../shared/types";
import { useFileStore } from "../stores";

// Regex help information
const REGEX_HELP = {
  basics: {
    title: "Regex Basics",
    items: [
      { pattern: ".", description: "Any single character" },
      { pattern: "\\d", description: "Any digit (0-9)" },
      { pattern: "\\w", description: "Word character (a-z, A-Z, 0-9, _)" },
      { pattern: "\\s", description: "Whitespace (space, tab, newline)" },
      { pattern: ".*", description: "Any characters (greedy)" },
      { pattern: ".+", description: "One or more characters (greedy)" },
      { pattern: ".?", description: "Zero or one character" },
    ],
  },
  capture: {
    title: "Capture Groups",
    items: [
      { pattern: "(abc)", description: "Capture 'abc' as group $1" },
      { pattern: "([0-9]+)", description: "Capture one or more digits as $1" },
      {
        pattern: "([a-z]+)-([0-9]+)",
        description: "Two capture groups: $1 and $2",
      },
      { pattern: "[abc]", description: "Match any of: a, b, or c" },
      { pattern: "[^0-9]", description: "Match anything except digits" },
    ],
  },
  anchors: {
    title: "Anchors & Boundaries",
    items: [
      { pattern: "^abc", description: "Match 'abc' at the start" },
      { pattern: "abc$", description: "Match 'abc' at the end" },
      { pattern: "\\b", description: "Word boundary" },
    ],
  },
  template: {
    title: "Template Substitution",
    items: [
      { pattern: "$0", description: "Full match (entire matched text)" },
      { pattern: "$1", description: "First capture group" },
      { pattern: "$2", description: "Second capture group" },
      { pattern: "$1 - $2", description: "Combine groups with literal text" },
    ],
  },
};

const SOURCE_FIELDS = [
  { value: "filename", label: "Filename" },
  { value: "folder", label: "Folder path" },
  { value: "index", label: "File index (1-based)" },
  { value: "datetime", label: "Modified date/time" },
];

interface RegexPreview {
  sourceValue: string | null;
  match: RegExpMatchArray | null;
  template: string;
  preview: string | null;
  error?: string;
}

export function TagRulesEditor() {
  const [rules, setRules] = useState<TagRule[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<TagRule | null>(null);
  const [showRegexHelp, setShowRegexHelp] = useState(false);
  const [applyingRule, setApplyingRule] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    source_field: "filename",
    regex: "",
    target_field: "title",
    template: "$1",
  });

  const selectedFileIds = useFileStore((s) => s.selectedFileIds);
  const files = useFileStore((s) => s.files);
  const selectedFiles = useMemo(
    () =>
      Array.from(selectedFileIds)
        .map((id) => files.find((f) => f.id === id))
        .filter(Boolean),
    [selectedFileIds, files],
  );

  // Load rules on mount
  React.useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const loadedRules = await window.electronAPI.getTagRules();
      setRules(loadedRules);
    } catch (error) {
      console.error("Failed to load rules:", error);
    }
  };

  const getRegexPreview = (): RegexPreview | null => {
    if (!formData.regex || !selectedFiles.length) return null;

    const firstFile = selectedFiles[0];
    if (!firstFile) return null;

    let sourceValue: string | null = null;

    switch (formData.source_field) {
      case "filename":
        sourceValue = firstFile.filename;
        break;
      case "folder":
        sourceValue = firstFile.path.substring(
          0,
          firstFile.path.lastIndexOf("/"),
        );
        break;
      case "index":
        sourceValue = "1";
        break;
      case "datetime":
        sourceValue = firstFile.modified_at;
        break;
    }

    if (!sourceValue) return null;

    try {
      const regex = new RegExp(formData.regex);
      const match = sourceValue.match(regex);

      let preview: string | null = null;
      if (match) {
        preview = formData.template;
        for (let i = 0; i <= match.length; i++) {
          preview = preview.replace(new RegExp(`\\$${i}`, "g"), match[i] || "");
        }
        preview = preview.trim() || null;
      }

      return { sourceValue, match, template: formData.template, preview };
    } catch (error) {
      return {
        sourceValue,
        match: null,
        template: formData.template,
        preview: null,
        error: error instanceof Error ? error.message : "Invalid regex",
      };
    }
  };

  const regexPreview = getRegexPreview();

  const handleOpenDialog = (rule?: TagRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        source_field: rule.source_field,
        regex: rule.regex,
        target_field: rule.target_field,
        template: rule.template,
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: "",
        source_field: "filename",
        regex: "",
        target_field: "title",
        template: "$1",
      });
    }
    setShowDialog(true);
  };

  const handleSaveRule = async () => {
    try {
      if (editingRule) {
        await window.electronAPI.updateTagRule({
          ...editingRule,
          ...formData,
          is_preset: editingRule.is_preset,
        });
      } else {
        await window.electronAPI.createTagRule({
          ...formData,
          is_preset: false,
        });
      }
      setShowDialog(false);
      await loadRules();
    } catch (error) {
      console.error("Failed to save rule:", error);
    }
  };

  const handleDeleteRule = async (id: number) => {
    try {
      await window.electronAPI.deleteTagRule(id);
      await loadRules();
    } catch (error) {
      console.error("Failed to delete rule:", error);
    }
  };

  const handleApplyRule = async (rule: TagRule) => {
    if (selectedFileIds.size === 0) {
      alert("Please select at least one file");
      return;
    }

    try {
      setApplyingRule(true);
      const fileIds = Array.from(selectedFileIds);
      const changes = await window.electronAPI.previewTagRule(rule.id, fileIds);

      if (changes.length === 0) {
        alert("No changes would be made by this rule");
        setApplyingRule(false);
        return;
      }

      // Queue the changes
      await window.electronAPI.queueBulkTagChanges(changes);
      alert(
        `Queued ${changes.length} changes. Review in the Pending Changes panel.`,
      );
    } catch (error) {
      console.error("Failed to apply rule:", error);
      alert("Error applying rule");
    } finally {
      setApplyingRule(false);
    }
  };

  const handleExportRules = () => {
    const json = JSON.stringify(rules, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tag-rules-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportRules = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text) as typeof rules;
        let imported_count = 0;

        for (const rule of imported) {
          try {
            await window.electronAPI.createTagRule({
              name: `${rule.name} (imported)`,
              source_field: rule.source_field,
              regex: rule.regex,
              target_field: rule.target_field,
              template: rule.template,
              is_preset: false,
            });
            imported_count++;
          } catch {
            // Skip if rule already exists
          }
        }

        await loadRules();
        alert(`Imported ${imported_count} rules`);
      } catch (error) {
        console.error("Failed to import rules:", error);
        alert("Error importing rules");
      }
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div className="px-3 pt-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Tag Rules</h2>
            <Button
              size="sm"
              onClick={() => handleOpenDialog()}
              className="h-7"
            >
              <Plus className="h-3 w-3 mr-1" />
              New Rule
            </Button>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportRules}
              disabled={rules.length === 0}
              className="h-7 text-xs"
            >
              Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleImportRules}
              className="h-7 text-xs"
            >
              Import
            </Button>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 pr-4">
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No rules yet. Create one to get started.
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="p-2 border border-border rounded-md bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium truncate">
                        {rule.name}
                      </p>
                      {rule.is_preset && (
                        <Badge variant="secondary" className="text-xs py-0 h-5">
                          Preset
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {rule.source_field} → {rule.target_field}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono break-all">
                      /{rule.regex}/
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleApplyRule(rule)}
                          disabled={selectedFileIds.size === 0 || applyingRule}
                        >
                          <Zap className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {selectedFileIds.size === 0
                          ? "Select files to apply"
                          : "Apply rule to selected files"}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleOpenDialog(rule)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit rule</TooltipContent>
                    </Tooltip>
                    {!rule.is_preset && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete rule</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Rule" : "Create Tag Rule"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Rule Name */}
            <div className="space-y-1">
              <Label className="text-xs">Rule Name</Label>
              <Input
                placeholder="e.g., Extract track number"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="h-8 text-xs"
              />
            </div>

            {/* Source Field */}
            <div className="space-y-1">
              <Label className="text-xs">Source Field</Label>
              <Select
                value={formData.source_field}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, source_field: value }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_FIELDS.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Regex Input with Help */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Regex Pattern</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowRegexHelp(!showRegexHelp)}
                >
                  <HelpCircle className="h-3 w-3 mr-1" />
                  Help
                </Button>
              </div>
              <Textarea
                placeholder="e.g., ^(\\d+)[\\s\\-_.]"
                value={formData.regex}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, regex: e.target.value }))
                }
                className="min-h-20 text-xs font-mono"
              />

              {/* Regex Help Panel */}
              {showRegexHelp && (
                <div className="mt-3 p-3 border border-border rounded-md bg-muted/30 space-y-2 max-h-60 overflow-y-auto">
                  {Object.entries(REGEX_HELP).map(([key, section]) => (
                    <div key={key}>
                      <p className="text-xs font-semibold text-foreground mb-2">
                        {section.title}
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {section.items.map((item, idx) => (
                          <div key={idx} className="text-xs space-y-0.5">
                            <code className="text-xs bg-background px-2 py-1 rounded block font-mono text-primary">
                              {item.pattern}
                            </code>
                            <p className="text-muted-foreground px-2">
                              {item.description}
                            </p>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-2" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Template Input */}
            <div className="space-y-1">
              <Label className="text-xs">Output Template</Label>
              <Input
                placeholder='e.g., "$1" or "$1 - $2"'
                value={formData.template}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, template: e.target.value }))
                }
                className="h-8 text-xs font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Use $0 for full match, $1, $2, etc. for capture groups
              </p>
            </div>

            {/* Target Field */}
            <div className="space-y-1">
              <Label className="text-xs">Target Tag Field</Label>
              <Input
                placeholder="e.g., title, artist, album"
                value={formData.target_field}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    target_field: e.target.value,
                  }))
                }
                className="h-8 text-xs"
              />
            </div>

            {/* Live Preview */}
            <div className="space-y-2 p-3 border border-border rounded-md bg-card">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Preview</Label>
                {selectedFiles.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    (Select a file to see preview)
                  </span>
                )}
              </div>

              {selectedFiles.length > 0 && regexPreview ? (
                <div className="space-y-2 text-xs">
                  <div className="bg-muted p-2 rounded">
                    <p className="text-muted-foreground mb-1">Source value:</p>
                    <code className="block break-all font-mono">
                      {regexPreview.sourceValue}
                    </code>
                  </div>

                  {regexPreview.error ? (
                    <div className="bg-destructive/10 border border-destructive/30 p-2 rounded">
                      <p className="text-destructive font-mono">
                        {regexPreview.error}
                      </p>
                    </div>
                  ) : regexPreview.match ? (
                    <div className="space-y-1">
                      <div className="bg-muted p-2 rounded">
                        <p className="text-muted-foreground mb-1">Matches:</p>
                        <div className="space-y-0.5">
                          {regexPreview.match.map((m, i) => (
                            <code
                              key={i}
                              className="block font-mono text-primary"
                            >
                              ${i}: {m || "(empty)"}
                            </code>
                          ))}
                        </div>
                      </div>

                      <div className="bg-muted p-2 rounded">
                        <p className="text-muted-foreground mb-1">Output:</p>
                        <code className="block font-mono text-green-600 dark:text-green-400 font-semibold">
                          {regexPreview.preview || "(empty)"}
                        </code>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground italic">
                      No match. The regex pattern doesn't match the source
                      value.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic py-2">
                  {selectedFiles.length === 0
                    ? "Select a file from the file list to see live preview"
                    : "Enter a regex pattern to see preview"}
                </div>
              )}
            </div>

            {/* Dialog Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveRule}>
                {editingRule ? "Update Rule" : "Create Rule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
