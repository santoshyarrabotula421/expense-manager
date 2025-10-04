# 🚀 Complete Expense Manager Setup Guide

## 📁 Project Structure Overview

```
expense-manager-fullstack/
├── backend/                 # Node.js + Express Backend
└── frontend/                # React Frontend
```

## 🎯 Step-by-Step Setup Instructions

### 1. Create Project Structure
```bash
# Create main project directory
mkdir expense-manager-fullstack
cd expense-manager-fullstack

# Create backend directory
mkdir backend
cd backend

# Create backend structure
mkdir -p src/{controllers,models,routes,middleware,config,utils,services}
mkdir -p src/database
mkdir -p uploads/receipts
mkdir -p scripts
mkdir -p tests

# Go back to root
cd ..

# Create frontend directory
mkdir frontend
cd frontend

# Create frontend structure
mkdir -p src/{components/{common,layouts,auth,admin,manager,employee},pages/{auth,admin,manager,employee,shared},hooks,context,services,utils,styles}
mkdir -p public

# Go back to root
cd ..
```

### 2. Backend Setup

#### Create package.json in backend/
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
    "sequelize-cli": "^6.6.1",
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
    "nodemon": "^3.0.1",
    "jest": "^29.6.2",
    "supertest": "^6.3.3"
  }
}
```

#### Create .env in backend/
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

### 3. Frontend Setup

#### Create package.json in frontend/
```json
{
  "name": "expense-manager-frontend",
  "version": "1.0.0",
  "description": "Frontend for expense manager application",
  "private": true,
  "dependencies": {
    "@headlessui/react": "^1.7.17",
    "@heroicons/react": "^2.0.18",
    "axios": "^1.5.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.45.4",
    "react-hot-toast": "^2.4.1",
    "react-router-dom": "^6.15.0",
    "react-scripts": "5.0.1"
  },
  "devDependencies": {
    "@tailwindcss/forms": "^0.5.6",
    "autoprefixer": "^10.4.15",
    "postcss": "^8.4.29",
    "tailwindcss": "^3.3.3"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "proxy": "http://localhost:3000"
}
```

### 4. Installation Commands

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
npx tailwindcss init -p

# Go back to root
cd ..
```

### 5. Database Setup

```sql
-- Create database in MySQL
CREATE DATABASE expense_manager;
```

### 6. Run the Applications

```bash
# Terminal 1: Start Backend (from backend directory)
cd backend
npm run setup    # First time only - creates demo data
npm run dev      # Starts backend on http://localhost:3000

# Terminal 2: Start Frontend (from frontend directory)
cd frontend
npm start        # Starts frontend on http://localhost:3001
```

## 🔑 Demo Credentials

Once everything is running, you can use these demo credentials:

### Company: Demo Company
- **Admin:** admin@demo.com / admin123
- **Manager:** manager@demo.com / manager123
- **Employee:** employee@demo.com / employee123

## 📋 File Checklist

### Backend Files (in backend/ directory):
- [x] `package.json`
- [x] `.env`
- [x] `server.js`
- [x] `src/config/database.js`
- [x] `src/config/config.json`
- [x] All model files in `src/models/`
- [x] All controller files in `src/controllers/`
- [x] All route files in `src/routes/`
- [x] All middleware files in `src/middleware/`
- [x] All service files in `src/services/`
- [x] `src/database/init.sql`
- [x] `scripts/setup.js`

### Frontend Files (in frontend/ directory):
- [x] `package.json`
- [x] `tailwind.config.js`
- [x] `postcss.config.js`
- [x] `public/index.html`
- [x] `public/manifest.json`
- [x] `src/index.js`
- [x] `src/App.js`
- [x] `src/styles/index.css`
- [x] All context files in `src/context/`
- [x] All service files in `src/services/`
- [x] All component files in `src/components/`
- [x] All page files in `src/pages/`

## 🌐 Application URLs

- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:3000/api
- **Health Check:** http://localhost:3000/health

## 🔧 Troubleshooting

### Common Issues:

1. **Port 3000 already in use:**
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. **Database connection failed:**
   - Check if MySQL is running
   - Verify credentials in `.env`
   - Ensure database exists

3. **Frontend won't start:**
   - Delete `node_modules` and `package-lock.json`
   - Run `npm install` again

4. **CORS errors:**
   - Ensure backend is running on port 3000
   - Check proxy setting in frontend package.json

## 📚 Next Steps

1. **Customize the application:**
   - Add your company branding
   - Modify workflows to match your processes
   - Add additional expense categories

2. **Deploy to production:**
   - Set up proper database hosting
   - Configure environment variables
   - Set up SSL certificates
   - Use a process manager like PM2

3. **Add more features:**
   - Email notifications
   - Mobile app
   - Advanced reporting
   - Integration with accounting systems

## 🆘 Need Help?

If you encounter any issues:
1. Check the console for error messages
2. Verify all files are in the correct locations
3. Ensure all dependencies are installed
4. Check that both frontend and backend are running

The application should now be fully functional with authentication, role-based access, and basic dashboard functionality!