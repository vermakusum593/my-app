import axios from "axios";
import React, { useState, useEffect } from "react";

interface Departure {
  time: string;
  destination: string;
  type: string;
  route: string;
}

const transportTypeIcons: { [key: string]: string } = {
  "BLT": "🚌", 
  "BRE": "🚍", 
  "BXB": "🛑", 
  "JLT": "🚆", 
  "JRE": "🚉", 
  "ULT": "🚇", 
  "SLT": "🚊", 
};

const TransportDepartures: React.FC = () => {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stationName, setStationName] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
        },
        () => {
          setError("Failed to get your location.");
          setIsLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (latitude && longitude) {
      fetchDepartures(latitude, longitude);
    }
  }, [latitude, longitude]);

  const fetchDepartures = async (lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `http://localhost:8000/api/departures?lat=${lat}&lng=${lng}`
      );
      const data = response.data;
      setStationName(data.station);
      setDepartures(data.departures);
    } catch (err) {
      setError("Failed to load transport data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading)
    return <p className="text-center text-gray-500 mt-5">Loading...</p>;
  if (error)
    return <p className="text-center text-red-500 mt-5">{error}</p>;
  if (departures.length === 0)
    return (
      <p className="text-center text-gray-700 mt-5">
        No departures found from {stationName}
      </p>
    );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-xl font-bold text-center mb-6">
        🚏 Departures from <span className="text-blue-600">{stationName}</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departures.map((departure, i) => (
          <div
            key={i}
            className="flex items-center bg-white shadow-md rounded-xl p-4 border border-gray-200"
          >
            <div className="text-3xl mr-4">
              {transportTypeIcons[departure.type] || "🚍"}
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-gray-800">
                {departure.destination}
              </p>
              <p className="text-gray-600">
                🕒 <strong>{departure.time}</strong>
              </p>
              <p className="text-gray-500 text-sm">{departure.route}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransportDepartures;
