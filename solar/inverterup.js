const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

// Setup express app
const app = express();
const port = 3020;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for frontend access

// Setup file upload (with multer)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Connect to MongoDB
mongoose.connect('mongodb+srv://solar:solar123@cluster0.qkrtv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Mongoose schema
const inverterSchema = new mongoose.Schema({
  SN: { type: String, required: true, unique: true },
  type: String,
  siteName: String,
  customerName: String,
  ratedPower: Number,
  installer: String,
  inverterSN: String,
  totalYield: Number,
  dailyYields: [{ date: Date, yield: Number }],
  country: String,
});
const Inverter = mongoose.model('Inverter', inverterSchema);

// Default route
app.get('/', (req, res) => {
  res.send("Solar Inverter Backend is Running");
});

// Endpoint to fetch only fault inverters with consistent low yield periods
// Endpoint to fetch only fault inverters within the selected date range
app.get('/fault-inverters', async (req, res) => {
  const range = req.query.range || 'last-month'; // Default to 'last-month' if no range is provided
  
  const today = new Date();
  let startDate;

  // Calculate the start date based on the selected range
  if (range === 'last-week') {
    startDate = new Date(today.setDate(today.getDate() - 7)); // Last week
  } else if (range === 'last-2-weeks') {
    startDate = new Date(today.setDate(today.getDate() - 14)); // Last 2 weeks
  } else if (range === 'last-3-weeks') {
    startDate = new Date(today.setDate(today.getDate() - 21)); // Last 3 weeks
  } else {
    startDate = new Date(today.setMonth(today.getMonth() - 1)); // Last 30 days (default)
  }

  try {
    const inverters = await Inverter.find();
    const faultInverters = inverters.map((inverter) => {
      const expectedRP = inverter.ratedPower * 3.8;
      let lowYieldPeriods = [];
      let tempPeriod = [];
      
      inverter.dailyYields.forEach((yieldData, index) => {
        const yieldDate = new Date(yieldData.date);
        
        // Filter yields based on the selected date range
        if (yieldDate >= startDate) {
          if (yieldData.yield < expectedRP) {
            tempPeriod.push(yieldData);
          } else {
            if (tempPeriod.length >= 3) {
              lowYieldPeriods.push([...tempPeriod]);
            }
            tempPeriod = [];
          }
        }
      });
      if (tempPeriod.length >= 3) {
        lowYieldPeriods.push([...tempPeriod]);
      }

      if (lowYieldPeriods.length > 0) {
        return {
          SN: inverter.SN,
          ratedPower: inverter.ratedPower,
          dailyYields: inverter.dailyYields,
          lowYieldPeriods: lowYieldPeriods
        };
      }
    }).filter(Boolean);

    res.json(faultInverters);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch fault inverters" });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
