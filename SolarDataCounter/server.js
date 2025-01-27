const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = 3011;

// MongoDB connection setup
const mongoURI = "mongodb+srv://solar:1234@clustersolar.ypi7g.mongodb.net/?retryWrites=true&w=majority&appName=ClusterSolar";
const client = new MongoClient(mongoURI);
const dbName = "SolarDB";
const collectionName = "2025.01.16";

// Endpoint to fetch the count
app.get("/count", async (req, res) => {
  console.log("Received a request at /count");

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    console.log("Successfully connected to MongoDB.");

    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    console.log(`Fetching records from database: ${dbName}, collection: ${collectionName}`);

    // Query the database and calculate the count
    const records = await collection.find().toArray();
    console.log(`Fetched ${records.length} records.`);

    let count = 0;
    let invalidCount = 0;

    records.forEach((record, index) => {
      // Access columns by position
      const columns = Object.values(record); // Convert record object to an array
      const ratedPower = parseFloat(columns[2]); // 3rd column (0-indexed)
      const dailyYield = parseFloat(columns[3]); // 4th column (0-indexed)

      // Check for missing or invalid values
      if (isNaN(ratedPower) || isNaN(dailyYield)) {
        invalidCount++;
        console.log(`Skipping record ${index + 1} due to missing or invalid data.`);
        return; // Skip this record
      }

      console.log(`Processing record ${index + 1}: Rated Power = ${ratedPower}, Daily Yield = ${dailyYield}`);

      // Apply condition
      if (ratedPower * 3.8 < dailyYield) {
        count++;
        console.log(`Condition met for record ${index + 1}. Incrementing count.`);
      }
    });

    console.log(`Total count of records meeting the condition: ${count}`);
    res.json({ count });
  } catch (error) {
    console.error("Error accessing the database:", error);
    res.status(500).send("Error processing the request.");
  } finally {
    console.log("Closing MongoDB connection...");
    await client.close();
    console.log("MongoDB connection closed.");
    console.log(`Invalid Count is : ${invalidCount}`);
  }
});

// Serve the HTML file for the frontend
app.use(express.static("public"));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
