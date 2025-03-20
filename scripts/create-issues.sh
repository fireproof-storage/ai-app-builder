#!/bin/bash

# Script to create GitHub issues from markdown file
# Each issue should have a title (H1 header) and a label in the format **Label:** enhancement

# Get the absolute path to the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI (gh) is not installed. Please install it first."
    exit 1
fi

# Check if the user is authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo "You are not authenticated with GitHub. Please run 'gh auth login' first."
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

# File containing the issues
FILE="$SCRIPT_DIR/../notes/gh-issues.md"

# Check if file exists
if [ ! -f "$FILE" ]; then
    echo "File $FILE not found!"
    exit 1
fi

# Count issues first
ISSUE_COUNT=0
while IFS= read -r line; do
    if [[ "$line" =~ ^#[[:space:]] ]]; then
        ((ISSUE_COUNT++))
    fi
done < "$FILE"

# Ask for confirmation with warning if not skipped
echo "Found $ISSUE_COUNT issues in $FILE."
echo "WARNING: This will create $ISSUE_COUNT new GitHub issues in your repository."
if [ "$SKIP_CONFIRM" = false ]; then
    read -p "Do you want to proceed? (y/n): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Operation cancelled."
        exit 0
    fi
else
    echo "Confirmation skipped with --yes flag."
fi

# Read the file and create issues
echo "Creating GitHub issues from $FILE..."
CREATED_COUNT=0

# Process file line by line
{
    # Flag to indicate we're inside an issue
    in_issue=false
    title=""
    body=""
    label=""

    while IFS= read -r line; do
        # Check if this is the start of a new issue (starts with # )
        if [[ "$line" =~ ^#[[:space:]](.+) ]]; then
            # If we already have an issue, create it before starting a new one
            if $in_issue && [ -n "$title" ]; then
                ((CREATED_COUNT++))
                
                # Remove "**Description:**" from the body
                body=$(echo "$body" | sed 's/\*\*Description:\*\*//g')
                
                echo "Creating issue #$CREATED_COUNT/$ISSUE_COUNT: $title (Label: $label)"
                
                # Create the issue
                gh issue create --title "$title" --body "$body" --label "$label"
                
                # Reset for next issue
                title=""
                body=""
                label=""
                
                # Add a small delay to avoid rate limiting
                sleep 1
            fi

            # Set new title (remove the # prefix)
            title="${BASH_REMATCH[1]}"
            body=""
            in_issue=true
            continue
        fi

        # If we're inside an issue, append to the body
        if $in_issue; then
            # Extract label if this is a label line
            if [[ "$line" =~ ^\*\*Label:\*\*[[:space:]]*(.+)$ ]]; then
                label="${BASH_REMATCH[1]}"
            else
                # Add the line to the body
                body="$body
$line"
            fi
        fi
    done

    # Handle the last issue in the file
    if $in_issue && [ -n "$title" ]; then
        ((CREATED_COUNT++))
        
        # Remove "**Description:**" from the body
        body=$(echo "$body" | sed 's/\*\*Description:\*\*//g')
        
        echo "Creating issue #$CREATED_COUNT/$ISSUE_COUNT: $title (Label: $label)"
        
        # Create the issue
        gh issue create --title "$title" --body "$body" --label "$label"
    fi

    echo "Successfully created $CREATED_COUNT of $ISSUE_COUNT issues."
} < "$FILE"

echo "Done! Created $CREATED_COUNT GitHub issues." 