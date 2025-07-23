import { pool } from '../config/database';
import { 
  TrackingEvent, 
  TrackingStatusType,
  VehicleLocation,
  TrackingNotification,
  CreateTrackingEventRequest,
  UpdateVehicleLocationRequest,
  TrackingSearchParams,
  TrackingTimelineResponse,
  PublicTrackingResponse,
  TrackingStatsResponse
} from '../types/tracking.types';

export class TrackingService {
  // Get all tracking status types
  static async getStatusTypes(): Promise<TrackingStatusType[]> {
    try {
      const query = `
        SELECT * FROM tracking_status_types 
        WHERE is_active = true 
        ORDER BY sequence_order, status_name
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching status types:', error);
      throw error;
    }
  }

  // Get status types by category
  static async getStatusTypesByCategory(category: string): Promise<TrackingStatusType[]> {
    try {
      const query = `
        SELECT * FROM tracking_status_types 
        WHERE category = $1 AND is_active = true 
        ORDER BY sequence_order
      `;
      
      const result = await pool.query(query, [category]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching status types by category:', error);
      throw error;
    }
  }

  // Create tracking event
  static async createTrackingEvent(
    data: CreateTrackingEventRequest,
    tenantId: string,
    userId?: string
  ): Promise<TrackingEvent> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify consignment exists and belongs to tenant
      const consignmentCheck = await client.query(
        'SELECT id, cn_number FROM consignments WHERE id = $1 AND tenant_id = $2',
        [data.consignment_id, tenantId]
      );

      if (consignmentCheck.rows.length === 0) {
        throw new Error('Consignment not found or access denied');
      }

      // Verify status type exists
      const statusCheck = await client.query(
        'SELECT status_code FROM tracking_status_types WHERE status_code = $1 AND is_active = true',
        [data.event_type]
      );

      if (statusCheck.rows.length === 0) {
        throw new Error('Invalid event type');
      }

      // Insert tracking event
      const insertQuery = `
        INSERT INTO tracking_events (
          consignment_id, event_type, location_name, address, city, state, country, pincode,
          latitude, longitude, gps_accuracy, description, remarks, images,
          branch_id, vehicle_id, driver_id, ogpl_id, created_by, created_by_type,
          event_timestamp, delivery_attempts, delivery_failure_reason,
          recipient_name, recipient_signature_url, pod_images,
          estimated_delivery_date, actual_delivery_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
        ) RETURNING *
      `;

      const values = [
        data.consignment_id,
        data.event_type,
        data.location_name || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.country || 'India',
        data.pincode || null,
        data.latitude || null,
        data.longitude || null,
        data.gps_accuracy || null,
        data.description || null,
        data.remarks || null,
        JSON.stringify(data.images || []),
        data.branch_id || null,
        data.vehicle_id || null,
        data.driver_id || null,
        data.ogpl_id || null,
        userId || null,
        'user',
        data.event_timestamp || new Date(),
        data.delivery_attempts || 0,
        data.delivery_failure_reason || null,
        data.recipient_name || null,
        data.recipient_signature_url || null,
        JSON.stringify(data.pod_images || []),
        data.estimated_delivery_date || null,
        data.actual_delivery_date || null
      ];

      const result = await client.query(insertQuery, values);
      
      await client.query('COMMIT');
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating tracking event:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get tracking timeline for consignment
  static async getTrackingTimeline(
    consignmentId: string,
    tenantId: string
  ): Promise<TrackingTimelineResponse> {
    try {
      // Get consignment details
      const consignmentQuery = `
        SELECT 
          c.id, c.cn_number, c.consignor_name, c.consignor_phone,
          c.consignee_name, c.consignee_phone,
          fb.city as from_city, tb.city as to_city,
          c.status, c.booking_date
        FROM consignments c
        LEFT JOIN branches fb ON c.from_branch_id = fb.id
        LEFT JOIN branches tb ON c.to_branch_id = tb.id
        WHERE c.id = $1 AND c.tenant_id = $2
      `;

      const consignmentResult = await pool.query(consignmentQuery, [consignmentId, tenantId]);
      
      if (consignmentResult.rows.length === 0) {
        throw new Error('Consignment not found');
      }

      const consignment = consignmentResult.rows[0];

      // Get tracking events with status details
      const eventsQuery = `
        SELECT 
          te.*,
          tst.status_name, tst.description as status_description,
          tst.category, tst.sequence_order, tst.is_milestone,
          tst.icon, tst.color,
          b.name as branch_name,
          v.vehicle_number,
          d.name as driver_name
        FROM tracking_events te
        LEFT JOIN tracking_status_types tst ON te.event_type = tst.status_code
        LEFT JOIN branches b ON te.branch_id = b.id
        LEFT JOIN vehicles v ON te.vehicle_id = v.id
        LEFT JOIN drivers d ON te.driver_id = d.id
        WHERE te.consignment_id = $1
        ORDER BY te.event_timestamp DESC, te.created_at DESC
      `;

      const eventsResult = await pool.query(eventsQuery, [consignmentId]);
      const events = eventsResult.rows;

      // Get current location if available
      let currentLocation = null;
      const locationEvent = events.find(e => e.latitude && e.longitude);
      if (locationEvent) {
        currentLocation = {
          latitude: parseFloat(locationEvent.latitude),
          longitude: parseFloat(locationEvent.longitude),
          location_name: locationEvent.location_name,
          city: locationEvent.city,
          last_updated: locationEvent.event_timestamp
        };
      }

      // Calculate summary metrics
      const milestoneEvents = events.filter(e => e.is_milestone);
      const transitStartTime = events.find(e => e.event_type === 'PICKED_UP')?.event_timestamp;
      const currentTime = new Date();
      const transitTimeHours = transitStartTime 
        ? (currentTime.getTime() - new Date(transitStartTime).getTime()) / (1000 * 60 * 60)
        : 0;

      // Calculate progress percentage based on milestone completion
      const totalMilestones = 7; // Total possible milestones in the journey
      const completedMilestones = milestoneEvents.length;
      const progressPercentage = Math.min((completedMilestones / totalMilestones) * 100, 100);

      const summary = {
        total_events: events.length,
        milestone_events: milestoneEvents.length,
        last_update: events.length > 0 ? events[0].event_timestamp : consignment.booking_date,
        transit_time_hours: Math.round(transitTimeHours * 10) / 10,
        progress_percentage: Math.round(progressPercentage)
      };

      return {
        consignment,
        timeline: events,
        current_location: currentLocation || undefined,
        summary
      };
    } catch (error) {
      console.error('Error fetching tracking timeline:', error);
      throw error;
    }
  }

  // Get public tracking information (no authentication required)
  static async getPublicTracking(cnNumber: string): Promise<PublicTrackingResponse | null> {
    try {
      // Get consignment basic details (public info only)
      const consignmentQuery = `
        SELECT 
          c.cn_number, c.status,
          fb.city as from_city, tb.city as to_city,
          c.booking_date
        FROM consignments c
        LEFT JOIN branches fb ON c.from_branch_id = fb.id
        LEFT JOIN branches tb ON c.to_branch_id = tb.id
        WHERE UPPER(c.cn_number) = UPPER($1) AND c.is_active = true
      `;

      const consignmentResult = await pool.query(consignmentQuery, [cnNumber]);
      
      if (consignmentResult.rows.length === 0) {
        return null;
      }

      const consignment = consignmentResult.rows[0];

      // Get public tracking events (only milestone events for security)
      const eventsQuery = `
        SELECT 
          te.event_type, te.location_name, te.city, te.event_timestamp,
          te.description,
          tst.status_name, tst.description as status_description,
          tst.is_milestone, tst.icon, tst.color, tst.sequence_order
        FROM tracking_events te
        LEFT JOIN tracking_status_types tst ON te.event_type = tst.status_code
        WHERE te.consignment_id = (
          SELECT id FROM consignments WHERE UPPER(cn_number) = UPPER($1)
        )
        AND tst.is_milestone = true
        ORDER BY te.event_timestamp ASC
      `;

      const eventsResult = await pool.query(eventsQuery, [cnNumber]);
      const timeline = eventsResult.rows;

      // Get current status
      const currentEvent = timeline[timeline.length - 1];
      const currentStatus = currentEvent ? {
        name: currentEvent.status_name,
        description: currentEvent.status_description || currentEvent.description || '',
        location: currentEvent.location_name || currentEvent.city,
        timestamp: currentEvent.event_timestamp,
        icon: currentEvent.icon,
        color: currentEvent.color
      } : {
        name: 'Consignment Booked',
        description: 'Your consignment has been booked',
        timestamp: consignment.booking_date,
        icon: 'package',
        color: '#3B82F6'
      };

      // Calculate progress
      const totalMilestones = 7;
      const completedMilestones = timeline.length;
      const progressPercentage = Math.min((completedMilestones / totalMilestones) * 100, 100);

      const progress = {
        percentage: Math.round(progressPercentage),
        current_stage: currentStatus.name,
        next_milestone: this.getNextMilestone(currentEvent?.event_type)
      };

      return {
        consignment_number: consignment.cn_number,
        status: consignment.status,
        status_description: currentStatus.description,
        from_city: consignment.from_city,
        to_city: consignment.to_city,
        booking_date: consignment.booking_date,
        estimated_delivery: undefined, // Not available in current schema
        timeline,
        current_status: currentStatus,
        progress
      };
    } catch (error) {
      console.error('Error fetching public tracking:', error);
      throw error;
    }
  }

  // Update vehicle location
  static async updateVehicleLocation(
    data: UpdateVehicleLocationRequest,
    tenantId: string
  ): Promise<VehicleLocation> {
    try {
      // Verify vehicle belongs to tenant
      const vehicleCheck = await pool.query(
        `SELECT v.id FROM vehicles v 
         JOIN companies c ON v.company_id = c.id 
         WHERE v.id = $1 AND c.tenant_id = $2`,
        [data.vehicle_id, tenantId]
      );

      if (vehicleCheck.rows.length === 0) {
        throw new Error('Vehicle not found or access denied');
      }

      const insertQuery = `
        INSERT INTO vehicle_locations (
          vehicle_id, latitude, longitude, altitude, accuracy, speed, heading,
          location_name, address, city, state, engine_status, fuel_level,
          odometer_reading, recorded_at, source, device_id, battery_level
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING *
      `;

      const values = [
        data.vehicle_id,
        data.latitude,
        data.longitude,
        data.altitude || null,
        data.accuracy || null,
        data.speed || null,
        data.heading || null,
        data.location_name || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.engine_status || null,
        data.fuel_level || null,
        data.odometer_reading || null,
        data.recorded_at || new Date(),
        data.source || 'gps',
        data.device_id || null,
        data.battery_level || null
      ];

      const result = await pool.query(insertQuery, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating vehicle location:', error);
      throw error;
    }
  }

  // Get tracking statistics
  static async getTrackingStats(tenantId: string): Promise<TrackingStatsResponse> {
    try {
      // Get basic counts
      const statsQuery = `
        SELECT 
          COUNT(*) as total_consignments,
          COUNT(*) FILTER (WHERE status IN ('IN_TRANSIT', 'PICKED_UP', 'OUT_SCAN')) as in_transit,
          COUNT(*) FILTER (WHERE status = 'DELIVERED' AND DATE(updated_at) = CURRENT_DATE) as delivered_today,
          COUNT(*) FILTER (WHERE status IN ('BOOKED', 'CONFIRMED')) as pending_pickup,
          COUNT(*) FILTER (WHERE status IN ('DAMAGED', 'LOST', 'HELD')) as exceptions
        FROM consignments
        WHERE tenant_id = $1 AND is_active = true
      `;

      const statsResult = await pool.query(statsQuery, [tenantId]);
      const stats = statsResult.rows[0];

      // Get performance metrics
      const performanceQuery = `
        SELECT 
          100.0 as on_time_delivery_rate, -- Placeholder: estimated_delivery_date not in schema
          AVG(EXTRACT(EPOCH FROM (updated_at - booking_date)) / 3600) as avg_transit_time_hours,
          COUNT(*) FILTER (WHERE status = 'DELIVERED') * 100.0 / NULLIF(COUNT(*), 0) as delivery_success_rate
        FROM consignments
        WHERE tenant_id = $1 AND booking_date >= CURRENT_DATE - INTERVAL '30 days'
      `;

      const performanceResult = await pool.query(performanceQuery, [tenantId]);
      const performance = performanceResult.rows[0];

      // Get recent activity
      const activityQuery = `
        SELECT 
          te.event_type,
          c.cn_number as consignment_number,
          COALESCE(te.location_name, te.city, 'Unknown') as location,
          te.event_timestamp as timestamp
        FROM tracking_events te
        JOIN consignments c ON te.consignment_id = c.id
        WHERE c.tenant_id = $1
        ORDER BY te.event_timestamp DESC
        LIMIT 10
      `;

      const activityResult = await pool.query(activityQuery, [tenantId]);

      return {
        total_consignments: parseInt(stats.total_consignments),
        in_transit: parseInt(stats.in_transit),
        delivered_today: parseInt(stats.delivered_today),
        pending_pickup: parseInt(stats.pending_pickup),
        exceptions: parseInt(stats.exceptions),
        performance: {
          on_time_delivery_rate: parseFloat(performance.on_time_delivery_rate) || 0,
          avg_transit_time_hours: parseFloat(performance.avg_transit_time_hours) || 0,
          delivery_success_rate: parseFloat(performance.delivery_success_rate) || 0
        },
        recent_activity: activityResult.rows
      };
    } catch (error) {
      console.error('Error fetching tracking stats:', error);
      throw error;
    }
  }

  // Search tracking events
  static async searchTrackingEvents(
    searchParams: TrackingSearchParams,
    tenantId: string
  ): Promise<{ events: TrackingEvent[]; total: number; page: number; limit: number }> {
    try {
      const {
        consignment_id,
        cn_number,
        event_type,
        category,
        from_date,
        to_date,
        branch_id,
        vehicle_id,
        city,
        state,
        milestones_only = false,
        page = 1,
        limit = 50,
        sort_by = 'event_timestamp',
        sort_order = 'desc'
      } = searchParams;

      // Build WHERE conditions
      const whereConditions: string[] = ['c.tenant_id = $1'];
      const queryParams: any[] = [tenantId];
      let paramIndex = 2;

      if (consignment_id) {
        whereConditions.push(`te.consignment_id = $${paramIndex}`);
        queryParams.push(consignment_id);
        paramIndex++;
      }

      if (cn_number) {
        whereConditions.push(`UPPER(c.cn_number) LIKE UPPER($${paramIndex})`);
        queryParams.push(`%${cn_number}%`);
        paramIndex++;
      }

      if (event_type) {
        whereConditions.push(`te.event_type = $${paramIndex}`);
        queryParams.push(event_type);
        paramIndex++;
      }

      if (category) {
        whereConditions.push(`tst.category = $${paramIndex}`);
        queryParams.push(category);
        paramIndex++;
      }

      if (from_date) {
        whereConditions.push(`te.event_timestamp >= $${paramIndex}`);
        queryParams.push(from_date);
        paramIndex++;
      }

      if (to_date) {
        whereConditions.push(`te.event_timestamp <= $${paramIndex}`);
        queryParams.push(to_date);
        paramIndex++;
      }

      if (branch_id) {
        whereConditions.push(`te.branch_id = $${paramIndex}`);
        queryParams.push(branch_id);
        paramIndex++;
      }

      if (vehicle_id) {
        whereConditions.push(`te.vehicle_id = $${paramIndex}`);
        queryParams.push(vehicle_id);
        paramIndex++;
      }

      if (city) {
        whereConditions.push(`UPPER(te.city) LIKE UPPER($${paramIndex})`);
        queryParams.push(`%${city}%`);
        paramIndex++;
      }

      if (state) {
        whereConditions.push(`UPPER(te.state) LIKE UPPER($${paramIndex})`);
        queryParams.push(`%${state}%`);
        paramIndex++;
      }

      if (milestones_only) {
        whereConditions.push(`tst.is_milestone = true`);
      }

      // Count query
      const countQuery = `
        SELECT COUNT(DISTINCT te.id) as total
        FROM tracking_events te
        JOIN consignments c ON te.consignment_id = c.id
        LEFT JOIN tracking_status_types tst ON te.event_type = tst.status_code
        WHERE ${whereConditions.join(' AND ')}
      `;

      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Main query
      const offset = (page - 1) * limit;
      const mainQuery = `
        SELECT 
          te.*,
          c.cn_number,
          tst.status_name, tst.description as status_description,
          tst.category, tst.sequence_order, tst.is_milestone,
          tst.icon, tst.color,
          b.name as branch_name,
          v.vehicle_number,
          d.name as driver_name
        FROM tracking_events te
        JOIN consignments c ON te.consignment_id = c.id
        LEFT JOIN tracking_status_types tst ON te.event_type = tst.status_code
        LEFT JOIN branches b ON te.branch_id = b.id
        LEFT JOIN vehicles v ON te.vehicle_id = v.id
        LEFT JOIN drivers d ON te.driver_id = d.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY te.${sort_by} ${sort_order.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await pool.query(mainQuery, queryParams);

      return {
        events: result.rows,
        total,
        page,
        limit
      };
    } catch (error) {
      console.error('Error searching tracking events:', error);
      throw error;
    }
  }

  // Helper: Get next milestone
  private static getNextMilestone(currentEventType?: string): string | undefined {
    const milestoneSequence = [
      'BOOKED', 'PICKED_UP', 'IN_SCAN', 'IN_TRANSIT', 
      'REACHED_DESTINATION', 'OUT_SCAN', 'DELIVERED'
    ];

    if (!currentEventType) return 'Pickup Scheduled';

    const currentIndex = milestoneSequence.indexOf(currentEventType);
    if (currentIndex >= 0 && currentIndex < milestoneSequence.length - 1) {
      const nextEvent = milestoneSequence[currentIndex + 1];
      const milestoneNames: { [key: string]: string } = {
        'PICKED_UP': 'Pickup',
        'IN_SCAN': 'Received at Origin',
        'IN_TRANSIT': 'In Transit',
        'REACHED_DESTINATION': 'Reached Destination',
        'OUT_SCAN': 'Out for Delivery',
        'DELIVERED': 'Delivered'
      };
      return milestoneNames[nextEvent];
    }

    return undefined;
  }
}