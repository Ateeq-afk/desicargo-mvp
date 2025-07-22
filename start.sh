#!/bin/bash

echo "🚀 Starting DesiCargo MVP..."

# Check if PostgreSQL is running locally
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please install and start PostgreSQL first."
    echo "On macOS: brew install postgresql && brew services start postgresql"
    echo "On Ubuntu: sudo apt install postgresql && sudo systemctl start postgresql"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Create database if it doesn't exist
createdb desicargo 2>/dev/null || echo "Database 'desicargo' already exists"

# Run schema and seed data
echo "📊 Setting up database schema..."
psql -d desicargo < database/schema.sql
psql -d desicargo < database/seed.sql

# Start backend
echo "🔧 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend
echo "🎨 Starting frontend..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "✨ DesiCargo MVP is starting up!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000"
echo ""
echo "🔑 Login credentials:"
echo "   Admin: admin / admin123"
echo "   Operator: operator1 / operator123"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait