#!/bin/bash

# Multi-Tenant Migration Runner for DesiCargo
# This script applies multi-tenant architecture changes to the database

set -e  # Exit on any error

# Configuration
DB_NAME="desicargo"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if database is accessible
check_database() {
    print_status "Checking database connectivity..."
    if ! docker exec desicargo-db psql -U $DB_USER -d $DB_NAME -c '\q' 2>/dev/null; then
        print_error "Cannot connect to database. Please ensure PostgreSQL is running."
        exit 1
    fi
    print_status "Database connection successful."
}

# Function to backup database
backup_database() {
    print_status "Creating database backup..."
    BACKUP_FILE="backup_before_multitenant_$(date +%Y%m%d_%H%M%S).sql"
    docker exec desicargo-db pg_dump -U $DB_USER $DB_NAME > "$BACKUP_FILE"
    print_status "Database backed up to: $BACKUP_FILE"
}

# Function to run a migration file
run_migration() {
    local migration_file=$1
    local migration_name=$2
    
    print_status "Running migration: $migration_name"
    if docker exec -i desicargo-db psql -U $DB_USER -d $DB_NAME < "$migration_file"; then
        print_status "✓ Migration completed: $migration_name"
    else
        print_error "✗ Migration failed: $migration_name"
        return 1
    fi
}

# Function to verify migration
verify_migration() {
    print_status "Verifying multi-tenant migration..."
    
    # Check if tenants table exists
    if docker exec desicargo-db psql -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM tenants;" > /dev/null 2>&1; then
        print_status "✓ Tenants table created successfully"
    else
        print_error "✗ Tenants table not found"
        return 1
    fi
    
    # Check if tenant_id columns exist
    local tables=("companies" "users" "branches" "customers" "consignments")
    for table in "${tables[@]}"; do
        if docker exec desicargo-db psql -U $DB_USER -d $DB_NAME -c "SELECT tenant_id FROM $table LIMIT 1;" > /dev/null 2>&1; then
            print_status "✓ tenant_id column added to $table"
        else
            print_error "✗ tenant_id column missing in $table"
            return 1
        fi
    done
    
    # Check if default tenant exists
    TENANT_COUNT=$(docker exec desicargo-db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM tenants WHERE tenant_code = 'demo';" | xargs)
    if [ "$TENANT_COUNT" -eq "1" ]; then
        print_status "✓ Default tenant created successfully"
    else
        print_error "✗ Default tenant not found"
        return 1
    fi
    
    print_status "Migration verification completed successfully!"
}

# Main execution
main() {
    echo "======================================"
    echo "DesiCargo Multi-Tenant Migration"
    echo "======================================"
    
    # Change to migrations directory
    cd "$(dirname "$0")"
    
    # Check prerequisites
    check_database
    
    # Confirm before proceeding
    read -p "This will modify the database structure. Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Migration cancelled by user."
        exit 0
    fi
    
    # Create backup
    backup_database
    
    # Run migrations in order
    print_status "Starting multi-tenant migration..."
    
    # Step 1: Add multi-tenant support
    if ! run_migration "add_multi_tenant_support.sql" "Multi-Tenant Schema"; then
        print_error "Failed to apply multi-tenant schema. Please check the backup and restore if needed."
        exit 1
    fi
    
    # Step 2: Update seed data with tenant
    if ! run_migration "update_seed_with_tenant.sql" "Seed Data Update"; then
        print_error "Failed to update seed data. Please check the backup and restore if needed."
        exit 1
    fi
    
    # Verify migration
    if ! verify_migration; then
        print_error "Migration verification failed. Please check the database state."
        exit 1
    fi
    
    print_status "======================================"
    print_status "Multi-tenant migration completed successfully!"
    print_status "======================================"
    print_status ""
    print_status "Next steps:"
    print_status "1. Update your application code to include tenant context"
    print_status "2. Test the application with the new multi-tenant structure"
    print_status "3. Update authentication middleware to set tenant context"
    print_status ""
    print_warning "Important: Update your application's database queries to include tenant_id filtering"
    print_warning "or use the RLS policies by setting the current_tenant session variable."
}

# Run main function
main "$@"