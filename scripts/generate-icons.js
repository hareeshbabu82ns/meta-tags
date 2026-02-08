#!/usr/bin/env node
/**
 * Generate macOS .icns and multi-resolution PNG icons from the SVG source.
 * Requires: `brew install librsvg` (for rsvg-convert) or uses sips on macOS.
 * This script uses sips (macOS built-in) for PNG generation and iconutil for .icns.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ICON_DIR = path.join(__dirname, "..", "assets", "icons");
const SVG_PATH = path.join(ICON_DIR, "icon.svg");
const ICONSET_DIR = path.join(ICON_DIR, "icon.iconset");

// Sizes needed for macOS .icns (standard + @2x retina)
const ICONSET_SIZES = [
  { name: "icon_16x16.png", size: 16 },
  { name: "icon_16x16@2x.png", size: 32 },
  { name: "icon_32x32.png", size: 32 },
  { name: "icon_32x32@2x.png", size: 64 },
  { name: "icon_128x128.png", size: 128 },
  { name: "icon_128x128@2x.png", size: 256 },
  { name: "icon_256x256.png", size: 256 },
  { name: "icon_256x256@2x.png", size: 512 },
  { name: "icon_512x512.png", size: 512 },
  { name: "icon_512x512@2x.png", size: 1024 },
];

function main() {
  // Create iconset directory
  if (!fs.existsSync(ICONSET_DIR)) {
    fs.mkdirSync(ICONSET_DIR, { recursive: true });
  }

  console.log("Generating PNG icons from SVG...");

  // First generate a 1024x1024 PNG from SVG using rsvg-convert or sips
  const png1024 = path.join(ICON_DIR, "icon_1024.png");

  // Try rsvg-convert first (better quality), fall back to sips
  try {
    execSync(`which rsvg-convert`, { stdio: "pipe" });
    execSync(`rsvg-convert -w 1024 -h 1024 "${SVG_PATH}" -o "${png1024}"`, {
      stdio: "inherit",
    });
    console.log("Used rsvg-convert for SVG → PNG conversion");
  } catch {
    // Use python3 with cairosvg or another fallback
    try {
      execSync(
        `python3 -c "
import cairosvg
cairosvg.svg2png(url='${SVG_PATH}', write_to='${png1024}', output_width=1024, output_height=1024)
"`,
        { stdio: "inherit" },
      );
      console.log("Used cairosvg for SVG → PNG conversion");
    } catch {
      console.error("Could not find rsvg-convert or cairosvg.");
      console.error("Install one of:");
      console.error("  brew install librsvg");
      console.error("  pip3 install cairosvg");
      console.error("");
      console.error(
        "Or manually create assets/icons/icon_1024.png (1024x1024) and re-run.",
      );
      process.exit(1);
    }
  }

  // Generate all iconset sizes using sips (macOS built-in)
  for (const { name, size } of ICONSET_SIZES) {
    const outPath = path.join(ICONSET_DIR, name);
    execSync(
      `sips -z ${size} ${size} "${png1024}" --out "${outPath}" 2>/dev/null`,
      { stdio: "pipe" },
    );
    console.log(`  Created ${name} (${size}x${size})`);
  }

  // Also create standard icon sizes for other platforms
  for (const size of [16, 32, 48, 64, 128, 256, 512, 1024]) {
    const outPath = path.join(ICON_DIR, `icon_${size}.png`);
    if (size === 1024) continue; // Already have it
    execSync(
      `sips -z ${size} ${size} "${png1024}" --out "${outPath}" 2>/dev/null`,
      { stdio: "pipe" },
    );
  }

  // Create .icns using iconutil (macOS built-in)
  const icnsPath = path.join(ICON_DIR, "icon.icns");
  try {
    execSync(`iconutil -c icns "${ICONSET_DIR}" -o "${icnsPath}"`, {
      stdio: "inherit",
    });
    console.log(`\nCreated ${icnsPath}`);
  } catch (err) {
    console.error("Failed to create .icns file:", err.message);
    process.exit(1);
  }

  // Clean up iconset directory
  fs.rmSync(ICONSET_DIR, { recursive: true });
  console.log("Cleaned up iconset directory");

  console.log("\nIcon generation complete!");
  console.log("Files:");
  const icons = fs.readdirSync(ICON_DIR).filter((f) => !f.endsWith(".svg"));
  for (const icon of icons) {
    console.log(`  assets/icons/${icon}`);
  }
}

main();
