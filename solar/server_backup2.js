const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');

// Setup express app
const app = express();
const port = 3005;

// Middleware for parsing form data and JSON
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' })); // Increased limit for form data
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for JSON data

// Setup file upload (with multer)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save files in the 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // File name is the current timestamp + extension
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Increased file size limit (50MB)
  onFileSizeError: (file) => {
    console.log('File size is too large!', file);
  }
});

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

// Add a simple GET route for "/"
app.get('/', (req, res) => {
  res.send(`
    <h1>Upload JSON with Date to Database</h1>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <label for="date">Select Date:</label>
      <input type="date" id="date" name="date" required />
      <br /><br />
      
      <label for="file">Upload JSON File:</label>
      <input type="file" id="file" name="file" />
      <br /><br />
      
      <button type="submit">Upload</button>
    </form>
  `);
});

// Endpoint to handle JSON file upload and date selection
app.post('/upload', upload.single('file'), async (req, res) => {
    const selectedDate = req.body.date ? new Date(req.body.date) : new Date(); // Use the selected date or current date
    const filePath = req.file.path;
  
    try {
      // Read the JSON file
      const rawData = fs.readFileSync(filePath);
      const jsonData = JSON.parse(rawData);
  
      // Iterate over each record in the JSON data and save it to the database
      for (let row of jsonData) {
        const SN = row.SN || 'Unknown';
        const type = row.Type || 'Unknown';
        const siteName = row.SiteName || 'Unknown';
        const customerName = row.UserName || 'Unknown';
        const ratedPower = parseFloat(row['Rated Power(kWh)']) || 0; // Ensure it's parsed as a float
        const installer = row.Installer || 'Unknown';
        const inverterSN = row['Inverter SN'] || 'Unknown';
        const totalYield = row['Total Yield(kWh)'] || 0;
        const dailyYield = parseFloat(row['Daily Yield(kWh)']) || 0; // Ensure it's parsed as a float
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
  
      res.status(200).send('JSON file processed and records updated!');
    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred while processing the file.');
    }
  });
  

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
