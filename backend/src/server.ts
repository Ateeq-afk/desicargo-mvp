import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import masterRoutes from './routes/master.routes';
import consignmentRoutes from './routes/consignment.routes';
import ogplRoutes from './routes/ogpl.routes';
import deliveryRoutes from './routes/delivery.routes';
import billingRoutes from './routes/billing.routes';
import reportRoutes from './routes/report.routes';
import onboardingRoutes from './routes/onboarding.routes';
import documentRoutes from './routes/document.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import customerRoutes from './routes/customer.routes';
import goodsRoutes from './routes/goods.routes';
import rateRoutes from './routes/rate.routes';
import expenseRoutes from './routes/expenseRoutes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { notFound } from './middleware/notFound.middleware';

// Import socket handlers
import { initializeSocketHandlers } from './sockets';

// Import database
import { connectDB, syncDatabase } from './config/database';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/masters', masterRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/consignments', consignmentRoutes);
app.use('/api/ogpl', ogplRoutes);
app.use('/api/delivery-runs', deliveryRoutes);
app.use('/api/invoices', billingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/goods', goodsRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/expenses', expenseRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Initialize Socket.io handlers
initializeSocketHandlers(io);

// Make io accessible throughout the app
app.set('io', io);

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Sync database models
    await syncDatabase();
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Socket.io ready for real-time updates`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
});

export { app, io };