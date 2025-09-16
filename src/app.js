const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const aedes = require('aedes');
const { createServer } = require('net');
const http = require('http');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

// Import routes
const dataRoutes = require('./routes/dataRoutes');

const app = express();

// Environment variables
const PORT = process.env.PORT || 3000;
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://msuhailcmd_db_user:aeQL1cO3KkPSm8e5@cluster0.lzze9wb.mongodb.net/wattmon_db';

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Create logs directory
const logsDir = path.join(__dirname, 'logs');
fs.ensureDirSync(logsDir);

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  logToFile('INFO', 'Connected to MongoDB successfully');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  logToFile('ERROR', `MongoDB connection failed: ${err.message}`);
});

// MQTT Broker Setup
const broker = aedes();
const mqttServer = createServer(broker.handle);

// Log function
function logToFile(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data: data || undefined
  };
  
  const logFileName = `mqtt-logs-${new Date().toISOString().split('T')[0]}.json`;
  const logFilePath = path.join(logsDir, logFileName);
  
  // Append to log file
  fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + '\n');
  
  // Console log
  const logMessage = `[${timestamp}] ${level}: ${message}`;
  if (level === 'ERROR') {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }
}

// MQTT Event Handlers
broker.on('client', (client) => {
  const clientInfo = `Client connected: ${client.id} from IP: ${client.conn?.remoteAddress || 'unknown'}`;
  console.log(`✅ ${clientInfo}`);
  logToFile('INFO', clientInfo);
});

broker.on('clientDisconnect', (client) => {
  const clientInfo = `Client disconnected: ${client.id}`;
  console.log(`❌ ${clientInfo}`);
  logToFile('INFO', clientInfo);
});

broker.on('publish', async (packet, client) => {
  if (client) {
    const topic = packet.topic;
    const payload = packet.payload.toString();
    
    try {
      // Parse JSON payload
      const jsonData = JSON.parse(payload);
      
      console.log(`\n📩 MQTT Message received:`);
      console.log(`📋 Topic: ${topic}`);
      console.log(`🔗 Client: ${client.id}`);
      console.log(`📊 Data:`, JSON.stringify(jsonData, null, 2));
      
      // Log to file
      logToFile('MQTT_DATA', `Message from ${client.id} on topic ${topic}`, jsonData);
      
      // Store in database (call controller function)
      const dataController = require('./controllers/dataController');
      await dataController.storeMqttData(jsonData, client.id, topic);
      
    } catch (error) {
      console.error('❌ Error processing MQTT message:', error.message);
      logToFile('ERROR', `MQTT message processing failed: ${error.message}`, {
        topic,
        payload,
        clientId: client.id
      });
    }
  }
});

// Start MQTT Server
mqttServer.listen(MQTT_PORT, () => {
  console.log(`🚀 MQTT broker listening on port ${MQTT_PORT}`);
  logToFile('INFO', `MQTT broker started on port ${MQTT_PORT}`);
});

// Handle MQTT server errors
mqttServer.on('error', (error) => {
  console.error('🚨 MQTT Server error:', error.message);
  logToFile('ERROR', `MQTT server error: ${error.message}`);
});

// API Routes
app.use('/api', dataRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Wattmon MQTT API Server is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health (GET)',
      receive_data: '/api/data/receive (POST)',
      mqtt_port: MQTT_PORT
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err.message);
  logToFile('ERROR', `Global error: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// Start HTTP server
app.listen(PORT, () => {
  console.log(`🌐 HTTP API server listening on port ${PORT}`);
  console.log(`📋 MQTT Configuration for Wattmon device:`);
  console.log(`   - MQTT Server: [Your Render.com URL]`);
  console.log(`   - MQTT Port: ${MQTT_PORT}`);
  console.log(`   - Use TLS: Disabled`);
  console.log(`   - Protocol: MQTT 3.1.1`);
  
  logToFile('INFO', `HTTP server started on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  logToFile('INFO', 'Server shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  logToFile('INFO', 'Server shutting down gracefully');
  process.exit(0);
});

module.exports = app;