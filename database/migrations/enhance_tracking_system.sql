-- Enhanced Tracking System Migration
-- This enhances the existing tracking system with comprehensive features

-- ============================================================================
-- 1. ENHANCED CONSIGNMENT STATUS TYPES
-- ============================================================================

-- Create enum-like table for standardized status types
CREATE TABLE IF NOT EXISTS tracking_status_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_code VARCHAR(30) UNIQUE NOT NULL,
    status_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(20) NOT NULL, -- booking, pickup, transit, delivery, exception
    sequence_order INTEGER NOT NULL,
    is_milestone BOOLEAN DEFAULT false, -- Key milestones for timeline
    icon VARCHAR(50),
    color VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert standard tracking statuses
INSERT INTO tracking_status_types (status_code, status_name, description, category, sequence_order, is_milestone, icon, color) VALUES
-- Booking Phase
('BOOKED', 'Consignment Booked', 'Consignment has been created and booked in the system', 'booking', 1, true, 'package', '#3B82F6'),
('CONFIRMED', 'Booking Confirmed', 'Booking details confirmed and ready for pickup', 'booking', 2, false, 'check-circle', '#10B981'),

-- Pickup Phase  
('PICKUP_SCHEDULED', 'Pickup Scheduled', 'Pickup has been scheduled with pickup boy', 'pickup', 3, false, 'calendar', '#F59E0B'),
('PICKUP_ATTEMPTED', 'Pickup Attempted', 'Pickup was attempted but unsuccessful', 'pickup', 4, false, 'alert-circle', '#EF4444'),
('PICKED_UP', 'Picked Up', 'Consignment has been picked up from consignor', 'pickup', 5, true, 'truck', '#10B981'),

-- Transit Phase
('IN_SCAN', 'Received at Origin', 'Consignment received and scanned at origin branch', 'transit', 6, true, 'scan', '#8B5CF6'),
('LOADED_ON_VEHICLE', 'Loaded on Vehicle', 'Consignment loaded on vehicle for transit', 'transit', 7, false, 'truck', '#3B82F6'),
('IN_TRANSIT', 'In Transit', 'Consignment is in transit between locations', 'transit', 8, true, 'map-pin', '#F59E0B'),
('REACHED_DESTINATION', 'Reached Destination', 'Consignment has reached destination branch', 'transit', 9, true, 'map-pin', '#10B981'),
('OUT_SCAN', 'Out for Delivery', 'Consignment is out for delivery to consignee', 'transit', 10, true, 'truck', '#3B82F6'),

-- Delivery Phase
('DELIVERY_ATTEMPTED', 'Delivery Attempted', 'Delivery was attempted but unsuccessful', 'delivery', 11, false, 'alert-circle', '#EF4444'),
('DELIVERED', 'Delivered', 'Consignment successfully delivered to consignee', 'delivery', 12, true, 'check', '#10B981'),
('PARTIAL_DELIVERED', 'Partial Delivery', 'Some packages delivered, others pending', 'delivery', 13, false, 'package', '#F59E0B'),

-- Exception Handling
('DAMAGED', 'Damaged in Transit', 'Consignment damaged during transportation', 'exception', 50, false, 'alert-triangle', '#EF4444'),
('LOST', 'Lost in Transit', 'Consignment cannot be located', 'exception', 51, false, 'x-circle', '#EF4444'),
('RETURNED', 'Returned to Sender', 'Consignment returned to consignor', 'exception', 52, false, 'corner-up-left', '#6B7280'),
('HELD', 'Held at Location', 'Consignment held due to issues', 'exception', 53, false, 'pause-circle', '#F59E0B'),
('RESCHEDULED', 'Delivery Rescheduled', 'Delivery rescheduled as per customer request', 'exception', 54, false, 'calendar', '#F59E0B');

-- ============================================================================
-- 2. ENHANCED TRACKING EVENTS TABLE
-- ============================================================================

-- Enhanced tracking events with more details
CREATE TABLE IF NOT EXISTS tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_id UUID REFERENCES consignments(id) ON DELETE CASCADE,
    event_type VARCHAR(30) REFERENCES tracking_status_types(status_code),
    
    -- Location Information
    location_name VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50) DEFAULT 'India',
    pincode VARCHAR(10),
    
    -- GPS Coordinates
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    gps_accuracy DECIMAL(10, 2), -- accuracy in meters
    
    -- Additional Details
    description TEXT,
    remarks TEXT,
    images JSONB DEFAULT '[]'::jsonb, -- Array of image URLs
    
    -- System Information
    branch_id UUID REFERENCES branches(id),
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID REFERENCES drivers(id),
    ogpl_id UUID REFERENCES ogpl(id),
    
    -- User & System Tracking
    created_by UUID REFERENCES users(id),
    created_by_type VARCHAR(20) DEFAULT 'user', -- user, system, api, mobile
    ip_address INET,
    user_agent TEXT,
    
    -- Timing
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Delivery Specific Fields
    delivery_attempts INTEGER DEFAULT 0,
    delivery_failure_reason TEXT,
    recipient_name VARCHAR(255),
    recipient_signature_url TEXT,
    pod_images JSONB DEFAULT '[]'::jsonb,
    
    -- Estimated Times
    estimated_delivery_date TIMESTAMP WITH TIME ZONE,
    actual_delivery_date TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 3. VEHICLE LOCATION TRACKING
-- ============================================================================

-- Real-time vehicle locations
CREATE TABLE IF NOT EXISTS vehicle_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    
    -- GPS Data
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    altitude DECIMAL(10, 2),
    accuracy DECIMAL(10, 2),
    speed DECIMAL(8, 2), -- km/h
    heading DECIMAL(6, 2), -- degrees
    
    -- Additional Data
    location_name VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    
    -- Engine & Vehicle Data
    engine_status VARCHAR(20), -- on, off, idle
    fuel_level DECIMAL(5, 2), -- percentage
    odometer_reading DECIMAL(10, 2), -- km
    
    -- System Information
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Data Source
    source VARCHAR(20) DEFAULT 'gps', -- gps, manual, estimated
    device_id VARCHAR(100),
    battery_level INTEGER
);

-- ============================================================================
-- 4. TRACKING NOTIFICATIONS
-- ============================================================================

-- Notification preferences and history
CREATE TABLE IF NOT EXISTS tracking_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_id UUID REFERENCES consignments(id) ON DELETE CASCADE,
    
    -- Notification Details
    notification_type VARCHAR(30) NOT NULL, -- sms, whatsapp, email, push
    event_type VARCHAR(30) REFERENCES tracking_status_types(status_code),
    
    -- Recipient Information
    recipient_type VARCHAR(20) NOT NULL, -- consignor, consignee, internal
    recipient_name VARCHAR(255),
    recipient_contact VARCHAR(20),
    recipient_email VARCHAR(255),
    
    -- Message Content
    subject VARCHAR(255),
    message TEXT NOT NULL,
    template_id VARCHAR(50),
    
    -- Delivery Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, failed
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- External Service Data
    external_message_id VARCHAR(100),
    service_provider VARCHAR(50), -- twilio, msg91, firebase, etc.
    cost DECIMAL(8, 4), -- cost of sending notification
    
    -- System Information
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Retry Information
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 5. TRACKING ANALYTICS
-- ============================================================================

-- Performance metrics for tracking
CREATE TABLE IF NOT EXISTS tracking_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Time Period
    date DATE NOT NULL,
    hour INTEGER, -- 0-23 for hourly analytics
    
    -- Metrics
    total_events INTEGER DEFAULT 0,
    milestone_events INTEGER DEFAULT 0,
    delivery_events INTEGER DEFAULT 0,
    exception_events INTEGER DEFAULT 0,
    
    -- Performance Metrics
    avg_transit_time DECIMAL(10, 2), -- hours
    on_time_deliveries INTEGER DEFAULT 0,
    delayed_deliveries INTEGER DEFAULT 0,
    delivery_success_rate DECIMAL(5, 2),
    
    -- Notification Metrics
    notifications_sent INTEGER DEFAULT 0,
    notification_success_rate DECIMAL(5, 2),
    
    -- System Performance
    avg_response_time DECIMAL(10, 3), -- milliseconds
    api_calls INTEGER DEFAULT 0,
    
    -- Aggregation Level
    aggregation_type VARCHAR(20) NOT NULL, -- daily, hourly, branch, route
    branch_id UUID REFERENCES branches(id),
    route VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date, hour, aggregation_type, branch_id, route)
);

-- ============================================================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Tracking Events Indexes
CREATE INDEX IF NOT EXISTS idx_tracking_events_consignment ON tracking_events(consignment_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_timestamp ON tracking_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_tracking_events_type ON tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tracking_events_location ON tracking_events(city, state);
CREATE INDEX IF NOT EXISTS idx_tracking_events_branch ON tracking_events(branch_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_vehicle ON tracking_events(vehicle_id);

-- Vehicle Locations Indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_locations_vehicle ON vehicle_locations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_locations_recorded_at ON vehicle_locations(recorded_at);
CREATE INDEX IF NOT EXISTS idx_vehicle_locations_gps ON vehicle_locations(latitude, longitude);

-- Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_tracking_notifications_consignment ON tracking_notifications(consignment_id);
CREATE INDEX IF NOT EXISTS idx_tracking_notifications_status ON tracking_notifications(status);
CREATE INDEX IF NOT EXISTS idx_tracking_notifications_type ON tracking_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_tracking_notifications_retry ON tracking_notifications(next_retry_at) WHERE status = 'pending';

-- Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_tracking_analytics_date ON tracking_analytics(date);
CREATE INDEX IF NOT EXISTS idx_tracking_analytics_branch ON tracking_analytics(branch_id);

-- ============================================================================
-- 7. TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to automatically update consignment status
CREATE OR REPLACE FUNCTION update_consignment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the main consignment status based on latest tracking event
    UPDATE consignments 
    SET 
        status = NEW.event_type,
        current_branch_id = COALESCE(NEW.branch_id, current_branch_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.consignment_id;
    
    -- Update estimated delivery date for certain events
    IF NEW.event_type IN ('IN_TRANSIT', 'REACHED_DESTINATION') THEN
        -- Add business logic for estimated delivery calculation
        -- This could be enhanced with route optimization algorithms
        UPDATE consignments 
        SET estimated_delivery_date = CURRENT_TIMESTAMP + INTERVAL '1 day'
        WHERE id = NEW.consignment_id AND estimated_delivery_date IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update consignment status when tracking event is added
CREATE TRIGGER trigger_update_consignment_status
    AFTER INSERT ON tracking_events
    FOR EACH ROW
    EXECUTE FUNCTION update_consignment_status();

-- Function to create automatic notifications
CREATE OR REPLACE FUNCTION create_tracking_notifications()
RETURNS TRIGGER AS $$
DECLARE
    consignment_row consignments%ROWTYPE;
    should_notify BOOLEAN := false;
BEGIN
    -- Get consignment details
    SELECT * INTO consignment_row FROM consignments WHERE id = NEW.consignment_id;
    
    -- Determine if this event should trigger notifications
    SELECT is_milestone INTO should_notify 
    FROM tracking_status_types 
    WHERE status_code = NEW.event_type;
    
    -- Create notifications for milestone events
    IF should_notify THEN
        -- Notify consignor
        INSERT INTO tracking_notifications (
            consignment_id, notification_type, event_type,
            recipient_type, recipient_name, recipient_contact,
            message, template_id
        ) VALUES (
            NEW.consignment_id, 'whatsapp', NEW.event_type,
            'consignor', consignment_row.consignor_name, consignment_row.consignor_phone,
            'Your consignment ' || consignment_row.cn_number || ' status: ' || NEW.event_type,
            'milestone_update'
        );
        
        -- Notify consignee for certain events
        IF NEW.event_type IN ('IN_TRANSIT', 'OUT_SCAN', 'DELIVERED') THEN
            INSERT INTO tracking_notifications (
                consignment_id, notification_type, event_type,
                recipient_type, recipient_name, recipient_contact,
                message, template_id
            ) VALUES (
                NEW.consignment_id, 'whatsapp', NEW.event_type,
                'consignee', consignment_row.consignee_name, consignment_row.consignee_phone,
                'Your consignment ' || consignment_row.cn_number || ' status: ' || NEW.event_type,
                'milestone_update'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notifications
CREATE TRIGGER trigger_create_tracking_notifications
    AFTER INSERT ON tracking_events
    FOR EACH ROW
    EXECUTE FUNCTION create_tracking_notifications();

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE tracking_status_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracking_events
CREATE POLICY tracking_events_tenant_isolation ON tracking_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM consignments c 
            WHERE c.id = tracking_events.consignment_id 
            AND c.tenant_id = current_tenant_id()
        )
    );

-- RLS Policies for vehicle_locations
CREATE POLICY vehicle_locations_tenant_isolation ON vehicle_locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM vehicles v 
            JOIN companies comp ON v.company_id = comp.id
            WHERE v.id = vehicle_locations.vehicle_id 
            AND comp.tenant_id = current_tenant_id()
        )
    );

-- RLS Policies for tracking_notifications
CREATE POLICY tracking_notifications_tenant_isolation ON tracking_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM consignments c 
            WHERE c.id = tracking_notifications.consignment_id 
            AND c.tenant_id = current_tenant_id()
        )
    );

-- Status types are global, no RLS needed but we can add if needed
CREATE POLICY tracking_status_types_public ON tracking_status_types
    FOR SELECT USING (true);

-- Analytics tenant isolation
CREATE POLICY tracking_analytics_tenant_isolation ON tracking_analytics
    FOR ALL USING (
        branch_id IS NULL OR EXISTS (
            SELECT 1 FROM branches b 
            JOIN companies comp ON b.company_id = comp.id
            WHERE b.id = tracking_analytics.branch_id 
            AND comp.tenant_id = current_tenant_id()
        )
    );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show all tracking status types
SELECT 
    'Status Types' as info,
    category,
    COUNT(*) as status_count,
    STRING_AGG(status_name, ', ' ORDER BY sequence_order) as statuses
FROM tracking_status_types 
WHERE is_active = true
GROUP BY category
ORDER BY 
    CASE category 
        WHEN 'booking' THEN 1 
        WHEN 'pickup' THEN 2 
        WHEN 'transit' THEN 3 
        WHEN 'delivery' THEN 4 
        WHEN 'exception' THEN 5 
    END;

-- Show milestone statuses
SELECT 
    'Milestone Statuses' as info,
    status_code,
    status_name,
    sequence_order,
    icon,
    color
FROM tracking_status_types 
WHERE is_milestone = true 
ORDER BY sequence_order;