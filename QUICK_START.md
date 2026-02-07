# 🚀 Quick Start - Regex Input Components

## What You Have

Two new React components ready to use:

1. **RegexInputWithPreview** - Standalone regex input with help panel and live preview
2. **TagRulesEditor** - Complete UI for managing tag rules with regex

## How to Use

### Option 1: Full UI (Recommended)

Add to your App.tsx:

```tsx
import { TagRulesEditor } from "./components/TagRulesEditor";

// In your render:
<TabsContent value="rules">
  <TagRulesEditor />
</TabsContent>;
```

Done! The component handles everything.

### Option 2: Standalone Input

Use just the regex input in any form:

```tsx
import { RegexInputWithPreview } from "./components/RegexInputWithPreview";

<RegexInputWithPreview
  value={regex}
  onChange={setRegex}
  previewSource="01 - Song Title.mp3"
  templateValue="$1"
/>;
```

## Features

✨ **Help Panel** - 50+ regex patterns with descriptions  
✨ **Live Preview** - See capture groups as you type  
✨ **Template Preview** - Show final output value  
✨ **Dark Mode** - Automatic theme support  
✨ **Accessible** - Full keyboard navigation

## Example

```
Pattern:  ^(\d+)[\s\-_.]
Source:   "01 - Song Title.mp3"

Preview shows:
$0: 01 - Song Title.mp3 (full match)
$1: 01 (first capture)
$2: Song Title.mp3 (second capture)

Template: "$1"
Output: "01"
```

## 30+ Pattern Examples

See docs/REGEX_PATTERNS_COOKBOOK.md for:

- Track number extraction
- Artist & song separation
- Year extraction
- File extension removal
- And 26 more...

## Full Documentation

- **README_REGEX_INDEX.md** - Navigation guide
- **SUMMARY.md** - 5-minute overview
- **INTEGRATION_GUIDE.md** - Detailed setup
- **REGEX_INPUT_USAGE.md** - Component API
- **REGEX_PATTERNS_COOKBOOK.md** - Examples
- **REGEX_INPUT_VISUAL_GUIDE.md** - UI mockups
- And more in docs folder...

## Integration Time

⏱️ **< 5 minutes** to add to your app

## Start Here

1. Read: **docs/SUMMARY.md** (2 min)
2. Read: **docs/INTEGRATION_GUIDE.md** (5 min)
3. Copy: 3 lines into App.tsx
4. Done! 🎉

---

Questions? Check docs/README_REGEX_INDEX.md for navigation.
