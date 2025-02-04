const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

// Setup express app
const app = express();
const port = 3004;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for frontend access

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

// Endpoint to fetch the sample inverter
app.get('/sample-inverter', async (req, res) => {
  try {
    // Check if sample inverter already exists in the DB
    let sampleInverter = await Inverter.findOne({ SN: 'INV-001' });

    if (!sampleInverter) {
      // If not, create and save the sample inverter
      const dailyYields = [];
      for (let i = 0; i < 30; i++) {
        dailyYields.push({
          date: new Date(new Date().setDate(new Date().getDate() - i)),
          yield: Math.random() * 10, // Random yield data for example
        });
      }

      sampleInverter = new Inverter({
        SN: 'INV-001',
        type: 'String Inverter',
        siteName: 'Site 1',
        customerName: 'Customer 1',
        ratedPower: 10, // Example rated power
        installer: 'Installer A',
        inverterSN: 'SN-12345',
        totalYield: dailyYields.reduce((acc, curr) => acc + curr.yield, 0),
        dailyYields,
        country: 'Country X',
      });

      // Save the sample inverter
      await sampleInverter.save();
    }

    // Return the sample inverter data
    res.json(sampleInverter);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving sample inverter', error });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
