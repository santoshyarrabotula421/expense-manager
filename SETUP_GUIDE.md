# 📥 Complete Setup Guide for Expense Manager Backend

## 🎯 Quick Setup Instructions

### 1. Create Project Structure
```bash
mkdir expense-manager-backend
cd expense-manager-backend

# Create all directories
mkdir -p src/{controllers,models,routes,middleware,config,utils,services}
mkdir -p src/database
mkdir -p uploads/receipts
mkdir -p scripts
mkdir -p tests
```

### 2. Create Core Files

#### package.json
```json
{
  "name": "expense-manager-backend",
  "version": "1.0.0",
  "description": "Backend services for expense-manager application",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "setup": "node scripts/setup.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.0",
    "sequelize": "^6.32.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express-validator": "^7.0.1",
    "multer": "^1.4.5-lts.1",
    "axios": "^1.5.0",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.10.0",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

#### .env
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

DB_HOST=localhost
DB_PORT=3306
DB_NAME=expense_manager
DB_USER=root
DB_PASSWORD=Santosh421@

JWT_SECRET=exp-mgr-2024-secure-jwt-key-santosh-expense-manager-app-v1-production-ready
JWT_EXPIRES_IN=24h

CURRENCY_API_KEY=
CURRENCY_API_URL=https://api.exchangerate-api.com/v4/latest

MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup
Create database in MySQL:
```sql
CREATE DATABASE expense_manager;
```

### 5. Run Setup
```bash
npm run setup
```

### 6. Start Server
```bash
npm run dev
```

## 📁 Complete File List

You need to create these files with the content from our conversation:

### Root Files:
- `package.json` ✅ (above)
- `.env` ✅ (above)  
- `.gitignore`
- `server.js`
- `README.md`

### src/config/:
- `database.js`
- `config.json`

### src/models/:
- `index.js`
- `Company.js`
- `User.js`
- `Expense.js`
- `ExpenseCategory.js`
- `ApprovalWorkflow.js`
- `ApprovalWorkflowStep.js`
- `ApprovalRule.js`
- `ApprovalStep.js`
- `ApprovalHistory.js`
- `Notification.js`

### src/controllers/:
- `authController.js`
- `adminController.js`
- `managerController.js`
- `employeeController.js`

### src/routes/:
- `auth.js`
- `admin.js`
- `manager.js`
- `employee.js`
- `common.js`

### src/middleware/:
- `auth.js`
- `errorHandler.js`
- `validation.js`

### src/services/:
- `currencyService.js`
- `countryService.js`
- `approvalWorkflowService.js`

### src/utils/:
- `constants.js`
- `helpers.js`

### src/database/:
- `init.sql`

### scripts/:
- `setup.js`

## 🚀 Alternative: Use Git Repository

If you want to download everything at once, I can help you create a Git repository or provide a zip file structure.

## 📞 Need Help?

If you need the complete content of any specific file, just ask and I'll provide it!