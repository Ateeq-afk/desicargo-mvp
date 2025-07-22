# DesiCargo Backend

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- PostgreSQL 15+ (or use Docker)
- Docker & Docker Compose (optional)

### Quick Start with Docker

1. Start PostgreSQL with Docker:
```bash
docker-compose up -d postgres
```

2. Install dependencies:
```bash
npm install
```

3. Run database migrations:
```bash
docker exec -i desicargo-db psql -U postgres desicargo < ../database/schema.sql
docker exec -i desicargo-db psql -U postgres desicargo < ../database/seed.sql
```

4. Start the development server:
```bash
npm run dev
```

The server will start on http://localhost:5000

### Manual PostgreSQL Setup

1. Create database:
```sql
CREATE DATABASE desicargo;
```

2. Run schema:
```bash
psql -U postgres -d desicargo < ../database/schema.sql
psql -U postgres -d desicargo < ../database/seed.sql
```

3. Update `.env` with your database credentials

### Default Users

- **Admin**: username: `admin`, password: `admin123`
- **Operator**: username: `operator1`, password: `operator123`
- **Manager**: username: `delhi_mgr`, password: `password123`

### API Endpoints

- Health Check: `GET /api/health`
- Authentication: `POST /api/auth/login`
- Dashboard: `GET /api/dashboard/stats` (requires auth)

### Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables

Copy `.env.example` to `.env` and update the values:

- `DB_PASSWORD`: Your PostgreSQL password
- `JWT_SECRET`: Secret key for JWT tokens
- `CORS_ORIGIN`: Frontend URL (default: http://localhost:3000)