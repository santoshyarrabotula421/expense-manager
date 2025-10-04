# Expense Manager Backend

A comprehensive expense management system backend with multi-level approval workflows, built with Node.js, Express, and MySQL.

## Features

- **Multi-role Authentication**: Admin, Manager, and Employee roles with JWT-based authentication
- **Company Management**: Multi-tenant architecture supporting multiple companies
- **Expense Management**: Create, edit, submit, and track expenses with receipt uploads
- **Approval Workflows**: Configurable multi-step approval processes with conditional logic
- **Currency Support**: Multi-currency support with automatic conversion
- **Notifications**: Real-time notifications for approval requests and status updates
- **Reporting**: Comprehensive expense reports and analytics
- **File Uploads**: Receipt attachment support with validation

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Morgan

## Database Schema

The system uses a comprehensive database schema with the following main entities:

- **Companies**: Multi-tenant company information
- **Users**: Unified user table for admins, managers, and employees
- **Expenses**: Expense records with approval workflow integration
- **Approval Workflows**: Configurable approval process templates
- **Approval Steps**: Individual approval instances
- **Expense Categories**: Categorization of expenses
- **Notifications**: User notification system

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Company registration (creates admin)
- `POST /api/auth/signin` - User sign in
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout

### Admin Routes (`/api/admin`)
- `GET /dashboard` - Admin dashboard with statistics
- `GET /users` - List all users in company
- `POST /users` - Create new user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Deactivate user
- `GET /expense-categories` - Get expense categories
- `POST /expense-categories` - Create expense category
- `PUT /expense-categories/:id` - Update expense category
- `GET /approval-workflows` - Get approval workflows
- `POST /approval-workflows` - Create approval workflow
- `GET /company-settings` - Get company settings
- `PUT /company-settings` - Update company settings
- `GET /reports/expenses` - Get expense reports

### Manager Routes (`/api/manager`)
- `GET /dashboard` - Manager dashboard
- `GET /approvals/pending` - Get pending approvals
- `GET /approvals/:id` - Get approval details
- `POST /approvals/:id/process` - Process approval (approve/reject)
- `GET /approvals/history` - Get approval history
- `GET /team/members` - Get team members
- `GET /team/expenses` - Get team expenses
- `GET /stats` - Get manager statistics

### Employee Routes (`/api/employee`)
- `GET /dashboard` - Employee dashboard
- `GET /expenses` - Get user's expenses
- `GET /expenses/:id` - Get expense details
- `POST /expenses` - Create new expense
- `PUT /expenses/:id` - Update expense
- `DELETE /expenses/:id` - Delete expense
- `POST /expenses/:id/submit` - Submit expense for approval
- `GET /expense-categories` - Get expense categories
- `GET /currencies` - Get supported currencies
- `GET /notifications` - Get notifications
- `PUT /notifications/:id/read` - Mark notification as read
- `PUT /notifications/read-all` - Mark all notifications as read

### Common Routes (`/api/common`)
- `GET /countries` - Get countries list
- `GET /countries/:code` - Get country by code
- `GET /currencies` - Get supported currencies
- `GET /currencies/rates/:base?` - Get exchange rates
- `POST /currencies/convert` - Convert currency
- `GET /timezones` - Get timezones
- `GET /health` - Health check
- `GET /constants` - Get application constants

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

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=3000
   
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=expense_manager
   DB_USER=root
   DB_PASSWORD=your_password
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=24h
   
   # Currency API (optional)
   CURRENCY_API_KEY=your-currency-api-key
   ```

4. **Set up the database**
   
   Create MySQL database:
   ```sql
   CREATE DATABASE expense_manager;
   ```
   
   Run the provided SQL schema to create tables with triggers and constraints.

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## Database Setup

Execute the provided SQL schema file to create all necessary tables, triggers, and constraints. The schema includes:

- All table definitions with proper relationships
- Triggers for automatic status updates
- Indexes for optimal performance
- Foreign key constraints for data integrity

## Configuration

### Environment Variables

- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)
- `DB_HOST`: Database host
- `DB_PORT`: Database port
- `DB_NAME`: Database name
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRES_IN`: JWT expiration time
- `CURRENCY_API_KEY`: Currency conversion API key (optional)
- `MAX_FILE_SIZE`: Maximum file upload size (default: 5MB)
- `ALLOWED_FILE_TYPES`: Allowed file types for uploads

### File Uploads

Receipt files are stored in the `uploads/receipts/` directory. Supported file types:
- Images: JPEG, PNG, GIF
- Documents: PDF

## Security Features

- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- Rate limiting
- CORS protection
- Helmet security headers
- Password hashing with bcrypt
- File upload validation

## Approval Workflow System

The system supports sophisticated approval workflows with:

- **Multi-step Approvals**: Configure sequential approval steps
- **Conditional Logic**: Rules based on amount, category, department
- **Auto-approval**: Automatic approval below thresholds
- **Escalation**: Automatic escalation of overdue approvals
- **Flexible Approvers**: Support for specific users, roles, managers, department heads

### Workflow Configuration

Workflows can be configured with:
- Step-by-step approval process
- Amount-based conditions
- Category-based routing
- Auto-approval thresholds
- Escalation rules

## Currency Support

- Multi-currency expense submission
- Automatic currency conversion
- Real-time exchange rates (via external API)
- Company default currency setting
- Fallback rates when API is unavailable

## Notifications

The system provides comprehensive notifications for:
- New approval requests
- Approval/rejection decisions
- Escalated approvals
- Overdue reminders

## Error Handling

Comprehensive error handling with:
- Structured error responses
- Input validation errors
- Database constraint errors
- Authentication/authorization errors
- File upload errors

## Development

### Project Structure
```
src/
├── config/          # Database and app configuration
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Sequelize models
├── routes/          # API routes
├── services/        # Business logic services
└── utils/           # Utility functions and constants
```

### Adding New Features

1. Create models in `src/models/`
2. Add controllers in `src/controllers/`
3. Define routes in `src/routes/`
4. Add middleware if needed
5. Update validation rules
6. Add tests

## Testing

```bash
npm test
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use environment variables for all configuration
3. Set up proper database with connection pooling
4. Configure reverse proxy (nginx)
5. Set up SSL/TLS certificates
6. Configure monitoring and logging
7. Set up automated backups

## API Documentation

The API follows RESTful conventions with:
- Consistent response formats
- Proper HTTP status codes
- Comprehensive error messages
- Input validation
- Pagination for list endpoints

### Response Format

```json
{
  "message": "Success message",
  "data": {},
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

### Error Format

```json
{
  "error": "Error message",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "value": "invalid-email"
    }
  ]
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License.