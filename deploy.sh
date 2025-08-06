#!/bin/bash

# Manual deployment script for GitHub Pages
# This is an alternative to GitHub Actions if you prefer manual deployment

echo "🚀 Building for GitHub Pages..."
npm run build:github

echo "📁 Checking if gh-pages branch exists..."
if git show-branch remotes/origin/gh-pages > /dev/null 2>&1; then
    echo "✅ gh-pages branch exists"
else
    echo "📝 Creating gh-pages branch..."
    git checkout --orphan gh-pages
    git rm -rf .
    git commit --allow-empty -m "Initial gh-pages commit"
    git checkout main
fi

echo "🔄 Deploying to gh-pages branch..."
git checkout gh-pages
git rm -rf . 2>/dev/null || true
cp -r dist/* .
git add .
git commit -m "Deploy to GitHub Pages - $(date)"
git push origin gh-pages
git checkout main

echo "✅ Deployment complete!"
echo "🌐 Your site will be available at: https://iv-stpn.github.io/gzip-brotli-zlib-demo/"
