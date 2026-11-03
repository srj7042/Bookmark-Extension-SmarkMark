#!/usr/bin/env bash
set -e

# Friendly setup script for SmartMark
echo "🌟 Setting up SmartMark..."
echo ""

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed. Please install Node.js (v18+) first."
  exit 1
fi

# Check npm
if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm is not installed. Please install npm first."
  exit 1
fi

echo "📦 1. Installing dependencies..."
npm install

echo ""
echo "🔨 2. Building extension..."
npm run build

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Setup complete! SmartMark is built and ready."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "👉 How to load it in Google Chrome:"
echo "   1. Open Chrome and go to: chrome://extensions"
echo "   2. Enable 'Developer mode' (toggle in top-right corner)"
echo "   3. Click 'Load unpacked'"
echo "   4. Select the 'dist' folder:"
echo "      $(pwd)/dist"
echo ""
echo "💡 Tip: Pin SmartMark to your toolbar to get started!"
echo ""

