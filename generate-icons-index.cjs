const fs = require("fs");
const path = require("path");

const ICONS_DIR = "./apps/shared/icons";
const OUTPUT_FILE = path.join(ICONS_DIR, "index.ts");

function toPascalCase(str) {
  return str
    .replace(/[_\- ]+/g, " ")
    .replace(/(?:^|\s)(\w)/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/\s+/g, "");
}

function walk(dir, parentParts = []) {
  let icons = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      icons = icons.concat(walk(full, [...parentParts, item]));
    } else if (item.endsWith(".svg")) {
      const relPath = path.relative(ICONS_DIR, full).replace(/\\/g, "/");
      const parts = [...parentParts, item.replace(/\.svg$/, "")].map(
        toPascalCase
      );
      const exportName = parts.join("") + "Icon";
      icons.push({ relPath, exportName });
    }
  }
  return icons;
}

const icons = walk(ICONS_DIR);

const lines = icons.map(
  (icon) =>
    `export { default as ${icon.exportName} } from './${icon.relPath}?react';`
);

fs.writeFileSync(OUTPUT_FILE, lines.join("\n") + "\n");

console.log(`Generated ${icons.length} exports in ${OUTPUT_FILE}`);
