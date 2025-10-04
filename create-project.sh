#!/bin/bash

# Expense Manager Backend Setup Script
echo "🚀 Creating Expense Manager Backend Project..."

# Create project directory
mkdir -p expense-manager-backend
cd expense-manager-backend

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p src/{controllers,models,routes,middleware,config,utils,services}
mkdir -p src/database/{migrations,seeders}
mkdir -p uploads/receipts
mkdir -p scripts
mkdir -p tests

# Create placeholder files to maintain directory structure
touch uploads/receipts/.gitkeep
touch tests/.gitkeep

echo "✅ Project structure created!"
echo "📋 Next steps:"
echo "1. Copy all the files from our conversation into their respective folders"
echo "2. Run 'npm install' to install dependencies"
echo "3. Configure your .env file"
echo "4. Run 'npm run setup' to initialize the database"
echo "5. Run 'npm run dev' to start the server"

echo ""
echo "📂 Project structure:"
tree . 2>/dev/null || find . -type d | sed 's/[^-][^\/]*\//  /g;s/^/  /;s/-/|/'