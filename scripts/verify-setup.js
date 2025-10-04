#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Expense Manager Backend Setup...\n');

// Check if all required files exist
const requiredFiles = [
  'package.json',
  'server.js',
  '.env',
  'src/config/database.js',
  'src/controllers/authController.js',
  'src/controllers/adminController.js',
  'src/controllers/managerController.js',
  'src/controllers/employeeController.js',
  'src/routes/auth.js',
  'src/routes/admin.js',
  'src/routes/manager.js',
  'src/routes/employee.js',
  'src/routes/expense.js',
  'src/routes/utility.js',
  'src/middleware/auth.js',
  'src/middleware/validation.js',
  'src/middleware/errorHandler.js',
  'src/middleware/upload.js',
  'src/services/currencyService.js',
  'src/services/approvalWorkflowService.js',
  'src/utils/jwt.js',
  'src/utils/password.js',
  'scripts/migrate.js'
];

let allFilesExist = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

// Check if node_modules exists
const nodeModulesExists = fs.existsSync(path.join(__dirname, '..', 'node_modules'));
console.log(`\n📦 Dependencies installed: ${nodeModulesExists ? '✅' : '❌'}`);

// Check package.json scripts
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  console.log('\n📜 Available scripts:');
  Object.keys(packageJson.scripts).forEach(script => {
    console.log(`  ✅ npm run ${script}`);
  });
} catch (error) {
  console.log('❌ Could not read package.json');
}

// Check environment file
try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  const hasDbConfig = envContent.includes('DB_HOST') && envContent.includes('DB_NAME');
  const hasJwtSecret = envContent.includes('JWT_SECRET');
  
  console.log('\n🔧 Environment configuration:');
  console.log(`  ${hasDbConfig ? '✅' : '❌'} Database configuration`);
  console.log(`  ${hasJwtSecret ? '✅' : '❌'} JWT secret`);
} catch (error) {
  console.log('\n❌ Could not read .env file');
}

// Check directory structure
const requiredDirs = [
  'src',
  'src/config',
  'src/controllers',
  'src/middleware',
  'src/models',
  'src/routes',
  'src/services',
  'src/utils',
  'scripts',
  'uploads'
];

console.log('\n📂 Directory structure:');
requiredDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  const exists = fs.existsSync(dirPath);
  console.log(`  ${exists ? '✅' : '❌'} ${dir}/`);
});

// Summary
console.log('\n' + '='.repeat(50));
if (allFilesExist && nodeModulesExists) {
  console.log('🎉 Setup verification completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Configure your MySQL database credentials in .env');
  console.log('2. Run database migration: npm run migrate');
  console.log('3. Start the development server: npm run dev');
  console.log('4. Test the API endpoints using the provided documentation');
} else {
  console.log('⚠️  Setup verification found issues!');
  console.log('Please ensure all required files are present and dependencies are installed.');
}

console.log('\n📖 For detailed setup instructions, see README.md');
console.log('🔗 API Documentation: http://localhost:3000/api/test (after starting server)');
console.log('💡 Health check: http://localhost:3000/health');