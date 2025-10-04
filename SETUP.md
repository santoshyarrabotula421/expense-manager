# Quick Setup Guide

## Prerequisites
- Node.js (v16+)
- MySQL (v8.0+)
- npm or yarn

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   - Update `.env` with your MySQL credentials
   - Set a strong JWT secret

3. **Setup database**
   ```bash
   npm run migrate
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Verify setup**
   ```bash
   node scripts/verify-setup.js
   ```

## Test the API

### Health Check
```bash
curl http://localhost:3000/health
```

### Register a Company
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company",
    "admin_name": "Admin User",
    "email": "admin@test.com",
    "password": "TestPass123",
    "confirm_password": "TestPass123",
    "country": "United States"
  }'
```

### Sign In
```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "TestPass123",
    "role": "admin"
  }'
```

## Key Features Implemented

✅ **Multi-role Authentication** (Admin, Manager, Employee)  
✅ **Company Management** (Registration, user creation)  
✅ **Expense Management** (CRUD operations, status tracking)  
✅ **Approval Workflow** (Sequential approvers, threshold-based auto-approval)  
✅ **Currency Support** (Multi-currency with conversion)  
✅ **File Uploads** (Secure attachment handling)  
✅ **Comprehensive API** (RESTful endpoints for all operations)  
✅ **Security** (JWT auth, input validation, rate limiting)  
✅ **Database Schema** (Optimized MySQL structure)  
✅ **Documentation** (Complete API docs and setup guide)  

## Next Steps

1. Configure your MySQL database
2. Run the migration script
3. Start building your frontend
4. Customize approval workflows
5. Add additional business logic as needed

For detailed API documentation, see [README.md](README.md).