import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

interface SocketWithUser extends Socket {
  user?: JwtPayload;
}

export const initializeSocketHandlers = (io: Server): void => {
  // Authentication middleware for Socket.io
  io.use(async (socket: SocketWithUser, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key'
      ) as JwtPayload;

      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: SocketWithUser) => {
    console.log('New client connected:', socket.user?.username);

    // Join company room
    if (socket.user?.companyId) {
      socket.join(`company:${socket.user.companyId}`);
    }

    // Join branch room
    if (socket.user?.branchId) {
      socket.join(`branch:${socket.user.branchId}`);
    }

    // Handle consignment tracking
    socket.on('track:consignment', (cnNumber: string) => {
      socket.join(`tracking:${cnNumber}`);
    });

    socket.on('untrack:consignment', (cnNumber: string) => {
      socket.leave(`tracking:${cnNumber}`);
    });

    // Handle OGPL tracking
    socket.on('track:ogpl', (ogplNumber: string) => {
      socket.join(`ogpl:${ogplNumber}`);
    });

    socket.on('untrack:ogpl', (ogplNumber: string) => {
      socket.leave(`ogpl:${ogplNumber}`);
    });

    // Handle delivery run tracking
    socket.on('track:delivery', (runNumber: string) => {
      socket.join(`delivery:${runNumber}`);
    });

    socket.on('untrack:delivery', (runNumber: string) => {
      socket.leave(`delivery:${runNumber}`);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.user?.username);
    });
  });
};

// Helper functions to emit events
export const emitConsignmentUpdate = (
  io: Server,
  cnNumber: string,
  data: any
): void => {
  io.to(`tracking:${cnNumber}`).emit('consignment:updated', data);
};

export const emitOGPLUpdate = (
  io: Server,
  ogplNumber: string,
  data: any
): void => {
  io.to(`ogpl:${ogplNumber}`).emit('ogpl:updated', data);
};

export const emitDeliveryUpdate = (
  io: Server,
  runNumber: string,
  data: any
): void => {
  io.to(`delivery:${runNumber}`).emit('delivery:updated', data);
};

export const emitBranchNotification = (
  io: Server,
  branchId: string,
  notification: any
): void => {
  io.to(`branch:${branchId}`).emit('notification', notification);
};

export const emitCompanyNotification = (
  io: Server,
  companyId: string,
  notification: any
): void => {
  io.to(`company:${companyId}`).emit('notification', notification);
};