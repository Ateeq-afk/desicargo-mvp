import { Router } from 'express';
import { TrackingController } from '../controllers/tracking.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

// Public tracking - accessible without login
router.get('/public/:cnNumber', TrackingController.getPublicTracking);

// ============================================================================
// PROTECTED ROUTES (Require authentication and tenant context)
// ============================================================================

// All routes below require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

// Status Types Management
router.get('/status-types', TrackingController.getStatusTypes);
router.get('/status-types/category/:category', TrackingController.getStatusTypesByCategory);

// Tracking Events
router.post('/events', TrackingController.createTrackingEvent);
router.post('/events/bulk', TrackingController.bulkCreateTrackingEvents);
router.get('/events/search', TrackingController.searchTrackingEvents);

// Consignment Tracking
router.get('/consignment/:consignmentId/timeline', TrackingController.getTrackingTimeline);
router.get('/cn/:cnNumber/timeline', TrackingController.getTrackingTimelineByCN);

// Vehicle Location Tracking
router.post('/vehicles/location', TrackingController.updateVehicleLocation);
router.get('/vehicles/locations/latest', TrackingController.getLatestVehicleLocations);
router.get('/vehicles/:vehicleId/locations/history', TrackingController.getVehicleLocationHistory);

// Analytics and Statistics
router.get('/stats', TrackingController.getTrackingStats);

export default router;