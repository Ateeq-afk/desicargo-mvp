-- Goods Master Table (Simple)
CREATE TABLE IF NOT EXISTS goods_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    goods_name VARCHAR(255) NOT NULL,
    goods_code VARCHAR(50),
    hsn_code VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rate Master Table (Fully Manual)
CREATE TABLE IF NOT EXISTS rate_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    from_city VARCHAR(100) NOT NULL,
    to_city VARCHAR(100) NOT NULL,
    rate_per_kg DECIMAL(10,2) NOT NULL,
    min_charge DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customer Specific Rates (Manual Override)
CREATE TABLE IF NOT EXISTS customer_rate_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    company_id UUID REFERENCES companies(id),
    from_city VARCHAR(100) NOT NULL,
    to_city VARCHAR(100) NOT NULL,
    special_rate DECIMAL(10,2) NOT NULL,
    min_charge DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rate History Table (For tracking all rate usage)
CREATE TABLE IF NOT EXISTS rate_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_id UUID REFERENCES consignments(id),
    rate_type VARCHAR(50) NOT NULL, -- 'default', 'customer', 'manual'
    from_city VARCHAR(100) NOT NULL,
    to_city VARCHAR(100) NOT NULL,
    applied_rate DECIMAL(10,2) NOT NULL,
    weight DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    entered_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rate Approval Table (Optional workflow)
CREATE TABLE IF NOT EXISTS rate_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_id UUID REFERENCES consignments(id),
    requested_rate DECIMAL(10,2) NOT NULL,
    standard_rate DECIMAL(10,2),
    reason TEXT,
    requested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_rate_master_route ON rate_master(company_id, from_city, to_city);
CREATE INDEX idx_customer_rate_route ON customer_rate_master(customer_id, from_city, to_city);
CREATE INDEX idx_goods_master_active ON goods_master(company_id, is_active);
CREATE INDEX idx_rate_history_consignment ON rate_history(consignment_id);