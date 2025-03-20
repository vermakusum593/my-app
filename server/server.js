require('dotenv').config({ path: __dirname + '/../.env' });


  

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const xml2js = require('xml2js'); // XML parser

const app = express();

const PORT = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

// Load API Keys 
const GEOCODING_API_KEY = process.env.GEOCODING_API_KEY;
const TRAFIKEVERKET_API_KEY = process.env.TRAFIKEVERKET_API_KEY;


console.log("✅ GEOCODING_API_KEY:", GEOCODING_API_KEY ? "Loaded" : "Not Loaded ❌");
console.log("✅ TRAFIKEVERKET_API_KEY:", TRAFIKEVERKET_API_KEY ? "Loaded" : "Not Loaded ❌");


app.post('/api/geocode', async (req, res) => {
    const { address } = req.body;

    if (!address) {
        return res.status(400).json({ message: 'Address is required' });
    }

    try {
        const response = await axios.get(
            `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${GEOCODING_API_KEY}`
        );

        if (response.data.results.length > 0) {
            const { lat, lng } = response.data.results[0].geometry;
            return res.json({ lat, lng });
        } else {
            return res.status(404).json({ message: 'Location not found.' });
        }
    } catch (error) {
        console.error('❌ Error fetching geocode data:', error.message);
        return res.status(500).json({ message: 'Error fetching geocode data.' });
    }
});


app.post('/api/station', async (req, res) => {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
        return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const requestBody = `
        <REQUEST>
            <LOGIN authenticationkey="${TRAFIKEVERKET_API_KEY}" />
            <QUERY objecttype="TrainStation" schemaversion="1.4">
                <FILTER>
                    <WITHIN name="Geometry.WGS84" value="${latitude.toFixed(6)} ${longitude.toFixed(6)},5000" />
                </FILTER>
                <INCLUDE>LocationSignature</INCLUDE>
                <INCLUDE>AdvertisedLocationName</INCLUDE>
            </QUERY>
        </REQUEST>
    `;

    try {
        const response = await axios.post('https://api.trafikinfo.trafikverket.se/v2/data.xml', requestBody, {
            headers: { 'Content-Type': 'text/xml', Accept: 'application/xml' },
        });

  
        xml2js.parseString(response.data, { explicitArray: false }, (err, result) => {
            if (err) {
                console.error('❌ Error parsing XML:', err);
                return res.status(500).json({ message: 'Error parsing station data' });
            }

            const stations = result?.RESPONSE?.RESULT?.TrainStation;
            if (stations) {
                const signature = stations.LocationSignature || 'Unknown';
                return res.json({ signature });
            } else {
                return res.status(404).json({ message: 'No train station found near this location.' });
            }
        });
    } catch (error) {
        console.error('❌ Error fetching station data:', error.message);
        return res.status(500).json({ message: 'Error fetching station data.' });
    }
});


app.post('/api/departures', async (req, res) => {
    const { stationSignature } = req.body;

    if (!stationSignature) {
        return res.status(400).json({ message: 'Station signature is required' });
    }

    const requestBody = `
        <REQUEST>
            <LOGIN authenticationkey="${TRAFIKEVERKET_API_KEY}" />
            <QUERY objecttype="TrainAnnouncement" schemaversion="1.6">
                <FILTER>
                    <EQ name="LocationSignature" value="${stationSignature}" />
                    <EQ name="ActivityType" value="Departure" />
                </FILTER>
                <INCLUDE>AdvertisedTimeAtLocation</INCLUDE>
                <INCLUDE>AdvertisedTrainIdent</INCLUDE>
                <INCLUDE>ToLocation</INCLUDE>
            </QUERY>
        </REQUEST>
    `;

    try {
        const response = await axios.post('https://api.trafikinfo.trafikverket.se/v2/data.xml', requestBody, {
            headers: { 'Content-Type': 'text/xml', Accept: 'application/xml' },
        });


        xml2js.parseString(response.data, { explicitArray: false }, (err, result) => {
            if (err) {
                console.error('❌ Error parsing XML:', err);
                return res.status(500).json({ message: 'Error parsing departures data' });
            }

            const announcements = result?.RESPONSE?.RESULT?.TrainAnnouncement;
            if (!announcements) {
                return res.status(404).json({ message: 'No departures found.' });
            }

            const departuresList = Array.isArray(announcements) ? announcements : [announcements];

            const formattedDepartures = departuresList.map((item) => ({
                trainNumber: item.AdvertisedTrainIdent || 'Unknown',
                departureTime: item.AdvertisedTimeAtLocation || 'Unknown',
                destination: item.ToLocation?.LocationName || 'Unknown',
            }));

            return res.json(formattedDepartures);
        });
    } catch (error) {
        console.error('❌ Error fetching departures:', error.message);
        return res.status(500).json({ message: 'Error fetching departures.' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
