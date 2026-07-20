const path = require('path');
const dotenv = require('dotenv');
const dns = require('dns');

dotenv.config({ path: path.join(__dirname, '.env'), override: true });
console.log('Loaded env from', path.join(__dirname, '.env'));
console.log('MONGODB_URI prefix:', process.env.MONGODB_URI ? process.env.MONGODB_URI.slice(0, 40) + '...' : 'none');

dns.setServers(['8.8.8.8', '1.1.1.1']);
console.log('DNS servers set:', dns.getServers());

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const apiRoutes = require('./routes/api');
const { ensureSanctionSeedData } = require('./controllers/sanctionController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Sanction Payment Backend is running.' });
});

const startServer = async () => {
  await connectDB();
  const seedResult = await ensureSanctionSeedData();
  console.log('Sanction seed result:', seedResult);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express Sanction Backend running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

