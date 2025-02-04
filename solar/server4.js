const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

// Setup express app
const app = express();
const port = 3000;

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

// Endpoint to fetch all inverters
app.get('/inverters', async (req, res) => {
  try {
    const inverters = await Inverter.find();
    res.json(inverters);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving inverters', error });
  }
});

// Endpoint to fetch daily yields of all inverters with ratedPower
app.get('/daily-yields', async (req, res) => {
  try {
    const inverters = await Inverter.find({}, 'SN ratedPower dailyYields');
    res.json(inverters);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving daily yields', error });
  }
});

// Endpoint to get fault inverters
app.get('/fault-inverters', async (req, res) => {
  try {
    const inverters = await Inverter.find({}, 'SN ratedPower dailyYields');
    const faultInverters = inverters.filter((inverter) => {
      const expectedRP = inverter.ratedPower * 3.8;
      const lastThreeDays = inverter.dailyYields.slice(-3);
      return lastThreeDays.length === 3 && lastThreeDays.every(d => d.yield < expectedRP);
    });
    res.json(faultInverters);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving fault inverters', error });
  }
});

// Endpoint to handle Excel file upload
app.post('/upload', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const selectedDate = req.body.date;

  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    const accessTime = selectedDate ? new Date(selectedDate) : new Date();

    for (let row of data) {
      const SN = row.SN || 'Unknown';
      const type = row.Type || 'Unknown';
      const siteName = row.SiteName || 'Unknown';
      const userName = row.UserName || 'Unknown';
      const ratedPower = row['Rated_Power(kWh)'] || 0;
      const installer = row.Installer || 'Unknown';
      const inverterSN = row['Inverter SN'] || 'Unknown';
      const totalYield = row['Total Yield(kWh)'] || 0;
      const dailyYield = row['Daily_Yield(kWh)'] || 0;
      const country = row.Country || 'Unknown';

      if (!SN) {
        console.log('Skipping row with missing Serial Number (SN):', row);
        continue;
      }

      let inverter = await Inverter.findOne({ SN });

      if (!inverter) {
        inverter = new Inverter({
          SN,
          customerName: userName,
          ratedPower,
          type,
          siteName,
          installer,
          inverterSN,
          totalYield,
          dailyYields: [{ date: accessTime, yield: dailyYield }],
          country,
        });
      } else {
        inverter.dailyYields.push({ date: accessTime, yield: dailyYield });
        inverter.type = type;
        inverter.siteName = siteName;
        inverter.ratedPower = ratedPower;
        inverter.installer = installer;
        inverter.inverterSN = inverterSN;
        inverter.totalYield = totalYield;
        inverter.country = country;
      }

      await inverter.save();
    }

    res.status(200).send('File processed and records updated!');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while processing the file.');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
