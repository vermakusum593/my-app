const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = 8000;

app.use(cors());


app.get("/api/departures", async (req, res) => {
  const { lat, lng } = req.query;


  if (!lat || !lng) {
    return res.status(400).json({ error: "Latitude and Longitude are required" });
  }

  const API_KEY = process.env.RESROBOT_API_KEY; 

  try {
   
    const stationResponse = await axios.get(
      `https://api.resrobot.se/v2.1/location.nearbystops?format=json&originCoordLat=${lat}&originCoordLong=${lng}&maxNo=1&accessId=${API_KEY}`
    );

    
    const station = stationResponse.data.stopLocationOrCoordLocation[0].StopLocation;
    const stationId = station.extId;
    const stationName = station.name;

    
    const departuresResponse = await axios.get(
      `https://api.resrobot.se/v2.1/departureBoard?format=json&id=${stationId}&maxJourneys=10&accessId=${API_KEY}`
    );

    
    const departures = departuresResponse.data.Departure.map((dep) => ({
      time: dep.time,
      destination: dep.direction,
      type: dep.ProductAtStop.catOut, 
      route: dep.name, 
    }));

    
    res.json({ station: stationName, departures });
  } catch (error) {
    console.error("Error fetching departures:", error.message);
    res.status(500).json({ error: "Failed to fetch transport departures" });
  }
});


app.get("/", (req, res) => {
  res.json({ message: "Transport API is running!" });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
