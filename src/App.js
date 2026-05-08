import React, { useState, useEffect } from "react";
import "./App.css";

function App() {

  const [expiry, setExpiry] = useState("");
  const [puffs, setPuffs] = useState(0);
  const [aqi, setAqi] = useState("Fetching location...");
  const [city, setCity] = useState(null);
  const [coords, setCoords] = useState(null);
  const [lastSeen, setLastSeen] = useState(null);
  const [inhalerCity, setInhalerCity] = useState(null);
  const [inhalerCoords, setInhalerCoords] = useState(null);
  const [inhalerLastSeen, setInhalerLastSeen] = useState(null);
  const [locating, setLocating] = useState(false);

  const isExpired = expiry && new Date(expiry) < new Date();

  const checkExpiration = () => {
    if (!expiry) return "";
    const today = new Date();
    const expDate = new Date(expiry);
    return expDate < today ? "⚠ Inhaler Expired!" : "✅ Inhaler Valid";
  };

  const fetchCityName = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=145eefa75e4d94467c77c3eac79ca802`
      );
      const data = await res.json();
      if (data.length > 0) return `${data[0].name}, ${data[0].state}`;
      return null;
    } catch {
      return null;
    }
  };

  const fetchAQI = async (lat, lon) => {
    try {
      const aqiRes = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=145eefa75e4d94467c77c3eac79ca802`
      );
      const aqiData = await aqiRes.json();
      const value = aqiData.list[0].main.aqi;
      const levels = {
        1: "Good",
        2: "Fair",
        3: "Moderate, Caution",
        4: "Poor, Bring Inhaler",
        5: "Very Poor, ⚠ BRING INHALER ⚠"
      };
      setAqi(`Air Quality: ${levels[value]}`);
    } catch {
      setAqi("Error loading AQI");
    }
  };

  // Background GPS fetch for AQI only
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const res = await fetch(
          "https://ahub0ybl52.execute-api.us-east-2.amazonaws.com/location?deviceId=RaspberryPi-Sam"
        );
        const data = await res.json();

        if (data.latitude && data.longitude) {
          setCoords({ lat: data.latitude, lon: data.longitude });
          setLastSeen(data.timestamp);

          const [cityName] = await Promise.all([
            fetchCityName(data.latitude, data.longitude),
            fetchAQI(data.latitude, data.longitude)
          ]);
          if (cityName) setCity(cityName);
        }
      } catch (error) {
        console.error("GPS fetch error:", error);
        setAqi("Error fetching location");
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch puffs every 2 seconds
  useEffect(() => {
    const fetchPuffs = async () => {
      try {
        const res = await fetch("https://m27juv7esg.execute-api.us-east-2.amazonaws.com/default/count");
        const data = await res.json();
        setPuffs(data.count);
      } catch (error) {
        console.error(error);
      }
    };

    fetchPuffs();
    const interval = setInterval(fetchPuffs, 2000);
    return () => clearInterval(interval);
  }, []);

  // Button press — fetch fresh location and display it
  const handleFindInhaler = async () => {
    setLocating(true);
    setInhalerCoords(null);
    setInhalerCity(null);
    setInhalerLastSeen(null);

    try {
      const res = await fetch(
        "https://ahub0ybl52.execute-api.us-east-2.amazonaws.com/location?deviceId=RaspberryPi-Sam"
      );
      const data = await res.json();

      if (data.latitude && data.longitude) {
        const cityName = await fetchCityName(data.latitude, data.longitude);
        setInhalerCoords({ lat: data.latitude, lon: data.longitude });
        setInhalerCity(cityName);
        setInhalerLastSeen(data.timestamp);
      }
    } catch (error) {
      console.error("Find inhaler error:", error);
    }

    setLocating(false);
  };

  return (
    <div className={isExpired ? "container expired" : "container"}>
      <h1>Smart Inhaler Dashboard</h1>
      {isExpired && <h2 className="alert">⚠ INHALER EXPIRED ⚠</h2>}

      <div className="card">
        <h2>Remaining Puffs</h2>
        <p>{puffs}</p>
      </div>

      <div className="card">
        <h2>Expiration Date</h2>
        <input
          type="date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
        />
        <p>{checkExpiration()}</p>
      </div>

      <div className="card">
        <h2>Air Quality</h2>
        {city && <p className="coords">📍 {city}</p>}
        <p>{aqi}</p>
      </div>

      <div className="card">
        <h2>📍 Inhaler Location</h2>
        <button className="find-button" onClick={handleFindInhaler} disabled={locating}>
          {locating ? "Locating..." : "🔍 Find My Inhaler"}
        </button>

        {inhalerCoords && (
          <div className="inhaler-result">
            {inhalerCity && <p><strong>{inhalerCity}</strong></p>}
            <p className="coords">{inhalerCoords.lat.toFixed(5)}, {inhalerCoords.lon.toFixed(5)}</p>
            {inhalerLastSeen && <p className="timestamp">Last updated: {inhalerLastSeen}</p>}
            <a
              href={`https://www.google.com/maps?q=${inhalerCoords.lat},${inhalerCoords.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="map-link"
            >
              Open in Google Maps →
            </a>
          </div>
        )}
      </div>

    </div>
  );
}

export default App;