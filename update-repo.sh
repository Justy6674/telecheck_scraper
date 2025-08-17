#!/bin/bash

# Disaster Check AU Repository Auto-Update Script
# This script fetches and merges the latest changes from GitHub

echo "🔄 Updating Disaster Check AU repository..."
echo "----------------------------------------"

# Store current directory
ORIGINAL_DIR=$(pwd)

# Navigate to repository directory
cd "$(dirname "$0")"

# Fetch latest changes from origin
echo "📥 Fetching latest changes from GitHub..."
git fetch origin

# Check if there are any updates
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ Repository is already up to date!"
else
    echo "📦 New updates available! Pulling changes..."
    
    # Stash any local changes to prevent conflicts
    if [[ $(git status --porcelain) ]]; then
        echo "💾 Stashing local changes..."
        git stash push -m "Auto-stash before update $(date)"
    fi
    
    # Pull the latest changes
    git pull origin main
    
    # Check if stash exists and reapply
    if git stash list | grep -q "Auto-stash before update"; then
        echo "📋 Reapplying local changes..."
        git stash pop || echo "⚠️  Conflicts detected. Please resolve manually."
    fi
    
    echo "✅ Repository updated successfully!"
fi

# Show current status
echo ""
echo "📊 Current repository status:"
git log --oneline -5
echo ""
echo "📂 Current branch: $(git branch --show-current)"
echo "📍 Latest commit: $(git rev-parse --short HEAD)"

# Return to original directory
cd "$ORIGINAL_DIR"

echo "----------------------------------------"
echo "✨ Update check complete!"