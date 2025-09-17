# Wattmon MQTT API Server - Deployment Guide

## 🚀 Deploy to Render.com

### 1. Prepare Your Repository
```bash
# Create a new repository with these files:
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Render.com Deployment Steps

1. **Connect to Render.com**
   - Go to [render.com](https://render.com)
   - Sign in with your GitHub account
   - Click "New +" → "Web Service"

2. **Repository Setup**
   - Connect your GitHub repository
   - Choose your repository with the MQTT API code

3. **Configuration**
   - **Name**: `wattmon-mqtt-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Environment Variables**
   Add these in Render.com dashboard:
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://msuhailcmd_db_user:aeQL1cO3KkPSm8e5@cluster0.lzze9wb.mongodb.net/wattmon_db
   PORT=10000
   MQTT_PORT=1883
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete

### 3. Your API Endpoints

After deployment, your endpoints will be:
- **Base URL**: `https://your-app-name.onrender.com`
- **Health Check**: `https://your-app-name.onrender.com/api/health`
- **Data Receive**: `https://your-app-name.onrender.com/api/data/receive` (POST)
- **MQTT Port**: Uses the same URL but port 1883 for MQTT

### 4. Wattmon Device Configuration

Configure your Wattmon device with:
- **MQTT Server**: `your-app-name.onrender.com`
- **MQTT Port**: `1883`
- **Use TLS**: `Disabled`
- **Username**: (leave blank)
- **Password**: (leave blank)
- **Protocol**: `MQTT 3.1.1`
- **QoS**: `0`

### 5. Testing

Test your API:
```bash
# Health check
curl https://mock-server-git-main-suhails-projects-300833e1.vercel.app/api/health

# Send test data via HTTP
curl -X POST https://your-app-name.onrender.com/api/data/receive \
  -H "Content-Type: application/json" \
  -d '{
    "mac": "00:11:22:33:44:55",
    "data": [
      {
        "ts": 1726486800,
        "power": 1500,
        "voltage": 240,
        "current": 6.25
      }
    ]
  }'
```

### 6. Monitoring Logs

- Check Render.com dashboard → Your service → Logs
- Data is stored in MongoDB and local JSON files
- MQTT messages are logged in real-time

### 7. Important Notes

- **Free Tier Limitations**: Render.com free tier may spin down after inactivity
- **MQTT Port**: Render.com automatically assigns ports, MQTT will work on the same domain
- **Database**: MongoDB Atlas connection is included
- **Logs**: Available in Render dashboard and saved to files
- **CORS**: Enabled for all origins

## 📋 File Structure

```
wattmon-mqtt-api/
├── app.js                 # Main application
├── package.json           # Dependencies
├── .env                   # Environment variables
├── routes/
│   └── dataRoutes.js     # API routes
├── controllers/
│   └── dataController.js # Business logic
└── logs/                 # Generated log files
    ├── mqtt-logs-*.json
    └── data/
        └── data-*.json
```

## 🔧 Features

- ✅ MQTT Broker (Aedes)
- ✅ HTTP API Endpoints
- ✅ MongoDB Integration
- ✅ File Logging (JSON)
- ✅ CORS Support
- ✅ Health Check
- ✅ Error Handling
- ✅ Real-time Data Processing