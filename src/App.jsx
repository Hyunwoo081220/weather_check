import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import "./App.css";
const API_KEY = process.env.REACT_APP_WEATHER_API_KEY || "1a766f229736e7388ae8420317097087";
console.log("API_KEY:", API_KEY); // 확인용



function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [dailyForecast, setDailyForecast] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (e) => setDarkMode(e.matches);
    setDarkMode(mq.matches);
    if (mq.addEventListener) {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    } else {
      mq.addListener(apply);
      return () => mq.removeListener(apply);
    }
  }, []);

  const handleFetch = async () => {
    if (!city.trim()) return;
    if (!API_KEY) {
      alert("환경변수 REACT_APP_WEATHER_API_KEY가 설정되어 있지 않습니다.");
      return;
    }

    setLoading(true);
    setWeather(null);
    setForecast([]);
    setDailyForecast([]);

    try {
      // 현재 날씨
      const wRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
          city
        )}&units=metric&lang=kr&appid=${API_KEY}`
      );
      const wData = await wRes.json();
      if (wRes.ok) {
        setWeather(wData);
      } else {
        setWeather(null);
        alert(wData.message || "도시를 찾을 수 없습니다.");
      }

      // 5일 예보
      const fRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
          city
        )}&units=metric&lang=kr&appid=${API_KEY}`
      );
      const fData = await fRes.json();
      if (fRes.ok && Array.isArray(fData.list)) {
        setForecast(fData.list);

        // 날짜별 그룹화 (최고/최저, 아이콘, 설명)
        const map = {};
        fData.list.forEach((item) => {
          const date = item.dt_txt.split(" ")[0];
          if (!map[date]) {
            map[date] = {
              date,
              temp_max: item.main.temp_max,
              temp_min: item.main.temp_min,
              icon: item.weather[0].icon,
              description: item.weather[0].description,
            };
          } else {
            map[date].temp_max = Math.max(map[date].temp_max, item.main.temp_max);
            map[date].temp_min = Math.min(map[date].temp_min, item.main.temp_min);
          }
        });
        setDailyForecast(Object.values(map).slice(0, 5)); // 5일만
      }
    } catch (err) {
      console.error(err);
      alert("API 호출 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const onKeyPress = (e) => {
    if (e.key === "Enter") handleFetch();
  };

  return (
    <div className={`app-root ${darkMode ? "dark" : ""}`}>
      <button
        className="toggleBtn"
        onClick={() => setDarkMode((prev) => !prev)}
        aria-label="다크 모드 토글"
      >
        {darkMode ? "☀️ 라이트" : "🌙 다크"}
      </button>

      <main className="container">
        <h1 className="title">도시별 날씨 검색</h1>

        <div className="controls">
          <div className="searchRow">
            <input
              className="input"
              type="text"
              placeholder="도시 이름 입력 (예: Seoul)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyPress={onKeyPress}
            />
            <button className="searchBtn" onClick={handleFetch} disabled={loading}>
              {loading ? "로딩..." : "검색"}
            </button>
          </div>
        </div>

        {weather && (
          <section className="card">
            <div className="cardHeader">
              <h2 className="city">
                {weather.name}, {weather.sys?.country}
              </h2>
            </div>
            <div className="cardBody">
              <img
                src={`https://openweathermap.org/img/wn/${weather.weather?.[0]?.icon}@2x.png`}
                alt={weather.weather?.[0]?.description || "weather icon"}
                className="weatherIcon"
              />
              <div className="weatherDetails">
                <p className="description">{weather.weather?.[0]?.description}</p>
                <p className="temp">온도: {weather.main?.temp}°C</p>
                <p>체감: {weather.main?.feels_like}°C</p>
                <p>습도: {weather.main?.humidity}%</p>
                <p>풍속: {weather.wind?.speed} m/s</p>
              </div>
            </div>
          </section>
        )}

        {dailyForecast.length > 0 && (
          <section className="forecastCards">
            <h3>5일간 날짜별 날씨</h3>
            <div className="cardsWrapper">
              {dailyForecast.map((day) => (
                <div className="forecastCard" key={day.date}>
                  <p className="forecastDate">{day.date}</p>
                  <img
                    src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
                    alt={day.description}
                    className="forecastIcon"
                  />
                  <p className="forecastDesc">{day.description}</p>
                  <p>최고: {Math.round(day.temp_max)}°C</p>
                  <p>최저: {Math.round(day.temp_min)}°C</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {forecast.length > 0 && (
          <section className="forecastChart">
            <h3>5일 예보 라인차트</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={dailyForecast.map((d) => ({
                  date: d.date,
                  temp_max: Math.round(d.temp_max),
                  temp_min: Math.round(d.temp_min),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="temp_max" stroke="#ff5722" name="최고" />
                <Line type="monotone" dataKey="temp_min" stroke="#2196f3" name="최저" />
              </LineChart>
            </ResponsiveContainer>
          </section>
        )}

        {!weather && !loading && city && (
          <p className="notFound">날씨 데이터를 찾을 수 없습니다. 도시명을 확인하세요.</p>
        )}
      </main>
    </div>
  );
}

export default App;
