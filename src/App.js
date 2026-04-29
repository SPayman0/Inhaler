import React, { useState, useEffect } from "react";
import "./App.css";

function App() {

  const [expiry, setExpiry] = useState("");
  const [puffs, setPuffs] = useState(0);
  const [location, setLocation] = useState("");
  const [aqi, setAqi] = useState("Enter a city...");

  const isExpired = expiry && new Date(expiry) < new Date();

  // Expiration check
  const checkExpiration = () => {
    if (!expiry) return "";

    const today = new Date();
    const expDate = new Date(expiry);

    if (expDate < today) {
      return "⚠ Inhaler Expired!";
    } else {
      return "✅ Inhaler Valid";
    }
  };

  // Fetch AQI from API
  const fetchAQI = async (city) => {
    if (!city.trim()) {
      setAqi("Enter a city...");
      return;
    }

    try {
      // Step 1: get coordinates
      const geoRes = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=145eefa75e4d94467c77c3eac79ca802`
      );

      const geoData = await geoRes.json();

      if (!geoData.length) {
        setAqi("City not found");
        return;
      }

      const lat = geoData[0].lat;
      const lon = geoData[0].lon;

      // Step 2: get AQI
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

    } catch (error) {
      setAqi("Error loading AQI");
    }
  };

  // Fetch puffs on mount and every 2 seconds
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

  // Trigger AQI fetch when location changes (with debounce)
  useEffect(() => {
    if (!location.trim()) {
      setAqi("Enter a city...");
      return;
    }

    const timer = setTimeout(() => {
      fetchAQI(location);
    }, 800); // Wait 800ms after user stops typing

    return () => clearTimeout(timer);
  }, [location]);

  return (
    <div className={isExpired ? "container expired" : "container"}>
      <h1>Smart Inhaler Dashboard</h1>
      {isExpired && <h2 className="alert">⚠ INHALER EXPIRED ⚠</h2>}

      {/* Puffs */}
      <div className="card">
        <h2>Remaining Puffs</h2>
        <p>{puffs}</p>
      </div>

      {/* Expiration */}
      <div className="card">
        <h2>Expiration Date</h2>

        <input
          type="date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
        />

        <p>{checkExpiration()}</p>
      </div>

      {/* Air Quality */}
      <div className="card">
        <h2>Air Quality</h2>

        <input
          type="text"
          placeholder="Type city (e.g. Atlanta)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <p>{aqi}</p>
      </div>
    </div>
  );
}

export default App;