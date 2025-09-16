const fs = require('fs-extra');
const path = require('path');
const mongoose = require('mongoose');

// MongoDB Schema for Wattmon data
const WattmonDataSchema = new mongoose.Schema({
  mac: {
    type: String,
    required: true,
    index: true
  },
  clientId: {
    type: String,
    required: false
  },
  topic: {
    type: String,
    required: false
  },
  data: [{
    ts: {
      type: Number,
      required: true
    },
    power: {
      type: Number,
      required: false
    },
    voltage: {
      type: Number,
      required: false
    },
    current: {
      type: Number,
      required: false
    },
    // Add other fields as needed
    energy: Number,
    frequency: Number,
    temperature: Number
  }],
  receivedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  source: {
    type: String,
    enum: ['mqtt', 'http'],
    default: 'mqtt'
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
WattmonDataSchema.index({ mac: 1, receivedAt: -1 });
WattmonDataSchema.index({ 'data.ts': -1 });

const WattmonData = mongoose.model('WattmonData', WattmonDataSchema);

// Utility function to log data to file
function logDataToFile(data, source = 'unknown') {
  try {
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];
    const logsDir = path.join(__dirname, '..', 'logs', 'data');
    
    // Ensure data logs directory exists
    fs.ensureDirSync(logsDir);
    
    const logEntry = {
      timestamp,
      source,
      data
    };
    
    const fileName = `data-${dateStr}.json`;
    const filePath = path.join(logsDir, fileName);
    
    // Append to daily log file
    fs.appendFileSync(filePath, JSON.stringify(logEntry) + '\n');
    
    console.log(`📝 Data logged to file: ${fileName}`);
  } catch (error) {
    console.error('❌ Error logging data to file:', error.message);
  }
}

// Health check controller
const healthCheck = async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Get basic stats
    const totalRecords = await WattmonData.countDocuments();
    const latestRecord = await WattmonData.findOne().sort({ receivedAt: -1 });
    
    const healthData = {
      status: 'success',
      timestamp: new Date().toISOString(),
      server: {
        status: 'running',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      },
      database: {
        status: dbStatus,
        totalRecords,
        latestRecordTime: latestRecord?.receivedAt || null
      },
      mqtt: {
        status: 'active'
      }
    };
    
    console.log('✅ Health check requested');
    res.json(healthData);
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Store MQTT data (called from app.js MQTT handler)
const storeMqttData = async (jsonData, clientId, topic) => {
  try {
    // Validate required fields
    if (!jsonData.mac) {
      throw new Error('MAC address is required');
    }
    
    if (!jsonData.data || !Array.isArray(jsonData.data)) {
      throw new Error('Data array is required');
    }
    
    // Create database record
    const wattmonRecord = new WattmonData({
      mac: jsonData.mac,
      clientId: clientId,
      topic: topic,
      data: jsonData.data,
      source: 'mqtt'
    });
    
    // Save to MongoDB
    const savedRecord = await wattmonRecord.save();
    
    // Log to file
    logDataToFile(jsonData, 'mqtt');
    
    console.log(`✅ MQTT data stored successfully. ID: ${savedRecord._id}`);
    console.log(`🔗 Device MAC: ${jsonData.mac}`);
    console.log(`📈 Data points: ${jsonData.data.length}`);
    
    return savedRecord;
    
  } catch (error) {
    console.error('❌ Error storing MQTT data:', error.message);
    throw error;
  }
};

// HTTP data receive controller
const receiveData = async (req, res) => {
  try {
    const jsonData = req.body;
    
    console.log('📩 HTTP data received:', JSON.stringify(jsonData, null, 2));
    
    // Validate required fields
    if (!jsonData.mac) {
      return res.status(400).json({
        status: 'error',
        message: 'MAC address is required'
      });
    }
    
    if (!jsonData.data || !Array.isArray(jsonData.data)) {
      return res.status(400).json({
        status: 'error',
        message: 'Data array is required'
      });
    }
    
    // Create database record
    const wattmonRecord = new WattmonData({
      mac: jsonData.mac,
      data: jsonData.data,
      source: 'http'
    });
    
    // Save to MongoDB
    const savedRecord = await wattmonRecord.save();
    
    // Log to file
    logDataToFile(jsonData, 'http');
    
    console.log(`✅ HTTP data stored successfully. ID: ${savedRecord._id}`);
    
    res.status(201).json({
      status: 'success',
      message: 'Data received and stored successfully',
      id: savedRecord._id,
      mac: jsonData.mac,
      dataPoints: jsonData.data.length,
      timestamp: savedRecord.receivedAt
    });
    
  } catch (error) {
    console.error('❌ Error processing HTTP data:', error.message);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to process data',
      error: error.message
    });
  }
};

module.exports = {
  healthCheck,
  receiveData,
  storeMqttData
};