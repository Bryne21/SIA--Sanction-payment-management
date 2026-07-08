require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Sanction Payment Backend is running.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Express Sanction Backend running on port ${PORT}`);
});

connectDB();

