const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

// Setup express app
const app = express();
const port = 3002;

// Enable CORS for cross-origin requests from React frontend
app.use(cors());

// Middleware for parsing form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files
app.use(express.static('public'));

// Setup file upload (with multer)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save files in the 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // File name is the current timestamp + extension
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

// Add a simple GET route for the root
app.get('/', (req, res) => {
  res.send('Backend is running. Access it via API routes.');
});

// Endpoint to handle Excel file upload
app.post('/upload', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const selectedDate = req.body.date ? new Date(req.body.date) : new Date();

  try {
    // Parse the Excel file
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    for (let row of data) {
      const SN = row.SN || 'Unknown';
      const type = row.Type || 'Unknown';
      const siteName = row.SiteName || 'Unknown';
      const customerName = row.UserName || 'Unknown';
      const ratedPower = row['Rated_Power(kWh)'] || 0;
      const installer = row.Installer || 'Unknown';
      const inverterSN = row['Inverter SN'] || 'Unknown';
      const totalYield = row['Total Yield(kWh)'] || 0;
      const dailyYield = row['Daily_Yield(kWh)'] || 0;
      const country = row.Country || 'Unknown';

      if (!SN) continue;

      // Find the inverter by SN
      let inverter = await Inverter.findOne({ SN });

      if (!inverter) {
        // If the inverter doesn't exist, create a new record
        inverter = new Inverter({
          SN,
          customerName,
          ratedPower,
          type,
          siteName,
          installer,
          inverterSN,
          totalYield,
          dailyYields: [{ date: selectedDate, yield: dailyYield }],
          country,
        });
      } else {
        // Check if the date already exists in dailyYields
        const dateExists = inverter.dailyYields.some(
          (entry) => entry.date.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0]
        );

        if (!dateExists) {
          // Add new daily yield if the date doesn't exist
          inverter.dailyYields.push({ date: selectedDate, yield: dailyYield });
        }

        // Optionally update other fields
        inverter.type = type;
        inverter.siteName = siteName;
        inverter.ratedPower = ratedPower;
        inverter.installer = installer;
        inverter.inverterSN = inverterSN;
        inverter.totalYield = totalYield;
        inverter.country = country;
      }

      // Save the inverter record
      await inverter.save();
    }

    res.status(200).send('File processed and records updated!');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while processing the file.');
  }
});

// Endpoint to fetch daily yields for a specific date
app.get('/yields', async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }

  try {
    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));

    const results = await Inverter.find({
      dailyYields: { $elemMatch: { date: { $gte: startOfDay, $lte: endOfDay } } },
    });

    const formattedResults = results.map((inverter) => {
      const dailyYield = inverter.dailyYields.find(
        (y) =>
          new Date(y.date) >= startOfDay && new Date(y.date) <= endOfDay
      );

      return {
        SN: inverter.SN,
        yield: dailyYield ? dailyYield.yield : 0,
        date: date,
      };
    });

    res.status(200).json(formattedResults);
  } catch (error) {
    console.error('Error in /yields endpoint:', error);
    res.status(500).json({ error: 'An error occurred while fetching the data.' });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
