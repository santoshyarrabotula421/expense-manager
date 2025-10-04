# 🚀 **Production Deployment Guide**

## 📋 **Deployment Options**

### **Option 1: Traditional VPS/Server Deployment**
### **Option 2: Cloud Platform Deployment (Heroku, AWS, DigitalOcean)**
### **Option 3: Docker Deployment**

---

## 🖥️ **Option 1: Traditional VPS/Server Deployment**

### **Prerequisites:**
- Ubuntu 20.04+ server
- Domain name (optional)
- SSL certificate (Let's Encrypt)

### **Step 1: Server Setup**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Install Nginx
sudo apt install nginx -y

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Git
sudo apt install git -y
```

### **Step 2: Database Setup**

```bash
# Login to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE expense_manager;
CREATE USER 'expense_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON expense_manager.* TO 'expense_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### **Step 3: Deploy Backend**

```bash
# Create application directory
sudo mkdir -p /var/www/expense-manager
sudo chown $USER:$USER /var/www/expense-manager

# Clone or upload your project
cd /var/www/expense-manager
# Upload your backend files here

# Install dependencies
cd backend
npm install --production

# Create production environment file
cp .env.example .env.production

# Edit production environment
nano .env.production
```

**Production .env file:**
```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com

DB_HOST=localhost
DB_PORT=3306
DB_NAME=expense_manager
DB_USER=expense_user
DB_PASSWORD=your_secure_password

JWT_SECRET=your-super-secure-jwt-secret-for-production-min-32-chars
JWT_EXPIRES_IN=24h

CURRENCY_API_KEY=your-api-key
CURRENCY_API_URL=https://api.exchangerate-api.com/v4/latest

MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
```

```bash
# Run database setup
npm run setup

# Start with PM2
pm2 start server.js --name "expense-backend" --env production
pm2 startup
pm2 save
```

### **Step 4: Deploy Frontend**

```bash
# Go to frontend directory
cd /var/www/expense-manager/frontend

# Install dependencies
npm install

# Create production build
REACT_APP_API_URL=https://yourdomain.com/api npm run build

# Move build to web root
sudo cp -r build/* /var/www/html/
```

### **Step 5: Configure Nginx**

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/expense-manager
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (after getting certificates)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend (React build)
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # File uploads
    location /uploads {
        alias /var/www/expense-manager/backend/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/expense-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### **Step 6: SSL Certificate (Let's Encrypt)**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## ☁️ **Option 2: Cloud Platform Deployment**

### **A. Heroku Deployment**

#### **Backend Deployment:**

1. **Prepare backend for Heroku:**
```json
// Add to backend/package.json
{
  "scripts": {
    "start": "node server.js",
    "heroku-postbuild": "npm run setup"
  },
  "engines": {
    "node": "18.x"
  }
}
```

2. **Create Procfile:**
```bash
# backend/Procfile
web: node server.js
```

3. **Deploy to Heroku:**
```bash
# Install Heroku CLI
# Create Heroku app
heroku create expense-manager-backend

# Add MySQL addon
heroku addons:create jawsdb:kitefin

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secure-jwt-secret
heroku config:set FRONTEND_URL=https://your-frontend-url.netlify.app

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

#### **Frontend Deployment (Netlify):**

1. **Build configuration:**
```bash
# Create netlify.toml in frontend/
[build]
  publish = "build"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  REACT_APP_API_URL = "https://your-backend-app.herokuapp.com/api"
```

2. **Deploy to Netlify:**
- Connect GitHub repository
- Set build command: `npm run build`
- Set publish directory: `build`
- Deploy

### **B. AWS Deployment**

#### **Backend (AWS EC2 + RDS):**

1. **Create RDS MySQL instance**
2. **Launch EC2 instance**
3. **Follow VPS deployment steps above**

#### **Frontend (AWS S3 + CloudFront):**

1. **Build and upload to S3:**
```bash
npm run build
aws s3 sync build/ s3://your-bucket-name --delete
```

2. **Configure CloudFront distribution**

---

## 🐳 **Option 3: Docker Deployment**

### **Create Docker Files**

#### **Backend Dockerfile:**
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

#### **Frontend Dockerfile:**
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### **Docker Compose:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: expense_manager
      MYSQL_USER: expense_user
      MYSQL_PASSWORD: userpassword
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_USER=expense_user
      - DB_PASSWORD=userpassword
      - DB_NAME=expense_manager
    depends_on:
      - mysql
    volumes:
      - ./backend/uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mysql_data:
```

#### **Deploy with Docker:**
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 🔧 **Production Optimizations**

### **Backend Optimizations:**

1. **Environment Variables:**
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=minimum-32-character-secure-secret
DB_CONNECTION_POOL_MIN=2
DB_CONNECTION_POOL_MAX=10
```

2. **PM2 Configuration:**
```json
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'expense-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

### **Frontend Optimizations:**

1. **Build optimizations:**
```json
// package.json
{
  "scripts": {
    "build": "GENERATE_SOURCEMAP=false react-scripts build"
  }
}
```

2. **Nginx optimizations:**
```nginx
# Enable gzip
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

# Enable caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## 📊 **Monitoring & Maintenance**

### **Monitoring Tools:**

1. **PM2 Monitoring:**
```bash
pm2 monit
pm2 logs
pm2 status
```

2. **System Monitoring:**
```bash
# Install htop
sudo apt install htop

# Monitor system resources
htop

# Check disk space
df -h

# Check memory usage
free -m
```

### **Backup Strategy:**

1. **Database Backup:**
```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u expense_user -p expense_manager > /backups/expense_manager_$DATE.sql

# Add to crontab for daily backups
0 2 * * * /path/to/backup-script.sh
```

2. **File Backup:**
```bash
# Backup uploads directory
tar -czf /backups/uploads_$(date +%Y%m%d).tar.gz /var/www/expense-manager/backend/uploads/
```

---

## 🔒 **Security Checklist**

- [ ] SSL certificate installed and configured
- [ ] Database user has minimal required permissions
- [ ] JWT secret is secure (32+ characters)
- [ ] File upload directory has proper permissions
- [ ] Nginx security headers configured
- [ ] Firewall configured (UFW)
- [ ] Regular security updates scheduled
- [ ] Database backups automated
- [ ] Application logs monitored
- [ ] Rate limiting enabled

---

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **Backend won't start:**
```bash
# Check logs
pm2 logs expense-backend

# Check database connection
mysql -u expense_user -p expense_manager
```

2. **Frontend build fails:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

3. **Database connection issues:**
```bash
# Check MySQL status
sudo systemctl status mysql

# Check user permissions
mysql -u root -p
SHOW GRANTS FOR 'expense_user'@'localhost';
```

4. **Nginx issues:**
```bash
# Check configuration
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log
```

---

## 📞 **Support & Maintenance**

### **Regular Maintenance Tasks:**

1. **Weekly:**
   - Check application logs
   - Monitor system resources
   - Verify backups

2. **Monthly:**
   - Update dependencies
   - Security patches
   - Performance review

3. **Quarterly:**
   - Full system backup
   - Security audit
   - Performance optimization

---

**Your expense manager application is now ready for production deployment!** 🚀

Choose the deployment option that best fits your needs and follow the corresponding guide. The application is designed to be scalable and production-ready.