-- Enhanced Goods System Migration
-- This migration enhances the goods system with categories, packaging types, and additional features

-- 1. Create Goods Categories Table
CREATE TABLE IF NOT EXISTS goods_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES goods_categories(id) ON DELETE CASCADE,
    icon VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, name, parent_id)
);

-- 2. Create Packaging Types Table
CREATE TABLE IF NOT EXISTS packaging_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    dimensions JSONB, -- {length: 0, width: 0, height: 0, unit: 'cm'}
    max_weight DECIMAL(10,2), -- in kg
    tare_weight DECIMAL(10,2), -- packaging weight in kg
    is_stackable BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, code)
);

-- 3. Enhance Goods Master Table
ALTER TABLE goods_master
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES goods_categories(id),
ADD COLUMN IF NOT EXISTS packaging_type_id UUID REFERENCES packaging_types(id),
ADD COLUMN IF NOT EXISTS unit_of_measurement VARCHAR(20) DEFAULT 'pcs',
ADD COLUMN IF NOT EXISTS dimensions JSONB, -- {length: 0, width: 0, height: 0, unit: 'cm'}
ADD COLUMN IF NOT EXISTS weight_per_unit DECIMAL(10,3), -- in kg
ADD COLUMN IF NOT EXISTS is_fragile BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_hazardous BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_perishable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS temperature_requirements JSONB, -- {min: -20, max: 5, unit: 'C'}
ADD COLUMN IF NOT EXISTS handling_instructions TEXT,
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
ADD COLUMN IF NOT EXISTS qr_code VARCHAR(200),
ADD COLUMN IF NOT EXISTS min_insurance_value DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER,
ADD COLUMN IF NOT EXISTS stackable_quantity INTEGER;

-- 4. Create Goods Documents Table
CREATE TABLE IF NOT EXISTS goods_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goods_id UUID REFERENCES goods_master(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'msds', 'specification', 'certificate', 'manual'
    document_name VARCHAR(255) NOT NULL,
    document_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- 5. Create Goods Aliases Table (for search and multilingual support)
CREATE TABLE IF NOT EXISTS goods_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goods_id UUID REFERENCES goods_master(id) ON DELETE CASCADE,
    alias_name VARCHAR(255) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create Goods Attributes Table (for dynamic attributes)
CREATE TABLE IF NOT EXISTS goods_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goods_id UUID REFERENCES goods_master(id) ON DELETE CASCADE,
    attribute_name VARCHAR(100) NOT NULL,
    attribute_value TEXT,
    attribute_type VARCHAR(20) DEFAULT 'text', -- 'text', 'number', 'boolean', 'date'
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create Goods Pricing Rules Table
CREATE TABLE IF NOT EXISTS goods_pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    goods_id UUID REFERENCES goods_master(id) ON DELETE CASCADE,
    category_id UUID REFERENCES goods_categories(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL, -- 'surcharge', 'discount', 'handling_fee'
    rule_name VARCHAR(100) NOT NULL,
    conditions JSONB, -- {min_weight: 10, max_weight: 100, routes: ['Delhi-Mumbai']}
    charge_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed'
    charge_value DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    valid_from DATE,
    valid_to DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_rule_by_goods_or_category CHECK (
        (goods_id IS NOT NULL AND category_id IS NULL) OR
        (goods_id IS NULL AND category_id IS NOT NULL)
    )
);

-- 8. Create Goods Compatibility Matrix (which goods can be shipped together)
CREATE TABLE IF NOT EXISTS goods_compatibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goods_id_1 UUID REFERENCES goods_master(id) ON DELETE CASCADE,
    goods_id_2 UUID REFERENCES goods_master(id) ON DELETE CASCADE,
    is_compatible BOOLEAN DEFAULT true,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_goods_pair UNIQUE(goods_id_1, goods_id_2),
    CONSTRAINT different_goods CHECK (goods_id_1 != goods_id_2)
);

-- 9. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_goods_categories_tenant ON goods_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_goods_categories_parent ON goods_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_goods_master_category ON goods_master(category_id);
CREATE INDEX IF NOT EXISTS idx_goods_master_barcode ON goods_master(barcode);
CREATE INDEX IF NOT EXISTS idx_goods_master_qr_code ON goods_master(qr_code);
CREATE INDEX IF NOT EXISTS idx_goods_aliases_name ON goods_aliases(alias_name);
CREATE INDEX IF NOT EXISTS idx_goods_aliases_goods ON goods_aliases(goods_id);
CREATE INDEX IF NOT EXISTS idx_goods_documents_goods ON goods_documents(goods_id);
CREATE INDEX IF NOT EXISTS idx_goods_attributes_goods ON goods_attributes(goods_id);
CREATE INDEX IF NOT EXISTS idx_goods_pricing_tenant ON goods_pricing_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_goods_pricing_category ON goods_pricing_rules(category_id);

-- 10. Add RLS policies for new tables
ALTER TABLE goods_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_compatibility ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goods_categories
CREATE POLICY goods_categories_tenant_isolation ON goods_categories
    FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- RLS Policies for packaging_types
CREATE POLICY packaging_types_tenant_isolation ON packaging_types
    FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- RLS Policies for goods_documents
CREATE POLICY goods_documents_tenant_isolation ON goods_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM goods_master gm 
            WHERE gm.id = goods_documents.goods_id 
            AND gm.company_id = current_setting('app.current_tenant')::uuid
        )
    );

-- RLS Policies for goods_aliases
CREATE POLICY goods_aliases_tenant_isolation ON goods_aliases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM goods_master gm 
            WHERE gm.id = goods_aliases.goods_id 
            AND gm.company_id = current_setting('app.current_tenant')::uuid
        )
    );

-- RLS Policies for goods_attributes
CREATE POLICY goods_attributes_tenant_isolation ON goods_attributes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM goods_master gm 
            WHERE gm.id = goods_attributes.goods_id 
            AND gm.company_id = current_setting('app.current_tenant')::uuid
        )
    );

-- RLS Policies for goods_pricing_rules
CREATE POLICY goods_pricing_rules_tenant_isolation ON goods_pricing_rules
    FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- RLS Policies for goods_compatibility
CREATE POLICY goods_compatibility_tenant_isolation ON goods_compatibility
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM goods_master gm 
            WHERE (gm.id = goods_compatibility.goods_id_1 OR gm.id = goods_compatibility.goods_id_2)
            AND gm.company_id = current_setting('app.current_tenant')::uuid
        )
    );

-- 11. Create update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_goods_categories_updated_at BEFORE UPDATE ON goods_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packaging_types_updated_at BEFORE UPDATE ON packaging_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goods_master_updated_at BEFORE UPDATE ON goods_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();