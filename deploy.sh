#!/bin/bash
# One-click deploy to GitHub Pages
# Usage: ./deploy.sh YOUR_USERNAME YOUR_REPO_NAME

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./deploy.sh <github-username> <repo-name>"
    echo "Example: ./deploy.sh johndoe job-search-platform"
    exit 1
fi

USERNAME="$1"
REPO="$2"
REPO_URL="https://github.com/${USERNAME}/${REPO}.git"

echo "🚀 Deploying to GitHub Pages..."
echo "   Username: $USERNAME"
echo "   Repository: $REPO"
echo ""

# Initialize git if needed
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
fi

# Add remote if not exists
if ! git remote get-url origin &>/dev/null; then
    echo "🔗 Adding remote origin..."
    git remote add origin "$REPO_URL"
fi

# Add and commit all files
git add .
git commit -m "Deploy: AI-powered job search platform" --allow-empty

# Push to GitHub (this will prompt for authentication)
echo ""
echo "🔐 Authenticating with GitHub..."
echo "   (A browser window may open, or you can paste your credentials)"
echo ""

git branch -M main
git push -u origin main --force

# Enable GitHub Pages
echo ""
echo "📄 Enabling GitHub Pages..."
echo ""
echo "⚠️  If you have the GitHub CLI (gh) installed, run:"
echo "   gh page enable --source main/"
echo ""
echo "   Or manually go to: https://github.com/${USERNAME}/${REPO}/settings/pages"
echo "   → Source: Deploy from a branch → main branch, / (root) → Save"
echo ""
echo "✅ Done! Your site will be live at:"
echo "   https://${USERNAME}.github.io/${REPO}/"
echo ""
echo "   (Takes ~1-2 minutes to go live)"