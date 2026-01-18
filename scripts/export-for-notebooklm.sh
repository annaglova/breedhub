#!/bin/bash

# Export repository to text file for NotebookLM
# Usage: ./scripts/export-for-notebooklm.sh [output_file]

OUTPUT_FILE="${1:-repo-export.txt}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Directories to skip
SKIP_DIRS=(
  "node_modules"
  ".git"
  "dist"
  "build"
  ".next"
  ".nuxt"
  ".output"
  "coverage"
  ".turbo"
  ".cache"
  ".parcel-cache"
  ".vite"
  "vendor"
  "__pycache__"
  ".pytest_cache"
  "target"
  "out"
  ".idea"
  ".vscode"
)

# File extensions to include
INCLUDE_EXTENSIONS=(
  "ts" "tsx" "js" "jsx" "mjs" "cjs"
  "json" "yaml" "yml"
  "md" "mdx"
  "css" "scss" "less"
  "html" "vue" "svelte"
  "sql"
  "sh" "bash"
  "py"
  "rs"
  "go"
  "java"
  "kt"
  "swift"
  "rb"
  "php"
  "env.example"
)

# Files to skip by name
SKIP_FILES=(
  "package-lock.json"
  "pnpm-lock.yaml"
  "yarn.lock"
  "bun.lockb"
  "composer.lock"
  "Gemfile.lock"
  "Cargo.lock"
  "*.min.js"
  "*.min.css"
  "*.map"
  "*.d.ts"
)

# Build find exclude arguments
EXCLUDE_ARGS=""
for dir in "${SKIP_DIRS[@]}"; do
  EXCLUDE_ARGS="$EXCLUDE_ARGS -path '*/$dir' -prune -o -path '*/$dir/*' -prune -o"
done

# Build extension pattern
EXT_PATTERN=""
for ext in "${INCLUDE_EXTENSIONS[@]}"; do
  if [ -z "$EXT_PATTERN" ]; then
    EXT_PATTERN="-name '*.$ext'"
  else
    EXT_PATTERN="$EXT_PATTERN -o -name '*.$ext'"
  fi
done

cd "$REPO_ROOT"

echo "Exporting repository to $OUTPUT_FILE..."
echo "Repository: $REPO_ROOT"
echo ""

# Write header
{
  echo "=========================================="
  echo "REPOSITORY EXPORT FOR NOTEBOOKLM"
  echo "=========================================="
  echo ""
  echo "Repository: $(basename "$REPO_ROOT")"
  echo "Export date: $(date)"
  echo "Total files: (calculating...)"
  echo ""
  echo "=========================================="
  echo "DIRECTORY STRUCTURE"
  echo "=========================================="
  echo ""
} > "$OUTPUT_FILE"

# Add directory tree (limited depth)
find . -type d \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/dist/*' \
  -not -path '*/build/*' \
  -not -path '*/.turbo/*' \
  -not -path '*/.cache/*' \
  -not -path '*/coverage/*' \
  -maxdepth 4 \
  | sort >> "$OUTPUT_FILE"

{
  echo ""
  echo "=========================================="
  echo "FILE CONTENTS"
  echo "=========================================="
} >> "$OUTPUT_FILE"

# Find and process files
FILE_COUNT=0
find . -type f \( \
  -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o \
  -name "*.mjs" -o -name "*.cjs" -o \
  -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o \
  -name "*.md" -o -name "*.mdx" -o \
  -name "*.css" -o -name "*.scss" -o \
  -name "*.html" -o -name "*.vue" -o -name "*.svelte" -o \
  -name "*.sql" -o -name "*.sh" -o \
  -name "*.py" -o -name "*.rs" -o -name "*.go" \
  \) \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/dist/*' \
  -not -path '*/build/*' \
  -not -path '*/.turbo/*' \
  -not -path '*/.cache/*' \
  -not -path '*/coverage/*' \
  -not -path '*/.next/*' \
  -not -path '*/.nuxt/*' \
  -not -name '*.min.js' \
  -not -name '*.min.css' \
  -not -name '*.map' \
  -not -name '*.d.ts' \
  -not -name 'package-lock.json' \
  -not -name 'pnpm-lock.yaml' \
  -not -name 'yarn.lock' \
  | sort | while read -r file; do

  # Skip if file is too large (> 100KB)
  FILE_SIZE=$(wc -c < "$file" 2>/dev/null || echo "0")
  if [ "$FILE_SIZE" -gt 102400 ]; then
    echo "Skipping large file: $file ($FILE_SIZE bytes)" >&2
    continue
  fi

  # Skip binary files
  if file "$file" | grep -q "binary"; then
    continue
  fi

  {
    echo ""
    echo ""
    echo "### $file ###"
    echo ""
    cat "$file"
    echo ""
  } >> "$OUTPUT_FILE"

  FILE_COUNT=$((FILE_COUNT + 1))

  # Progress indicator
  if [ $((FILE_COUNT % 50)) -eq 0 ]; then
    echo "Processed $FILE_COUNT files..." >&2
  fi
done

# Update file count in header
TOTAL_FILES=$(grep -c "^### \\./" "$OUTPUT_FILE")
sed -i '' "s/Total files: (calculating...)/Total files: $TOTAL_FILES/" "$OUTPUT_FILE" 2>/dev/null || \
sed -i "s/Total files: (calculating...)/Total files: $TOTAL_FILES/" "$OUTPUT_FILE" 2>/dev/null

# Final stats
FILE_SIZE_MB=$(du -h "$OUTPUT_FILE" | cut -f1)
echo ""
echo "Export complete!"
echo "Output: $OUTPUT_FILE"
echo "Size: $FILE_SIZE_MB"
echo "Files: $TOTAL_FILES"
