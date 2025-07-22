#!/bin/bash

echo "🚀 Starting DesiCargo MVP..."

# Kill any existing processes
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start backend
echo "🔧 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 8

# Start frontend
echo "🎨 Starting frontend..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "✨ DesiCargo MVP is starting up!"
echo ""
echo "📱 Frontend will open at: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000/api/health"
echo "🐘 PostgreSQL: localhost:5432 (via Docker)"
echo "📊 PgAdmin: http://localhost:5050 (admin@desicargo.com / admin)"
echo ""
echo "🔑 Login credentials:"
echo "   Admin: admin / admin123"
echo "   Operator: operator1 / operator123"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap for cleanup
trap cleanup INT TERM

# Wait for interrupt
wait