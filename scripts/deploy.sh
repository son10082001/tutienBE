#!/bin/bash

# Configuration
APP_NAME="tutien-be"
PORT=84

echo "🚀 Starting deployment for $APP_NAME..."

# Ensure pnpm is in PATH
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm not found in PATH, trying to locate it..."
    NPM_BIN=$(npm config get prefix)/bin
    export PATH="$PATH:$NPM_BIN"
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is still not found. Please run 'npm install -g pnpm' and ensure your PATH is correct."
    exit 1
fi

# 1. Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull origin main || { echo "❌ Git pull failed"; exit 1; }

# 2. Install dependencies
echo "📦 Installing dependencies..."
pnpm install || { echo "❌ pnpm install failed"; exit 1; }

# 3. Prisma generate (required for this project)
echo "💎 Generating Prisma clients..."
pnpm prisma:generate || { echo "❌ Prisma generate failed"; exit 1; }

# 4. Build project
echo "🏗️ Building project..."
pnpm build || { echo "❌ pnpm build failed"; exit 1; }

# Fix: Ensure @generated files are in dist (sometimes tsc skips them)
echo "📂 Copying generated Prisma files to dist..."
mkdir -p dist/src/@generated
cp -r src/@generated/* dist/src/@generated/

# 5. Restart application using PM2
echo "🔄 Restarting application with PM2..."
if pm2 list | grep -q "$APP_NAME"; then
    pm2 restart ecosystem.config.cjs
else
    pm2 start ecosystem.config.cjs
fi

echo "✅ Deployment successful! Backend is running on port $PORT."
