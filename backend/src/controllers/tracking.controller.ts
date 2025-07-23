import { Request, Response } from 'express';
import { TrackingService } from '../services/tracking.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { TenantAuthRequest } from '../types';
import { 
  CreateTrackingEventRequest,
  UpdateVehicleLocationRequest,
  TrackingSearchParams 
} from '../types/tracking.types';

export class TrackingController {
  // Get all tracking status types
  static async getStatusTypes(req: Request, res: Response) {
    try {
      const statusTypes = await TrackingService.getStatusTypes();

      res.json({
        success: true,
        data: statusTypes
      });
    } catch (error) {
      console.error('Error fetching status types:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch status types'
      });
    }
  }

  // Get status types by category
  static async getStatusTypesByCategory(req: Request, res: Response) {
    try {
      const { category } = req.params;
      const statusTypes = await TrackingService.getStatusTypesByCategory(category);

      res.json({
        success: true,
        data: statusTypes
      });
    } catch (error) {
      console.error('Error fetching status types by category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch status types'
      });
    }
  }

  // Create tracking event
  static async createTrackingEvent(req: TenantAuthRequest, res: Response) {
    try {
      const data: CreateTrackingEventRequest = req.body;

      // Validate required fields
      if (!data.consignment_id || !data.event_type) {
        res.status(400).json({
          success: false,
          error: 'Consignment ID and event type are required'
        });
        return;
      }

      const trackingEvent = await TrackingService.createTrackingEvent(
        data,
        req.tenantId!,
        req.user?.userId
      );

      res.status(201).json({
        success: true,
        data: trackingEvent
      });
    } catch (error: any) {
      console.error('Error creating tracking event:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else if (error.message.includes('Invalid event type')) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create tracking event'
        });
      }
    }
  }

  // Get tracking timeline for consignment
  static async getTrackingTimeline(req: TenantAuthRequest, res: Response) {
    try {
      const { consignmentId } = req.params;

      if (!consignmentId) {
        res.status(400).json({
          success: false,
          error: 'Consignment ID is required'
        });
        return;
      }

      const timeline = await TrackingService.getTrackingTimeline(
        consignmentId,
        req.tenantId!
      );

      res.json({
        success: true,
        data: timeline
      });
    } catch (error: any) {
      console.error('Error fetching tracking timeline:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch tracking timeline'
        });
      }
    }
  }

  // Get tracking timeline by CN number
  static async getTrackingTimelineByCN(req: TenantAuthRequest, res: Response) {
    try {
      const { cnNumber } = req.params;

      if (!cnNumber) {
        res.status(400).json({
          success: false,
          error: 'CN number is required'
        });
        return;
      }

      // First find the consignment ID
      const consignmentQuery = `
        SELECT id FROM consignments 
        WHERE UPPER(cn_number) = UPPER($1) AND tenant_id = $2
      `;
      
      const { pool } = await import('../config/database');
      const result = await pool.query(consignmentQuery, [cnNumber, req.tenantId]);
      
      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Consignment not found'
        });
        return;
      }

      const consignmentId = result.rows[0].id;
      const timeline = await TrackingService.getTrackingTimeline(
        consignmentId,
        req.tenantId!
      );

      res.json({
        success: true,
        data: timeline
      });
    } catch (error) {
      console.error('Error fetching tracking timeline by CN:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tracking timeline'
      });
    }
  }

  // Public tracking (no authentication required)
  static async getPublicTracking(req: Request, res: Response) {
    try {
      const { cnNumber } = req.params;

      if (!cnNumber) {
        res.status(400).json({
          success: false,
          error: 'CN number is required'
        });
        return;
      }

      const trackingData = await TrackingService.getPublicTracking(cnNumber);

      if (!trackingData) {
        res.status(404).json({
          success: false,
          error: 'Consignment not found or invalid CN number'
        });
        return;
      }

      res.json({
        success: true,
        data: trackingData
      });
    } catch (error) {
      console.error('Error fetching public tracking:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tracking information'
      });
    }
  }

  // Update vehicle location
  static async updateVehicleLocation(req: TenantAuthRequest, res: Response) {
    try {
      const data: UpdateVehicleLocationRequest = req.body;

      // Validate required fields
      if (!data.vehicle_id || !data.latitude || !data.longitude) {
        res.status(400).json({
          success: false,
          error: 'Vehicle ID, latitude, and longitude are required'
        });
        return;
      }

      const location = await TrackingService.updateVehicleLocation(
        data,
        req.tenantId!
      );

      res.json({
        success: true,
        data: location
      });
    } catch (error: any) {
      console.error('Error updating vehicle location:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update vehicle location'
        });
      }
    }
  }

  // Get tracking statistics
  static async getTrackingStats(req: TenantAuthRequest, res: Response) {
    try {
      const stats = await TrackingService.getTrackingStats(req.tenantId!);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching tracking stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tracking statistics'
      });
    }
  }

  // Search tracking events
  static async searchTrackingEvents(req: TenantAuthRequest, res: Response) {
    try {
      const searchParams: TrackingSearchParams = {
        consignment_id: req.query.consignment_id as string,
        cn_number: req.query.cn_number as string,
        event_type: req.query.event_type as string,
        category: req.query.category as string,
        from_date: req.query.from_date ? new Date(req.query.from_date as string) : undefined,
        to_date: req.query.to_date ? new Date(req.query.to_date as string) : undefined,
        branch_id: req.query.branch_id as string,
        vehicle_id: req.query.vehicle_id as string,
        city: req.query.city as string,
        state: req.query.state as string,
        milestones_only: req.query.milestones_only === 'true',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        sort_by: req.query.sort_by as any || 'event_timestamp',
        sort_order: req.query.sort_order as any || 'desc'
      };

      const result = await TrackingService.searchTrackingEvents(
        searchParams,
        req.tenantId!
      );

      res.json({
        success: true,
        data: result.events,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      console.error('Error searching tracking events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search tracking events'
      });
    }
  }

  // Bulk create tracking events (for imports/batch updates)
  static async bulkCreateTrackingEvents(req: TenantAuthRequest, res: Response) {
    try {
      const { events } = req.body;

      if (!Array.isArray(events) || events.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Events array is required and must not be empty'
        });
        return;
      }

      const results = [];
      const errors = [];

      for (let i = 0; i < events.length; i++) {
        try {
          const event = await TrackingService.createTrackingEvent(
            events[i],
            req.tenantId!,
            req.user?.userId
          );
          results.push(event);
        } catch (error: any) {
          errors.push({
            index: i,
            event: events[i],
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: {
          created: results.length,
          failed: errors.length,
          results,
          errors
        }
      });
    } catch (error) {
      console.error('Error bulk creating tracking events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk create tracking events'
      });
    }
  }

  // Get latest vehicle locations
  static async getLatestVehicleLocations(req: TenantAuthRequest, res: Response) {
    try {
      const { pool } = await import('../config/database');
      
      const query = `
        SELECT DISTINCT ON (vl.vehicle_id)
          vl.*,
          v.vehicle_number,
          v.vehicle_type,
          d.name as driver_name,
          d.phone as driver_phone
        FROM vehicle_locations vl
        JOIN vehicles v ON vl.vehicle_id = v.id
        JOIN companies c ON v.company_id = c.id
        LEFT JOIN drivers d ON v.current_driver_id = d.id
        WHERE c.tenant_id = $1
        ORDER BY vl.vehicle_id, vl.recorded_at DESC
      `;

      const result = await pool.query(query, [req.tenantId]);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching vehicle locations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch vehicle locations'
      });
    }
  }

  // Get vehicle location history
  static async getVehicleLocationHistory(req: TenantAuthRequest, res: Response) {
    try {
      const { vehicleId } = req.params;
      const { from_date, to_date, limit = 100 } = req.query;

      if (!vehicleId) {
        res.status(400).json({
          success: false,
          error: 'Vehicle ID is required'
        });
        return;
      }

      const { pool } = await import('../config/database');
      
      let query = `
        SELECT vl.*
        FROM vehicle_locations vl
        JOIN vehicles v ON vl.vehicle_id = v.id
        JOIN companies c ON v.company_id = c.id
        WHERE vl.vehicle_id = $1 AND c.tenant_id = $2
      `;
      
      const params = [vehicleId, req.tenantId];
      let paramIndex = 3;

      if (from_date) {
        query += ` AND vl.recorded_at >= $${paramIndex}`;
        params.push(from_date as string);
        paramIndex++;
      }

      if (to_date) {
        query += ` AND vl.recorded_at <= $${paramIndex}`;
        params.push(to_date as string);
        paramIndex++;
      }

      query += ` ORDER BY vl.recorded_at DESC LIMIT $${paramIndex}`;
      params.push(limit as string);

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching vehicle location history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch vehicle location history'
      });
    }
  }
}