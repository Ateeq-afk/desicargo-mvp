# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DesiCargo MVP is a Transport Management System (TMS) for small logistics companies in India. It features a modern glassmorphic UI with real-time tracking, consignment booking, OGPL management, and delivery operations.

## Development Commands

### Backend (Express.js + TypeScript)
```bash
cd backend
npm install              # Install dependencies
npm run dev             # Start development server with nodemon (port 5000)
npm run build           # Compile TypeScript to JavaScript
npm start               # Run production server
```

### Frontend (React + TypeScript)
```bash
cd frontend
npm install              # Install dependencies
npm start               # Start development server (port 3000)
npm run build           # Create production build
npm test                # Run Jest tests
```

### Database (PostgreSQL)
```bash
docker-compose up -d postgres    # Start PostgreSQL container
docker exec -i desicargo-db psql -U postgres desicargo < ../database/schema.sql  # Run schema
docker exec -i desicargo-db psql -U postgres desicargo < ../database/seed.sql    # Seed data
```

### Quick Start
```bash
./start.sh              # Automated startup script for local development
```

## Architecture Overview

### Backend Architecture
- **Pattern**: MVC with service layer
- **Authentication**: JWT tokens with refresh token support
- **Real-time**: Socket.io for live updates
- **Security**: Helmet.js, bcrypt, CORS, input validation
- **Key Directories**:
  - `controllers/`: Route handlers for each module
  - `services/`: Business logic layer
  - `middleware/`: Auth, error handling, validation
  - `models/`: TypeScript interfaces and types
  - `sockets/`: Real-time event handlers

### Frontend Architecture
- **State Management**: Zustand stores for global state
- **API Layer**: Axios-based services with interceptors
- **Component Organization**:
  - `components/common/`: Reusable UI components
  - `components/[module]/`: Module-specific components
  - `pages/`: Route-level page components
  - `hooks/`: Custom React hooks
- **UI Design**: Dark mode first, glassmorphism, neon accents

### Key Design Patterns
1. **Service Layer Pattern**: Business logic separated from controllers
2. **Repository Pattern**: Database queries abstracted in services
3. **Middleware Pipeline**: Auth, validation, error handling
4. **Component Composition**: Reusable UI components with props
5. **Store Pattern**: Centralized state management with Zustand

## Core Modules

1. **Booking**: Consignment creation with auto CN generation
2. **OGPL**: Loading list management with vehicle assignment
3. **Tracking**: Real-time shipment tracking with status updates
4. **Delivery**: POD capture and delivery run management
5. **Billing**: Invoice generation and payment tracking
6. **Reports**: Business analytics and registers

## Environment Configuration

Create `.env` files from `.env.example`:
- Backend: Database, JWT secrets, CORS, SMS/Email config
- Frontend: API endpoints (defaults to localhost:5000)

## Testing Approach

- **Frontend**: Jest + React Testing Library (via create-react-app)
- **Backend**: No test framework configured yet
- Run frontend tests: `cd frontend && npm test`

## Database Schema

Key tables:
- `users`: Authentication and role management
- `branches`: Multi-branch support
- `consignments`: Booking and tracking data
- `ogpl`: Loading list management
- `deliveries`: POD and delivery status
- `invoices`: Billing information

## API Conventions

- RESTful endpoints: `/api/v1/[module]/[action]`
- JWT required for all protected routes
- Request validation with express-validator
- Consistent error response format
- Real-time updates via Socket.io events

## UI/UX Guidelines

- Dark theme with glassmorphic effects
- Tailwind CSS with custom animations
- Framer Motion for page transitions
- Consistent component styling patterns
- Mobile-responsive design

## Security Considerations

- JWT tokens with HttpOnly cookies
- Password hashing with bcrypt
- Input validation on all endpoints
- CORS configured for frontend origin
- SQL injection prevention with parameterized queries