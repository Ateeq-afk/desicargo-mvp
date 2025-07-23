-- Enhance customers table with additional fields

-- Add new columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pan_number VARCHAR(10);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(15);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) DEFAULT 'cash'; -- cash, bank_transfer, upi, cheque
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_ifsc_code VARCHAR(15);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_person_id UUID REFERENCES users(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_category VARCHAR(50); -- vip, regular, premium
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_type VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS monthly_volume_commitment DECIMAL(10,2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_access BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_username VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_communication_date TIMESTAMP;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS blacklist_reason TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_preferences JSONB DEFAULT '{}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_pan_number ON customers(pan_number);
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp_number ON customers(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_customers_customer_category ON customers(customer_category);
CREATE INDEX IF NOT EXISTS idx_customers_is_blacklisted ON customers(is_blacklisted);

-- Create customer addresses table for multiple addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id),
    address_type VARCHAR(20) NOT NULL, -- pickup, delivery, billing
    contact_person VARCHAR(100),
    phone VARCHAR(15),
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    pincode VARCHAR(10),
    landmark VARCHAR(255),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for customer addresses
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_tenant_id ON customer_addresses(tenant_id);

-- Create customer contacts table for multiple contact persons
CREATE TABLE IF NOT EXISTS customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    phone VARCHAR(15) NOT NULL,
    whatsapp_number VARCHAR(15),
    email VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    contact_type VARCHAR(20), -- billing, operations, management
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for customer contacts
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_tenant_id ON customer_contacts(tenant_id);

-- Create customer rate contracts table
CREATE TABLE IF NOT EXISTS customer_rate_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id),
    contract_number VARCHAR(50) UNIQUE,
    from_city VARCHAR(100),
    to_city VARCHAR(100),
    rate_per_kg DECIMAL(10,2),
    min_charge DECIMAL(10,2),
    fuel_surcharge_percent DECIMAL(5,2) DEFAULT 0,
    gst_percent DECIMAL(5,2) DEFAULT 18,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for rate contracts
CREATE INDEX IF NOT EXISTS idx_customer_rate_contracts_customer_id ON customer_rate_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_rate_contracts_tenant_id ON customer_rate_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_rate_contracts_validity ON customer_rate_contracts(valid_from, valid_to);

-- Add RLS policies for new tables
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_rate_contracts ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_addresses
CREATE POLICY customer_addresses_tenant_isolation ON customer_addresses
    FOR ALL USING (
        tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true))
        OR 
        current_setting('app.is_superadmin', true) = 'true'
    );

-- RLS policies for customer_contacts
CREATE POLICY customer_contacts_tenant_isolation ON customer_contacts
    FOR ALL USING (
        tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true))
        OR 
        current_setting('app.is_superadmin', true) = 'true'
    );

-- RLS policies for customer_rate_contracts
CREATE POLICY customer_rate_contracts_tenant_isolation ON customer_rate_contracts
    FOR ALL USING (
        tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true))
        OR 
        current_setting('app.is_superadmin', true) = 'true'
    );