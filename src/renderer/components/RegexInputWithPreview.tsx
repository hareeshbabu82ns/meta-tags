import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
      { pattern: "[a-z]", description: "Range: any letter a-z" },
      {
        pattern: "[^abc]",
        description: "Negation: anything except a, b, or c",
      },
    ],
  },
  capture: {
    title: "Capture Groups (use for replacement)",
    items: [
      { pattern: "(abc)", description: "Capture 'abc' as group $1" },
      { pattern: "([0-9]+)", description: "Capture one or more digits as $1" },
      { pattern: "([a-z]+)-(\\d+)", description: "Two groups: $1 and $2" },
      {
        pattern: "([^_]+)_([^.]+)",
        description: "Text before/after underscore",
      },
    ],
  },
  anchors: {
    title: "Anchors & Position",
    items: [
      { pattern: "^abc", description: "Start with 'abc'" },
      { pattern: "abc$", description: "End with 'abc'" },
      { pattern: "\\b", description: "Word boundary" },
    ],
  },
  quantifiers: {
    title: "Quantifiers",
    items: [
      { pattern: "*", description: "0 or more times (greedy)" },
      { pattern: "+", description: "1 or more times (greedy)" },
      { pattern: "?", description: "0 or 1 time" },
      { pattern: "{n}", description: "Exactly n times" },
      { pattern: "{n,}", description: "n or more times" },
      { pattern: "{n,m}", description: "Between n and m times" },
    ],
  },
};

interface RegexInputWithPreviewProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  previewSource?: string | null;
  templateValue?: string;
  showCaptures?: boolean;
}

/**
 * Regex input field with built-in help panel and live preview of capture groups.
 * Shows what values will be extracted from the preview source when user enters regex.
 */
export function RegexInputWithPreview({
  value,
  onChange,
  label = "Regex Pattern",
  placeholder = "e.g., ^(\\d+)[\\s\\-_.]",
  helperText = "Use capture groups like (abc) to extract parts, then use $1, $2 in template",
  previewSource,
  templateValue = "",
  showCaptures = true,
}: RegexInputWithPreviewProps) {
  const [showHelp, setShowHelp] = useState(false);

  let regexMatch: RegExpMatchArray | null = null;
  let regexError: string | null = null;

  if (value && previewSource) {
    try {
      const regex = new RegExp(value);
      regexMatch = previewSource.match(regex);
    } catch (error) {
      regexError = error instanceof Error ? error.message : "Invalid regex";
    }
  }

  return (
    <div className="space-y-2">
      {/* Label and Help */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setShowHelp(!showHelp)}
        >
          <HelpCircle className="h-3 w-3 mr-1" />
          Help
          <ChevronDown
            className={cn(
              "h-3 w-3 ml-1 transition-transform",
              showHelp && "rotate-180",
            )}
          />
        </Button>
      </div>

      {/* Textarea for regex input */}
      <Textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-20 text-xs font-mono"
      />

      {/* Helper text */}
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      {/* Help Panel */}
      {showHelp && (
        <div className="mt-3 p-3 border border-border rounded-md bg-muted/30 space-y-2 max-h-80 overflow-y-auto">
          {Object.entries(REGEX_HELP).map(([key, section]) => (
            <div key={key}>
              <p className="text-xs font-semibold text-foreground mb-2">
                {section.title}
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {section.items.map((item, idx) => (
                  <div key={idx} className="text-xs space-y-0.5">
                    <code className="text-xs bg-background px-2 py-1 rounded block font-mono text-primary break-all">
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

      {/* Live Preview */}
      {showCaptures && previewSource !== null && (
        <div className="space-y-2 p-3 border border-border rounded-md bg-card">
          <div className="text-xs font-semibold">Preview</div>

          <div className="bg-muted p-2 rounded text-xs">
            <p className="text-muted-foreground mb-1 text-xs">Source:</p>
            <code className="block break-all font-mono text-xs">
              {previewSource}
            </code>
          </div>

          {regexError ? (
            <div className="bg-destructive/10 border border-destructive/30 p-2 rounded">
              <p className="text-destructive font-mono text-xs">{regexError}</p>
            </div>
          ) : regexMatch ? (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                ✓ Match found
              </div>
              <div className="bg-muted p-2 rounded space-y-0.5">
                {regexMatch.map((m, i) => (
                  <div key={i} className="text-xs">
                    <code className="font-mono">
                      ${i}:{" "}
                      <span className="text-primary font-semibold">
                        {m || "(empty)"}
                      </span>
                    </code>
                    {i === 0 && (
                      <span className="text-muted-foreground ml-2">
                        (full match)
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {templateValue && (
                <div className="bg-muted p-2 rounded">
                  <p className="text-muted-foreground mb-1 text-xs">
                    With template "{templateValue}":
                  </p>
                  <code className="block font-mono text-green-600 dark:text-green-400 font-semibold text-xs">
                    {(() => {
                      if (!regexMatch) return "(no match)";
                      let preview = templateValue;
                      for (let i = 0; i <= regexMatch.length; i++) {
                        preview = preview.replace(
                          new RegExp(`\\$${i}`, "g"),
                          regexMatch[i] || "",
                        );
                      }
                      return preview.trim() || "(empty)";
                    })()}
                  </code>
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground italic text-xs py-2">
              {value
                ? "No match. The pattern doesn't match the source."
                : "Enter a regex to see matches"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
