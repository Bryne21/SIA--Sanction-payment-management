const mongoose = require('mongoose');
const dns = require('dns');
const fs = require('fs');
const path = require('path');
const Member = require('../models/Member');

// Force Node to use reliable public DNS servers for Atlas SRV/A lookup.
const publicDnsServers = ['8.8.8.8', '1.1.1.1'];
dns.setServers(publicDnsServers);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sanction_payment';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected successfully to:', MONGODB_URI);
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    console.warn('Warning: Server keeps running but database actions will fail.');
  }
};

module.exports = {
  connectDB,
  MONGODB_URI
};
