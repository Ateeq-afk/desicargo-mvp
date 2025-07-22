import { Router } from 'express';
import { superAdminController } from '../controllers/superadmin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { superAdminOnly } from '../middleware/superadmin.middleware';

const router = Router();

// All routes require authentication and superadmin privileges
router.use(authenticate);
router.use(superAdminOnly);

// Tenant Management
router.get('/tenants', superAdminController.getAllTenants);
router.get('/tenants/:id', superAdminController.getTenantDetails);
router.put('/tenants/:id', superAdminController.updateTenant);
router.delete('/tenants/:id', superAdminController.deleteTenant);
router.post('/tenants/:id/login', superAdminController.loginAsTenant);

// Platform Analytics
router.get('/stats', superAdminController.getPlatformStats);
router.get('/stats/revenue', superAdminController.getRevenueAnalytics);

// User Management
router.get('/users', superAdminController.getAllUsers);
router.post('/users/announcement', superAdminController.sendAnnouncement);

// System Management
router.get('/logs', superAdminController.getActivityLogs);
router.get('/health', superAdminController.getSystemHealth);

export default router;