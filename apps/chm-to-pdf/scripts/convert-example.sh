#!/usr/bin/env bash
set -euo pipefail

# Fill these paths before running.
INPUT_CHM="./《易经合集》（六壬预测类）.chm"
OUTPUT_PDF="./《易经合集》（六壬预测类）.pdf"

# Optional settings.
# Leave ENTRY_HTML empty to let the tool find the entry page automatically.
ENTRY_HTML=""
PDF_FORMAT="A4"
PDF_MARGIN="12mm"
KEEP_TEMP="false"
LANDSCAPE="false"
SINGLE_PAGE="false"

ARGS=("$INPUT_CHM" "-o" "$OUTPUT_PDF" "--format" "$PDF_FORMAT" "--margin" "$PDF_MARGIN")

if [[ -n "$ENTRY_HTML" ]]; then
  ARGS+=("--entry" "$ENTRY_HTML")
fi

if [[ "$KEEP_TEMP" == "true" ]]; then
  ARGS+=("--keep-temp")
fi

if [[ "$LANDSCAPE" == "true" ]]; then
  ARGS+=("--landscape")
fi

if [[ "$SINGLE_PAGE" == "true" ]]; then
  ARGS+=("--single")
fi

pnpm --filter chm-to-pdf dev -- "${ARGS[@]}"
