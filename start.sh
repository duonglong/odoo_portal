#!/bin/bash

# Simple script to start both the API server and the Portal app

echo "Starting Odoo Portal API Server and App..."

# Navigate to the API app and start its dev server in the background
cd apps/api || exit
pnpm run dev &
API_PID=$!

echo "API Server started with PID $API_PID"

# Navigate back to root, then to the portal app and start Expo
cd ../..
cd apps/portal || exit
pnpm run start

# When the Expo process is stopped (e.g. by pressing Ctrl+C), kill the background API server too
echo "Stopping API Server..."
kill $API_PID
