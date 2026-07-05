#!/bin/bash

# Terminate background processes if script is closed
trap "kill 0" EXIT

echo "=========================================="
echo "Starting Sanction Payment Backend Server..."
echo "=========================================="
cd "$(dirname "$0")/server"
npm start &

echo "=========================================="
echo "Starting Sanction Payment Frontend Dashboard..."
echo "=========================================="
cd "../dashboard"
npm run dev &

# Keep script running and wait for background processes
wait
