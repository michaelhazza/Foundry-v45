#!/bin/bash
# docs/qa-splitter.sh
# Extracts individual QA scripts from qa-scripts-reference.md
# Run this BEFORE executing QA tests
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REFERENCE_FILE="$SCRIPT_DIR/qa-scripts-reference.md"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ ! -f "$REFERENCE_FILE" ]]; then
  echo "[X] ERROR: qa-scripts-reference.md not found"
  exit 1
fi

mkdir -p "$PROJECT_ROOT/scripts"

echo "=== Extracting QA scripts from qa-scripts-reference.md ==="

current_file=""
line_count=0
file_count=0
declare -A seen_files

while IFS= read -r line || [[ -n "$line" ]]; do
  if [[ "$line" =~ ^#=====\ FILE:\ (.+)\ =====# ]]; then
    current_file="${BASH_REMATCH[1]}"
    
    # Fail-fast on duplicate FILE paths
    if [[ -n "${seen_files[$current_file]+x}" ]]; then
      echo ""
      echo "[X] FATAL: Duplicate FILE block detected: $current_file"
      echo "    First seen at extraction #${seen_files[$current_file]}"
      echo "    qa-scripts-reference.md must contain exactly one block per script."
      exit 1
    fi
    
    mkdir -p "$(dirname "$PROJECT_ROOT/$current_file")"
    > "$PROJECT_ROOT/$current_file"
    line_count=0
    file_count=$((file_count + 1))
    seen_files[$current_file]=$file_count
    echo "  Creating: $current_file"
  elif [[ "$line" =~ ^#=====\ END\ FILE\ =====# ]]; then
    if [[ -n "$current_file" ]]; then
      chmod +x "$PROJECT_ROOT/$current_file"
    fi
    current_file=""
  elif [[ -n "$current_file" ]]; then
    echo "$line" >> "$PROJECT_ROOT/$current_file"
    line_count=$((line_count + 1))
  fi
done < "$REFERENCE_FILE"

echo ""
echo "=== Extraction Complete ==="
echo "Created $file_count scripts in $PROJECT_ROOT/scripts/"

# Verify expected count
EXPECTED_SCRIPTS=12
if [[ $file_count -lt $EXPECTED_SCRIPTS ]]; then
  echo "[X] Expected $EXPECTED_SCRIPTS scripts, created $file_count"
  exit 1
fi

# Post-split verification
echo ""
echo "=== Post-Split Verification ==="
VERIFY_FAILURES=0

for script in "$PROJECT_ROOT"/scripts/qa-*.sh "$PROJECT_ROOT"/scripts/run-all-qa-tests.sh; do
  [[ ! -f "$script" ]] && continue
  script_name=$(basename "$script")
  
  # Check shebang
  first_line=$(head -1 "$script")
  if [[ "$first_line" != "#!/bin/bash" ]]; then
    echo "  [X] $script_name: Missing or incorrect shebang (got: $first_line)"
    VERIFY_FAILURES=$((VERIFY_FAILURES + 1))
    continue
  fi
  
  # Check syntax (bash -n parses without executing)
  if ! bash -n "$script" 2>/dev/null; then
    echo "  [X] $script_name: Syntax error detected"
    VERIFY_FAILURES=$((VERIFY_FAILURES + 1))
    continue
  fi
  
  # Check executable
  if [[ ! -x "$script" ]]; then
    echo "  [X] $script_name: Not executable"
    VERIFY_FAILURES=$((VERIFY_FAILURES + 1))
    continue
  fi
  
  echo "  [OK] $script_name"
done

if [[ $VERIFY_FAILURES -gt 0 ]]; then
  echo ""
  echo "[X] Post-split verification failed: $VERIFY_FAILURES scripts have issues"
  exit 1
fi

echo ""
echo "[OK] All $file_count QA scripts extracted and verified"
exit 0
