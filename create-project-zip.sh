#!/bin/bash

# Expense Manager Full-Stack Project Creator
# This script creates the complete project structure with all files

echo "🚀 Creating Expense Manager Full-Stack Application..."

# Create main project directory
PROJECT_NAME="expense-manager-fullstack"
mkdir -p $PROJECT_NAME
cd $PROJECT_NAME

echo "📁 Creating project structure..."

# Create backend structure
mkdir -p backend/{src/{controllers,models,routes,middleware,config,utils,services,database},uploads/receipts,scripts,tests}

# Create frontend structure  
mkdir -p frontend/{public,src/{components/{common,layouts,auth,admin,manager,employee},pages/{auth,admin,manager,employee,shared},context,services,utils,styles}}

echo "✅ Project structure created!"
echo "📋 Next steps:"
echo "1. Copy all the provided files into their respective directories"
echo "2. Run the setup commands from the guide"
echo "3. Install dependencies and start the applications"

# Create a file list for reference
cat > FILE_STRUCTURE.md << 'EOF'
# 📁 Complete File Structure

## Backend Files (backend/)
```
backend/
├── package.json
├── .env
├── .env.example
├── .gitignore
├── server.js
├── README.md
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── config.json
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── adminController.js
│   │   ├── managerController.js
│   │   └── employeeController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── validation.js
│   ├── models/
│   │   ├── index.js
│   │   ├── Company.js
│   │   ├── User.js
│   │   ├── Expense.js
│   │   ├── ExpenseCategory.js
│   │   ├── ApprovalWorkflow.js
│   │   ├── ApprovalWorkflowStep.js
│   │   ├── ApprovalRule.js
│   │   ├── ApprovalStep.js
│   │   ├── ApprovalHistory.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── admin.js
│   │   ├── manager.js
│   │   ├── employee.js
│   │   └── common.js
│   ├── services/
│   │   ├── currencyService.js
│   │   ├── countryService.js
│   │   └── approvalWorkflowService.js
│   ├── utils/
│   │   ├── constants.js
│   │   └── helpers.js
│   └── database/
│       └── init.sql
├── scripts/
│   └── setup.js
└── uploads/
    └── receipts/
        └── .gitkeep
```

## Frontend Files (frontend/)
```
frontend/
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── favicon.ico
└── src/
    ├── index.js
    ├── App.js
    ├── styles/
    │   └── index.css
    ├── context/
    │   ├── AuthContext.js
    │   └── AppContext.js
    ├── services/
    │   └── api.js
    ├── components/
    │   ├── common/
    │   │   └── LoadingSpinner.js
    │   └── layouts/
    │       ├── AuthLayout.js
    │       └── DashboardLayout.js
    └── pages/
        ├── auth/
        │   ├── SignIn.js
        │   └── SignUp.js
        ├── admin/
        │   ├── AdminDashboard.js
        │   ├── UserManagement.js
        │   ├── CategoryManagement.js
        │   ├── WorkflowManagement.js
        │   ├── CompanySettings.js
        │   └── AdminReports.js
        ├── manager/
        │   ├── ManagerDashboard.js
        │   ├── PendingApprovals.js
        │   ├── ApprovalHistory.js
        │   └── TeamManagement.js
        ├── employee/
        │   ├── EmployeeDashboard.js
        │   ├── ExpenseSubmission.js
        │   ├── ExpenseHistory.js
        │   └── ExpenseDetails.js
        └── shared/
            ├── Profile.js
            └── NotFound.js
```
EOF

echo "📄 File structure guide created: FILE_STRUCTURE.md"
echo ""
echo "🎯 To complete the setup:"
echo "1. Copy all provided code files into the corresponding directories"
echo "2. Follow the DEPLOYMENT_GUIDE.md for production deployment"
echo "3. Use COMPLETE_SETUP_GUIDE.md for local development"

cd ..
echo "✅ Project '$PROJECT_NAME' created successfully!"