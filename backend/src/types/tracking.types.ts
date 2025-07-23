// Enhanced Tracking System Type Definitions

export interface TrackingStatusType {
  id: string;
  status_code: string;
  status_name: string;
  description?: string;
  category: 'booking' | 'pickup' | 'transit' | 'delivery' | 'exception';
  sequence_order: number;
  is_milestone: boolean;
  icon?: string;
  color?: string;
  is_active: boolean;
  created_at: Date;
}

export interface TrackingEvent {
  id: string;
  consignment_id: string;
  event_type: string;
  
  // Location Information
  location_name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  
  // GPS Coordinates
  latitude?: number;
  longitude?: number;
  gps_accuracy?: number;
  
  // Additional Details
  description?: string;
  remarks?: string;
  images?: string[];
  
  // System Information
  branch_id?: string;
  vehicle_id?: string;
  driver_id?: string;
  ogpl_id?: string;
  
  // User & System Tracking
  created_by?: string;
  created_by_type: 'user' | 'system' | 'api' | 'mobile';
  ip_address?: string;
  user_agent?: string;
  
  // Timing
  event_timestamp: Date;
  created_at: Date;
  
  // Delivery Specific Fields
  delivery_attempts: number;
  delivery_failure_reason?: string;
  recipient_name?: string;
  recipient_signature_url?: string;
  pod_images?: string[];
  
  // Estimated Times
  estimated_delivery_date?: Date;
  actual_delivery_date?: Date;
  
  // Relations (populated in queries)
  status_type?: TrackingStatusType;
  branch?: any;
  vehicle?: any;
  driver?: any;
  consignment?: any;
}

export interface VehicleLocation {
  id: string;
  vehicle_id: string;
  
  // GPS Data
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  
  // Additional Data
  location_name?: string;
  address?: string;
  city?: string;
  state?: string;
  
  // Engine & Vehicle Data
  engine_status?: 'on' | 'off' | 'idle';
  fuel_level?: number;
  odometer_reading?: number;
  
  // System Information
  recorded_at: Date;
  created_at: Date;
  
  // Data Source
  source: 'gps' | 'manual' | 'estimated';
  device_id?: string;
  battery_level?: number;
  
  // Relations
  vehicle?: any;
}

export interface TrackingNotification {
  id: string;
  consignment_id: string;
  
  // Notification Details
  notification_type: 'sms' | 'whatsapp' | 'email' | 'push';
  event_type: string;
  
  // Recipient Information
  recipient_type: 'consignor' | 'consignee' | 'internal';
  recipient_name?: string;
  recipient_contact?: string;
  recipient_email?: string;
  
  // Message Content
  subject?: string;
  message: string;
  template_id?: string;
  
  // Delivery Status
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at?: Date;
  delivered_at?: Date;
  error_message?: string;
  
  // External Service Data
  external_message_id?: string;
  service_provider?: string;
  cost?: number;
  
  // System Information
  created_by?: string;
  created_at: Date;
  
  // Retry Information
  retry_count: number;
  max_retries: number;
  next_retry_at?: Date;
  
  // Relations
  consignment?: any;
  status_type?: TrackingStatusType;
}

export interface TrackingAnalytics {
  id: string;
  
  // Time Period
  date: Date;
  hour?: number;
  
  // Metrics
  total_events: number;
  milestone_events: number;
  delivery_events: number;
  exception_events: number;
  
  // Performance Metrics
  avg_transit_time?: number;
  on_time_deliveries: number;
  delayed_deliveries: number;
  delivery_success_rate?: number;
  
  // Notification Metrics
  notifications_sent: number;
  notification_success_rate?: number;
  
  // System Performance
  avg_response_time?: number;
  api_calls: number;
  
  // Aggregation Level
  aggregation_type: 'daily' | 'hourly' | 'branch' | 'route';
  branch_id?: string;
  route?: string;
  
  created_at: Date;
}

// Request/Response DTOs
export interface CreateTrackingEventRequest {
  consignment_id: string;
  event_type: string;
  
  // Location Information
  location_name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  
  // GPS Coordinates
  latitude?: number;
  longitude?: number;
  gps_accuracy?: number;
  
  // Additional Details
  description?: string;
  remarks?: string;
  images?: string[];
  
  // System Information
  branch_id?: string;
  vehicle_id?: string;
  driver_id?: string;
  ogpl_id?: string;
  
  // Timing
  event_timestamp?: Date;
  
  // Delivery Specific Fields
  delivery_attempts?: number;
  delivery_failure_reason?: string;
  recipient_name?: string;
  recipient_signature_url?: string;
  pod_images?: string[];
  
  // Estimated Times
  estimated_delivery_date?: Date;
  actual_delivery_date?: Date;
}

export interface UpdateVehicleLocationRequest {
  vehicle_id: string;
  
  // GPS Data
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  
  // Additional Data
  location_name?: string;
  address?: string;
  city?: string;
  state?: string;
  
  // Engine & Vehicle Data
  engine_status?: 'on' | 'off' | 'idle';
  fuel_level?: number;
  odometer_reading?: number;
  
  // System Information
  recorded_at?: Date;
  
  // Data Source
  source?: 'gps' | 'manual' | 'estimated';
  device_id?: string;
  battery_level?: number;
}

export interface TrackingSearchParams {
  consignment_id?: string;
  cn_number?: string;
  event_type?: string;
  category?: string;
  from_date?: Date;
  to_date?: Date;
  branch_id?: string;
  vehicle_id?: string;
  city?: string;
  state?: string;
  milestones_only?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'event_timestamp' | 'created_at' | 'sequence_order';
  sort_order?: 'asc' | 'desc';
}

export interface TrackingTimelineResponse {
  consignment: {
    id: string;
    cn_number: string;
    consignor_name: string;
    consignor_phone: string;
    consignee_name: string;
    consignee_phone: string;
    from_city: string;
    to_city: string;
    status: string;
    booking_date: Date;
    estimated_delivery_date?: Date;
  };
  timeline: TrackingEvent[];
  current_location?: {
    latitude?: number;
    longitude?: number;
    location_name?: string;
    city?: string;
    last_updated: Date;
  };
  delivery_estimate?: {
    estimated_date: Date;
    confidence: number;
    factors: string[];
  };
  summary: {
    total_events: number;
    milestone_events: number;
    last_update: Date;
    transit_time_hours: number;
    progress_percentage: number;
  };
}

export interface PublicTrackingResponse {
  consignment_number: string;
  status: string;
  status_description: string;
  from_city: string;
  to_city: string;
  booking_date: Date;
  estimated_delivery?: Date;
  timeline: {
    event_type: string;
    status_name: string;
    description?: string;
    location_name?: string;
    city?: string;
    event_timestamp: Date;
    is_milestone: boolean;
    icon?: string;
    color?: string;
  }[];
  current_status: {
    name: string;
    description: string;
    location?: string;
    timestamp: Date;
    icon?: string;
    color?: string;
  };
  progress: {
    percentage: number;
    current_stage: string;
    next_milestone?: string;
  };
}

export interface TrackingStatsResponse {
  total_consignments: number;
  in_transit: number;
  delivered_today: number;
  pending_pickup: number;
  exceptions: number;
  
  performance: {
    on_time_delivery_rate: number;
    avg_transit_time_hours: number;
    delivery_success_rate: number;
  };
  
  recent_activity: {
    event_type: string;
    consignment_number: string;
    location: string;
    timestamp: Date;
  }[];
}

// Notification Template Types
export interface NotificationTemplate {
  id: string;
  template_id: string;
  name: string;
  event_type: string;
  notification_type: 'sms' | 'whatsapp' | 'email' | 'push';
  subject?: string;
  message_template: string;
  variables: string[];
  is_active: boolean;
  created_at: Date;
}

export interface ProcessNotificationRequest {
  consignment_id: string;
  event_type: string;
  notification_types?: ('sms' | 'whatsapp' | 'email' | 'push')[];
  custom_message?: string;
  recipient_override?: {
    type: 'consignor' | 'consignee' | 'custom';
    name?: string;
    contact?: string;
    email?: string;
  };
}