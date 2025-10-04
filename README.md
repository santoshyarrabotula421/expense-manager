# Expense Manager Backend

A comprehensive backend API for expense management system with multi-role authentication and approval workflows.

## Features

- **Multi-role Authentication**: Admin, Manager, and Employee roles with JWT-based authentication
- **Company Management**: Admin can create and manage companies, managers, and employees
- **Expense Management**: Employees can create, submit, and track expense requests
- **Approval Workflow**: Configurable approval workflows with sequential approvers and threshold-based auto-approval
- **Currency Support**: Multi-currency support with automatic conversion
- **File Uploads**: Secure file attachment support for expense receipts
- **Real-time Status Tracking**: Track expense status through the approval pipeline
- **Comprehensive Reporting**: Dashboard analytics and reporting for all user roles

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL with connection pooling
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer with secure file handling
- **Currency Conversion**: External API integration
- **Security**: Helmet, CORS, Rate limiting, Input validation

## Prerequisites

- Node.js (v16.0.0 or higher)
- MySQL (v8.0 or higher)
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd expense-manager-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=expense_manager
   DB_USER=root
   DB_PASSWORD=your_password
   
   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=24h
   
   # External APIs
   CURRENCY_API_KEY=your_currency_api_key
   CURRENCY_API_URL=https://api.exchangerate-api.com/v4/latest
   
   # File Upload Configuration
   MAX_FILE_SIZE=5242880
   UPLOAD_PATH=./uploads
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   
   # CORS Configuration
   CORS_ORIGIN=http://localhost:3001
   ```

4. **Database Setup**
   
   Create MySQL database and run migrations:
   ```bash
   # Run database migration
   npm run migrate
   ```

5. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Company Registration
```http
POST /api/auth/signup
Content-Type: application/json

{
  "company_name": "Acme Corp",
  "admin_name": "John Doe",
  "email": "admin@acme.com",
  "password": "SecurePass123",
  "confirm_password": "SecurePass123",
  "country": "United States"
}
```

#### User Sign In
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "role": "admin|manager|employee",
  "company_name": "Acme Corp" // Required for manager/employee
}
```

#### Get User Profile
```http
GET /api/auth/profile
Authorization: Bearer <jwt_token>
```

### Admin Endpoints

#### Dashboard Statistics
```http
GET /api/admin/dashboard
Authorization: Bearer <admin_jwt_token>
```

#### Manager Management
```http
# Get all managers
GET /api/admin/managers?page=1&limit=10
Authorization: Bearer <admin_jwt_token>

# Create manager
POST /api/admin/managers
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@acme.com",
  "password": "SecurePass123",
  "department": "Finance"
}

# Update manager
PUT /api/admin/managers/:id
Authorization: Bearer <admin_jwt_token>

# Delete manager
DELETE /api/admin/managers/:id
Authorization: Bearer <admin_jwt_token>
```

#### Employee Management
```http
# Get all employees
GET /api/admin/employees?page=1&limit=10&manager_id=1
Authorization: Bearer <admin_jwt_token>

# Create employee
POST /api/admin/employees
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "name": "Bob Johnson",
  "email": "bob@acme.com",
  "password": "SecurePass123",
  "manager_id": 1,
  "department": "Engineering",
  "position": "Software Developer"
}
```

#### Expense Categories
```http
# Get categories
GET /api/admin/expense-categories
Authorization: Bearer <admin_jwt_token>

# Create category
POST /api/admin/expense-categories
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "name": "Travel Expenses",
  "description": "Business travel related expenses"
}
```

### Manager Endpoints

#### Manager Dashboard
```http
GET /api/manager/dashboard
Authorization: Bearer <manager_jwt_token>
```

#### Approval Queue
```http
# Get pending approvals
GET /api/manager/approvals?status=pending&page=1&limit=10
Authorization: Bearer <manager_jwt_token>

# Process approval
POST /api/manager/approvals/:id/process
Authorization: Bearer <manager_jwt_token>
Content-Type: application/json

{
  "action": "approved|rejected",
  "comments": "Approved for business purposes",
  "approved_amount": 150.00 // Optional, defaults to requested amount
}
```

#### Approval History
```http
GET /api/manager/history?page=1&limit=10
Authorization: Bearer <manager_jwt_token>
```

### Employee Endpoints

#### Employee Dashboard
```http
GET /api/employee/dashboard
Authorization: Bearer <employee_jwt_token>
```

#### Expense Management
```http
# Get all expenses
GET /api/employee/expenses?status=pending&page=1&limit=10
Authorization: Bearer <employee_jwt_token>

# Create expense
POST /api/employee/expenses
Authorization: Bearer <employee_jwt_token>
Content-Type: application/json

{
  "title": "Business Lunch",
  "description": "Client meeting at downtown restaurant",
  "amount": 85.50,
  "currency": "USD",
  "category_id": 2,
  "expense_date": "2024-01-15",
  "location": "New York, NY",
  "payment_method": "Credit Card",
  "remarks": "Discussed Q1 objectives",
  "submit_for_approval": true
}

# Get expense by ID
GET /api/employee/expenses/:id
Authorization: Bearer <employee_jwt_token>

# Update expense
PUT /api/employee/expenses/:id
Authorization: Bearer <employee_jwt_token>

# Delete expense
DELETE /api/employee/expenses/:id
Authorization: Bearer <employee_jwt_token>

# Submit draft for approval
POST /api/employee/expenses/:id/submit
Authorization: Bearer <employee_jwt_token>
```

### Utility Endpoints

#### Currency Support
```http
# Get supported currencies
GET /api/utility/currencies
Authorization: Bearer <jwt_token>

# Convert currency
POST /api/utility/currency/convert
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": 100,
  "from_currency": "USD",
  "to_currency": "EUR"
}

# Get exchange rate
GET /api/utility/currency/rate/USD/EUR
Authorization: Bearer <jwt_token>
```

#### Countries List
```http
GET /api/utility/countries
Authorization: Bearer <jwt_token>
```

### Expense Categories and Approval Rules
```http
# Get expense categories
GET /api/expenses/categories
Authorization: Bearer <jwt_token>

# Get approval rules (Admin only)
GET /api/expenses/approval-rules/:employeeId
Authorization: Bearer <admin_jwt_token>

# Set approval rules (Admin only)
POST /api/expenses/approval-rules/:employeeId
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "approvers": [
    {
      "approver_id": 1,
      "approver_type": "manager",
      "sequence_order": 1,
      "threshold_percentage": 80,
      "approval_description": "Review and approve routine expenses",
      "is_chief": false
    },
    {
      "approver_id": 2,
      "approver_type": "chief",
      "sequence_order": 2,
      "threshold_percentage": 0,
      "approval_description": "Final approval for high-value expenses",
      "is_chief": true
    }
  ]
}
```

## Database Schema

### Core Tables

- **admins**: Company administrators
- **managers**: Department managers
- **employees**: Company employees
- **approval_requests**: Expense requests
- **approval_rules**: Approval workflow configuration
- **approval_history**: Approval decision history
- **expense_categories**: Expense categorization
- **currency_rates**: Exchange rate caching
- **audit_logs**: System audit trail

## Error Handling

The API uses consistent error response format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "details": [] // Optional validation details
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `500`: Internal Server Error

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Granular permissions per user role
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: API request throttling
- **CORS Protection**: Cross-origin request security
- **Helmet Security**: HTTP security headers
- **File Upload Security**: Secure file handling with type validation

## Development

### Running Tests
```bash
npm test
```

### Database Migration
```bash
npm run migrate
```

### Seeding Test Data
```bash
npm run seed
```

## Deployment

### Environment Variables for Production

Ensure these environment variables are set in production:

- `NODE_ENV=production`
- `JWT_SECRET`: Strong, unique secret key
- `DB_*`: Production database credentials
- `CURRENCY_API_KEY`: Valid API key for currency conversion
- `CORS_ORIGIN`: Your frontend domain

### Health Check

The API provides a health check endpoint:

```http
GET /health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository.