const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const { MongoClient } = require("mongodb");
const path = require("path");
const os = require("os");

const app = express();
const PORT = 3000;

// Configure Multer (for handling file uploads)
const upload = multer({ dest: "uploads/" });

// MongoDB connection setup
const mongoURI = "mongodb+srv://solar:1234@clustersolar.ypi7g.mongodb.net/?retryWrites=true&w=majority&appName=ClusterSolar";
const client = new MongoClient(mongoURI);
const dbName = "SolarDB"; // The database name remains fixed

// Serve the HTML file
app.use(express.static("public"));

// Upload route
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path; // Path of the uploaded file
    const fileName = path.parse(req.file.originalname).name; // Extract the file name without extension
    const workbook = xlsx.readFile(filePath); // Read the Excel file
    const sheetName = workbook.SheetNames[0]; // Get the first sheet
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]); // Convert sheet to JSON

    // Connect to MongoDB and insert the data into the database with the file name as the collection name
    await client.connect();
    const db = client.db(dbName); // Always use Solar1 as the database
    const collection = db.collection(fileName); // Use the file name as the collection name
    await collection.insertMany(data);

    // Respond with success message and auto-redirect
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Upload Success</title>
      </head>
      <body>
        <h1>Upload successful!</h1>
        <p>File uploaded and data inserted into MongoDB database: <strong>${dbName}</strong>, collection: <strong>${fileName}</strong>.</p>
        <p>Redirecting you back to the homepage in 3 seconds...</p>
        <script>
          setTimeout(() => {
            window.location.href = "/";
          }, 3000); // Redirect after 3 seconds
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).send("Error uploading file.");
  } finally {
    // Clean up and close MongoDB connection
    await client.close();
  }
});

// Function to get the local IP address
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const iface in interfaces) {
    for (const alias of interfaces[iface]) {
      if (alias.family === "IPv4" && !alias.internal) {
        return alias.address; // Return the first non-internal IPv4 address
      }
    }
  }
  return "127.0.0.1"; // Default to localhost if no network interface is found
}

// Get the local IP address
const localIP = getLocalIPAddress();

// Start the server on the local IP address
app.listen(PORT, localIP, () => {
  console.log(`Server running at http://${localIP}:${PORT}`);
});
