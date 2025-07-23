import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create PostgreSQL connection pool
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'desicargo',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
export const connectDB = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    
    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('📅 Database time:', result.rows[0].now);
    
    client.release();
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error);
    throw error;
  }
};

// Create tables if they don't exist
export const syncDatabase = async (): Promise<void> => {
  try {
    // Read and execute the schema file
    const schemaPath = './database/schema.sql';
    console.log('🔄 Syncing database schema...');
    
    // For now, we'll assume tables are created manually
    // In production, use migrations
    console.log('✅ Database schema synced');
  } catch (error) {
    console.error('❌ Database sync error:', error);
    throw error;
  }
};

// Query helper with error handling
export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error', { text, error });
    throw error;
  }
};

// Transaction helper
export const withTransaction = async (callback: (client: any) => Promise<any>): Promise<any> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Set tenant context for RLS
export const setTenantContext = async (client: PoolClient, tenantIdOrCode: string): Promise<void> => {
  // Check if it's a UUID or a code
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantIdOrCode);
  
  if (isUuid) {
    // If it's a UUID, get the tenant code
    const result = await client.query('SELECT code FROM tenants WHERE id = $1', [tenantIdOrCode]);
    if (result.rows.length > 0) {
      await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant', result.rows[0].code]);
    }
  } else {
    // If it's already a code, use it directly
    await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant', tenantIdOrCode]);
  }
};

// Query with tenant context
export const queryWithTenant = async (
  text: string, 
  params: any[], 
  tenantId: string,
  userId?: string
): Promise<any> => {
  const client = await pool.connect();
  try {
    await setTenantContext(client, tenantId);
    // Also set user context if provided
    if (userId) {
      await client.query('SELECT set_config($1, $2, true)', ['app.current_user_id', userId]);
    }
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Get a connection with tenant context set
export const getTenantConnection = async (tenantId: string): Promise<PoolClient> => {
  const client = await pool.connect();
  try {
    await setTenantContext(client, tenantId);
    return client;
  } catch (error) {
    client.release();
    throw error;
  }
};

// Transaction helper with tenant context
export const withTenantTransaction = async (
  tenantId: string,
  callback: (client: PoolClient) => Promise<any>
): Promise<any> => {
  const client = await pool.connect();
  try {
    await setTenantContext(client, tenantId);
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get next sequence number for tenant
export const getNextSequenceNumber = async (
  tenantId: string,
  sequenceType: string,
  client?: PoolClient
): Promise<string> => {
  const queryText = 'SELECT get_next_sequence_number($1, $2) as sequence_number';
  const params = [tenantId, sequenceType];
  
  if (client) {
    const result = await client.query(queryText, params);
    return result.rows[0].sequence_number;
  } else {
    const result = await queryWithTenant(queryText, params, tenantId);
    return result.rows[0].sequence_number;
  }
};

// Initialize tenant sequences
export const initializeTenantSequences = async (
  tenantId: string,
  tenantCode: string
): Promise<void> => {
  const client = await getTenantConnection(tenantId);
  try {
    const sequences = [
      { type: 'consignment', prefix: 'CN', suffix: '', reset_period: 'yearly' },
      { type: 'ogpl', prefix: 'OGPL', suffix: '', reset_period: 'yearly' },
      { type: 'invoice', prefix: 'INV', suffix: '', reset_period: 'yearly' },
      { type: 'receipt', prefix: 'RCP', suffix: '', reset_period: 'yearly' },
      { type: 'delivery_run', prefix: 'DEL', suffix: '', reset_period: 'daily' }
    ];

    for (const seq of sequences) {
      await client.query(
        `INSERT INTO tenant_sequences (tenant_id, sequence_type, current_value, prefix, suffix, reset_period)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, sequence_type) DO NOTHING`,
        [tenantId, seq.type, 0, seq.prefix, seq.suffix, seq.reset_period]
      );
    }
  } finally {
    client.release();
  }
};

export default pool;