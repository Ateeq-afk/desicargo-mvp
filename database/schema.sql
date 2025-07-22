-- DesiCargo Database Schema
-- Complete database schema for logistics operations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies can have multiple branches
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15),
    logo_url TEXT,
    address TEXT,
    phone VARCHAR(15),
    email VARCHAR(100),
    subscription_plan VARCHAR(50) DEFAULT 'starter',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    branch_code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    phone VARCHAR(15),
    email VARCHAR(100),
    is_head_office BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    branch_id UUID REFERENCES branches(id),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL, -- superadmin, admin, manager, operator, accountant
    phone VARCHAR(15),
    email VARCHAR(100),
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    customer_code VARCHAR(20) UNIQUE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    alternate_phone VARCHAR(15),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    pincode VARCHAR(10),
    gstin VARCHAR(15),
    customer_type VARCHAR(20) DEFAULT 'walkin', -- regular, walkin, corporate
    credit_limit DECIMAL(10,2) DEFAULT 0,
    credit_days INT DEFAULT 0,
    opening_balance DECIMAL(10,2) DEFAULT 0,
    special_rates JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    from_city VARCHAR(100) NOT NULL,
    to_city VARCHAR(100) NOT NULL,
    distance_km INT,
    transit_days INT DEFAULT 1,
    rate_per_kg DECIMAL(10,2),
    min_charge DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, from_city, to_city)
);

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    vehicle_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50), -- mini, tata407, truck, trailer
    capacity_kg INT,
    owner_type VARCHAR(20), -- own, attached, hired
    owner_name VARCHAR(100),
    owner_phone VARCHAR(15),
    insurance_expiry DATE,
    fitness_expiry DATE,
    permit_expiry DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    driver_code VARCHAR(20) UNIQUE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    alternate_phone VARCHAR(15),
    address TEXT,
    license_number VARCHAR(50),
    license_expiry DATE,
    salary_type VARCHAR(20), -- fixed, per_trip, per_km
    salary_amount DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main consignment table
CREATE TABLE IF NOT EXISTS consignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    cn_number VARCHAR(20) UNIQUE NOT NULL,
    booking_date DATE DEFAULT CURRENT_DATE,
    booking_time TIME DEFAULT CURRENT_TIME,
    from_branch_id UUID REFERENCES branches(id),
    to_branch_id UUID REFERENCES branches(id),
    
    -- Consignor (Sender) Details
    consignor_id UUID REFERENCES customers(id),
    consignor_name VARCHAR(255) NOT NULL,
    consignor_phone VARCHAR(15) NOT NULL,
    consignor_address TEXT,
    consignor_gstin VARCHAR(15),
    
    -- Consignee (Receiver) Details  
    consignee_name VARCHAR(255) NOT NULL,
    consignee_phone VARCHAR(15) NOT NULL,
    consignee_address TEXT,
    consignee_pincode VARCHAR(10),
    
    -- Goods Details
    goods_description TEXT,
    goods_value DECIMAL(12,2),
    eway_bill_number VARCHAR(50),
    invoice_number VARCHAR(50),
    no_of_packages INT NOT NULL,
    actual_weight DECIMAL(10,2),
    charged_weight DECIMAL(10,2),
    
    -- Charges Breakdown
    freight_amount DECIMAL(10,2) NOT NULL,
    hamali_charges DECIMAL(10,2) DEFAULT 0,
    door_delivery_charges DECIMAL(10,2) DEFAULT 0,
    loading_charges DECIMAL(10,2) DEFAULT 0,
    unloading_charges DECIMAL(10,2) DEFAULT 0,
    other_charges DECIMAL(10,2) DEFAULT 0,
    statistical_charges DECIMAL(10,2) DEFAULT 0,
    
    -- GST Details
    gst_percentage DECIMAL(5,2) DEFAULT 18,
    cgst DECIMAL(10,2) DEFAULT 0,
    sgst DECIMAL(10,2) DEFAULT 0,
    igst DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Payment Information
    payment_type VARCHAR(20) NOT NULL, -- paid, topay, tbb
    
    -- Delivery Type
    delivery_type VARCHAR(20) DEFAULT 'godown', -- godown, door
    
    -- Status Tracking
    status VARCHAR(20) DEFAULT 'booked',
    current_branch_id UUID REFERENCES branches(id),
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OGPL (Outward Goods Parcel List)
CREATE TABLE IF NOT EXISTS ogpl (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    ogpl_number VARCHAR(20) UNIQUE NOT NULL,
    ogpl_date DATE DEFAULT CURRENT_DATE,
    from_branch_id UUID REFERENCES branches(id),
    to_branch_id UUID REFERENCES branches(id),
    vehicle_id UUID REFERENCES vehicles(id),
    vehicle_number VARCHAR(20),
    driver_id UUID REFERENCES drivers(id),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(15),
    seal_number VARCHAR(50),
    departure_time TIMESTAMP,
    arrival_time TIMESTAMP,
    total_packages INT DEFAULT 0,
    total_weight DECIMAL(10,2) DEFAULT 0,
    total_consignments INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'created', -- created, departed, intransit, reached
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OGPL Details
CREATE TABLE IF NOT EXISTS ogpl_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ogpl_id UUID REFERENCES ogpl(id),
    consignment_id UUID REFERENCES consignments(id),
    loaded_packages INT,
    remarks TEXT,
    loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ogpl_id, consignment_id)
);

-- Delivery Management
CREATE TABLE IF NOT EXISTS delivery_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    branch_id UUID REFERENCES branches(id),
    run_number VARCHAR(20) UNIQUE NOT NULL,
    run_date DATE DEFAULT CURRENT_DATE,
    delivery_boy_name VARCHAR(100),
    delivery_boy_phone VARCHAR(15),
    vehicle_number VARCHAR(20),
    total_consignments INT DEFAULT 0,
    delivered INT DEFAULT 0,
    pending INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'created',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_run_id UUID REFERENCES delivery_runs(id),
    consignment_id UUID REFERENCES consignments(id),
    delivery_status VARCHAR(20), -- delivered, undelivered, partial
    delivered_to VARCHAR(100),
    delivery_time TIMESTAMP,
    receiver_phone VARCHAR(15),
    undelivered_reason TEXT,
    signature_image TEXT,
    delivery_photo TEXT,
    otp_verified BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial Tables
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    invoice_number VARCHAR(20) UNIQUE NOT NULL,
    invoice_date DATE DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES customers(id),
    from_date DATE,
    to_date DATE,
    total_consignments INT,
    subtotal DECIMAL(12,2),
    cgst DECIMAL(10,2),
    sgst DECIMAL(10,2),
    igst DECIMAL(10,2),
    total_amount DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'pending', -- pending, partial, paid
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_consignments_cn_number ON consignments(cn_number);
CREATE INDEX IF NOT EXISTS idx_consignments_status ON consignments(status);
CREATE INDEX IF NOT EXISTS idx_consignments_from_branch ON consignments(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_consignments_to_branch ON consignments(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_ogpl_status ON ogpl(status);
CREATE INDEX IF NOT EXISTS idx_ogpl_from_branch ON ogpl(from_branch_id);

-- Add tracking history table
CREATE TABLE IF NOT EXISTS tracking_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_id UUID REFERENCES consignments(id),
    status VARCHAR(50),
    location VARCHAR(255),
    branch_id UUID REFERENCES branches(id),
    remarks TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add payment receipts table
CREATE TABLE IF NOT EXISTS payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    receipt_number VARCHAR(20) UNIQUE NOT NULL,
    receipt_date DATE DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES customers(id),
    invoice_id UUID REFERENCES invoices(id),
    amount DECIMAL(12,2),
    payment_mode VARCHAR(20), -- cash, cheque, online, upi
    reference_number VARCHAR(50),
    remarks TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add cities master table
CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(name, state)
);

-- Insert some default cities
INSERT INTO cities (name, state) VALUES 
    ('Mumbai', 'Maharashtra'),
    ('Delhi', 'Delhi'),
    ('Bangalore', 'Karnataka'),
    ('Hyderabad', 'Telangana'),
    ('Chennai', 'Tamil Nadu'),
    ('Kolkata', 'West Bengal'),
    ('Pune', 'Maharashtra'),
    ('Ahmedabad', 'Gujarat'),
    ('Surat', 'Gujarat'),
    ('Jaipur', 'Rajasthan')
ON CONFLICT DO NOTHING;