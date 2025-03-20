#!/bin/bash

# Get the absolute path to the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Path to the issues file
ISSUES_FILE="$SCRIPT_DIR/../notes/gh-issues.md"

# Check if the file exists
if [ ! -f "$ISSUES_FILE" ]; then
    echo "File $ISSUES_FILE not found."
    exit 1
fi

# Check for --yes flag
SKIP_CONFIRM=false
for arg in "$@"; do
    if [ "$arg" == "--yes" ]; then
        SKIP_CONFIRM=true
        break
    fi
done

# Count issues first
ISSUE_COUNT=0
while IFS= read -r line; do
    if [[ "$line" =~ ^#[[:space:]] ]]; then
        ((ISSUE_COUNT++))
    fi
done < "$ISSUES_FILE"

# Ask for confirmation if not skipped
echo "Found $ISSUE_COUNT issues in $ISSUES_FILE."
if [ "$SKIP_CONFIRM" = false ]; then
    read -p "Do you want to proceed with testing? (y/n): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Operation cancelled."
        exit 0
    fi
else
    echo "Confirmation skipped with --yes flag."
fi

echo "Testing issue parsing from $ISSUES_FILE..."
PARSED_COUNT=0

# Process file line by line
{
    # Flag to indicate we're inside an issue
    in_issue=false
    title=""
    label=""

    while IFS= read -r line; do
        # Check if this is the start of a new issue (starts with # )
        if [[ "$line" =~ ^#[[:space:]](.+) ]]; then
            # If we already have an issue, report it before starting a new one
            if $in_issue && [ -n "$title" ]; then
                ((PARSED_COUNT++))
                echo "-----------------------------------"
                echo "Issue #$PARSED_COUNT:"
                echo "Title: $title"
                echo "Label: $label"
                echo "-----------------------------------"
                
                # Reset for next issue
                title=""
                label=""
            fi

            # Set new title (remove the # prefix)
            title="${BASH_REMATCH[1]}"
            in_issue=true
            continue
        fi

        # If we're inside an issue, check for the label
        if $in_issue && [[ "$line" =~ ^\*\*Label:\*\*[[:space:]]*(.+)$ ]]; then
            label="${BASH_REMATCH[1]}"
        fi
    done

    # Handle the last issue in the file
    if $in_issue && [ -n "$title" ]; then
        ((PARSED_COUNT++))
        echo "-----------------------------------"
        echo "Issue #$PARSED_COUNT:"
        echo "Title: $title" 
        echo "Label: $label"
        echo "-----------------------------------"
    fi

    echo "Successfully parsed $PARSED_COUNT of $ISSUE_COUNT issues."
} < "$ISSUES_FILE"

echo "This was just a test - no issues were created." 