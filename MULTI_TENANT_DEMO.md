# 🚛 DesiCargo Multi-Tenant Demo Guide

This guide provides access details for all demo tenants in the DesiCargo SaaS platform, showcasing different types of logistics businesses.

## 🌐 Demo Tenant Access

### Option 1: Subdomain Access (Recommended)
Each tenant has its own subdomain for proper multi-tenant experience:

| Business Type | Subdomain | Company |
|---------------|-----------|---------|
| **Express Courier** | `http://swift.localhost:3000` | Swift Express Logistics |
| **Heavy Freight** | `http://cargomaster.localhost:3000` | Cargo Masters Transport |
| **Last-Mile Delivery** | `http://cityconnect.localhost:3000` | City Connect Deliveries |
| **Default Demo** | `http://default.localhost:3000` | Default Company (K2K Logistics) |

### Option 2: Query Parameter Access
If subdomains don't work in your environment:
- `http://localhost:3000?tenant=swift`
- `http://localhost:3000?tenant=cargomaster` 
- `http://localhost:3000?tenant=cityconnect`
- `http://localhost:3000?tenant=default`

---

## 🔐 Login Credentials

### Swift Express Logistics (`swift.localhost:3000`)
**Business Focus**: Express courier and same-day delivery
- **Admin**: `swift_admin` / `admin123`
- **Manager**: `swift_ops` / `password123`  
- **Operator**: `swift_mumbai` / `password123`

**Company Details**:
- Subscription: Professional Plan
- Branches: Bangalore (HQ), Mumbai, Delhi
- Features: Express delivery, real-time tracking, COD service

### Cargo Masters Transport (`cargomaster.localhost:3000`)
**Business Focus**: Heavy freight and industrial logistics
- **Admin**: `cargo_admin` / `admin123`
- **Manager**: `cargo_fleet` / `password123`
- **Operator**: `cargo_kolkata` / `password123`

**Company Details**:
- Subscription: Enterprise Plan (2-year)
- Branches: Chennai (HQ), Kolkata, Hyderabad
- Features: Heavy freight, bulk transport, fleet tracking

### City Connect Deliveries (`cityconnect.localhost:3000`)
**Business Focus**: Last-mile and hyperlocal delivery
- **Admin**: `city_admin` / `admin123`
- **Manager**: `city_ops` / `password123`
- **Operator**: `city_rider` / `password123`

**Company Details**:
- Subscription: Starter Plan (6 months)
- Branches: Pune (HQ), Pune West Hub
- Features: Last-mile delivery, same-day service, bike delivery

### Default Company (`default.localhost:3000`)
**Business Focus**: General logistics (K2K Logistics)
- **SuperAdmin**: `superadmin` / `superadmin123` (Access to all tenants + SuperAdmin portal)
- **Admin**: `admin` / `admin123`
- **Manager**: `delhi_mgr` / `password123`
- **Manager**: `blr_manager` / `password123`
- **Operator**: `blr_operator` / `password123`

---

## 🛡️ SuperAdmin Portal Access

**URL**: `http://admin.localhost:3000`
**Credentials**: `superadmin` / `superadmin123`

**Features**:
- ✅ Platform analytics dashboard
- ✅ Tenant management (view, edit, deactivate)
- ✅ User management across all tenants
- ✅ Activity logs and monitoring
- ✅ Subscription management
- ✅ Tenant impersonation (upcoming)

---

## 🏗️ Architecture Features Implemented

### ✅ Phase 1 Complete: Database Schema
- [x] Fixed missing company columns (trial_ends_at, subscription_ends_at, onboarding_completed, onboarding_steps)
- [x] Created 5 demo tenants with different business types
- [x] Implemented Row-Level Security (RLS) for complete tenant isolation
- [x] Added tenant-specific user management

### 🔒 Security & Isolation
- **Row-Level Security**: Each tenant can only access their own data
- **SuperAdmin Override**: SuperAdmin users can access all tenant data
- **JWT-based Authentication**: Secure token-based access control
- **Tenant Context**: All database queries are scoped to the current tenant

### 📊 Business Variety
- **Swift**: Professional courier service (mid-market)
- **CargoMaster**: Enterprise freight company (large-scale)
- **CityConnect**: Startup delivery service (small business)
- **Default**: Established logistics company (reference implementation)

---

## 🧪 Testing Multi-Tenancy

### 1. Tenant Isolation Test
1. Login to `swift.localhost:3000` as `swift_admin`
2. Try to access `cargomaster.localhost:3000` - should require separate login
3. Verify data doesn't leak between tenants

### 2. SuperAdmin Access Test
1. Login to `admin.localhost:3000` as `superadmin`
2. Access tenant management dashboard
3. View analytics across all tenants
4. Switch between tenant views

### 3. Subscription Plans Test
- **Starter** (CityConnect): Basic features, 6-month trial
- **Professional** (Swift): Advanced features, 1-year subscription  
- **Enterprise** (CargoMaster): Full features, 2-year subscription

---

## 🚀 Next Development Phases

### Phase 2: Tenant Registration & Onboarding
- [ ] Build tenant registration flow from SuperAdmin
- [ ] Automated tenant provisioning system
- [ ] Tenant-specific subdomain DNS handling

### Phase 3: Enhanced Features
- [ ] Tenant-specific branding (logos, colors)
- [ ] Usage tracking and billing
- [ ] Tenant impersonation for support

### Phase 4: Production Readiness
- [ ] Subdomain routing configuration
- [ ] Performance optimization per tenant
- [ ] Backup and migration tools

---

## 💡 Demo Scenarios

### Scenario 1: Express Courier (Swift)
- Focus on speed and tracking
- High-frequency, low-weight shipments
- Customer notifications and delivery updates

### Scenario 2: Heavy Freight (CargoMaster)
- Industrial equipment transport
- Multi-modal logistics (road + rail)
- Fleet management and route optimization

### Scenario 3: Last-Mile Delivery (CityConnect)
- E-commerce fulfillment
- Hyperlocal delivery in urban areas
- Bike and foot delivery options

---

## 🔧 Development Notes

### Database Structure
- All tables now have proper tenant isolation via RLS
- Foreign key relationships maintain referential integrity
- Indexes optimized for tenant-specific queries

### Backend Changes
- Tenant middleware enhanced with RLS session variables
- SuperAdmin controllers bypass tenant restrictions
- Authentication flow supports multi-tenant JWT tokens

### Frontend Architecture
- Subdomain-based tenant detection
- Tenant-specific branding support (ready for customization)
- SuperAdmin portal for platform management

---

**Ready to explore multi-tenant logistics management! 🚛📦**