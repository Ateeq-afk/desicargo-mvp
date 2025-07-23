-- Fix customer analytics trigger to use customer ID instead of phone
-- This ensures proper tracking when customer has consignor_id linked

-- Drop existing trigger
DROP TRIGGER IF EXISTS update_customer_analytics_trigger ON consignments;

-- Create improved trigger function
CREATE OR REPLACE FUNCTION update_customer_analytics() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update consignor analytics using consignor_id first, fallback to phone
    IF NEW.consignor_id IS NOT NULL THEN
      UPDATE customers
      SET
        total_bookings = total_bookings + 1,
        total_business_value = total_business_value + NEW.freight_amount,
        last_booking_date = NEW.booking_date
      WHERE id = NEW.consignor_id AND tenant_id = NEW.tenant_id;
    ELSE
      -- Fallback to phone-based update
      UPDATE customers
      SET
        total_bookings = total_bookings + 1,
        total_business_value = total_business_value + NEW.freight_amount,
        last_booking_date = NEW.booking_date
      WHERE phone = NEW.consignor_phone AND tenant_id = NEW.tenant_id;
    END IF;

    -- Update consignee analytics if different phone
    IF NEW.consignee_phone != NEW.consignor_phone THEN
      UPDATE customers
      SET
        total_bookings = total_bookings + 1,
        total_business_value = total_business_value + NEW.freight_amount,
        last_booking_date = NEW.booking_date
      WHERE phone = NEW.consignee_phone AND tenant_id = NEW.tenant_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER update_customer_analytics_trigger
AFTER INSERT ON consignments
FOR EACH ROW
EXECUTE FUNCTION update_customer_analytics();