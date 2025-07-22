# DesiCargo MVP - Transport Management System

A futuristic Transport Management System (TMS) built for small logistics companies in India. Features a modern glassmorphic UI with real-time tracking, consignment booking, OGPL management, and delivery operations.

## 🚀 Tech Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL
- **Frontend**: React, TypeScript, Tailwind CSS
- **UI/UX**: Framer Motion, Glassmorphism, Neumorphism
- **State Management**: Zustand
- **Real-time**: Socket.io
- **Authentication**: JWT

## 📦 Features

- ✨ Futuristic glassmorphic UI design
- 📦 Consignment booking and management
- 🚚 OGPL (loading list) creation and tracking
- 📍 Real-time shipment tracking
- 📋 Delivery management with POD capture
- 💰 Billing and invoicing
- 📊 Business reports and analytics
- 🔐 Role-based access control
- 🌐 Multi-branch support

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or Docker)
- npm or yarn

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd desicargo-mvp
```

2. **Start the database**
```bash
docker-compose up -d postgres
```

3. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Update .env with your database credentials

# Run database migrations
docker exec -i desicargo-db psql -U postgres desicargo < ../database/schema.sql
docker exec -i desicargo-db psql -U postgres desicargo < ../database/seed.sql

# Start backend server
npm run dev
```

4. **Setup Frontend**
```bash
cd ../frontend
npm install
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- PgAdmin: http://localhost:5050 (admin@desicargo.com / admin)

## 🔑 Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Operator | operator1 | operator123 |
| Manager | delhi_mgr | password123 |

## 🎨 UI Design Features

- **Dark Mode First**: Optimized for low-light environments
- **Glassmorphism**: Frosted glass effects throughout
- **Neon Accents**: Glowing buttons and interactive elements
- **Micro-animations**: Smooth transitions and hover effects
- **Holographic Cards**: 3D-effect cards for key metrics
- **Cyber Grid**: Futuristic background patterns

## 📱 Core Modules

### 1. Dashboard
- Real-time statistics
- Performance charts
- Recent activity feed
- Quick action buttons

### 2. Booking
- Create new consignments
- Auto-generate CN numbers
- GST calculation
- Customer management

### 3. OGPL Management
- Create loading lists
- Vehicle assignment
- Route planning
- Departure/arrival tracking

### 4. Tracking
- Real-time location updates
- Status history
- Estimated delivery times
- Customer notifications

### 5. Delivery
- Delivery run creation
- POD capture
- Failed delivery management
- Batch updates

### 6. Reports
- Booking register
- OGPL register
- Outstanding reports
- Revenue analytics

## 🏗️ Project Structure

```
desicargo-mvp/
├── backend/
│   ├── src/
│   │   ├── config/         # Database and app config
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── server.ts       # Main server file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── store/          # Zustand stores
│   │   └── App.tsx         # Main app component
│   └── package.json
├── database/
│   ├── schema.sql          # Database schema
│   └── seed.sql            # Sample data
└── docker-compose.yml      # Docker services
```

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev     # Start with nodemon
npm run build   # Build TypeScript
npm start       # Start production server
```

### Frontend Development
```bash
cd frontend
npm start       # Start development server
npm run build   # Build for production
npm test        # Run tests
```

### Database Management
```bash
# Access PostgreSQL
docker exec -it desicargo-db psql -U postgres desicargo

# Access PgAdmin
# Open http://localhost:5050
# Login: admin@desicargo.com / admin
# Add server: host.docker.internal:5432
```

## 🚀 Deployment

### Production Build
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve the build folder with any static server
```

### Environment Variables
Create `.env` files based on `.env.example` in both backend and frontend directories.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Designed for small logistics companies in India
- Built with modern web technologies
- Focused on user experience and performance

---

**Note**: This is an MVP version. Additional features like SMS integration, WhatsApp notifications, and advanced analytics will be added in future releases.