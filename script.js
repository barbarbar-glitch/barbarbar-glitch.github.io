const BANDUNG_LAT = -6.9175;
const BANDUNG_LON = 107.6191;

const weatherEls = {
  temp: document.getElementById("weather-current-temp"),
  condition: document.getElementById("weather-current-condition"),
  wind: document.getElementById("weather-current-wind"),
  humidity: document.getElementById("weather-current-humidity"),
  time: document.getElementById("weather-current-time"),
};

const tempCanvas = document.getElementById("tempChart");
const rainCanvas = document.getElementById("rainChart");

const weatherCodeMap = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Heavy showers",
  82: "Violent showers",
  95: "Thunderstorm",
};

function drawLineChart(canvas, values, labels, ySuffix, yMin, yMax) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const left = 44;
  const right = 12;
  const top = 16;
  const bottom = 32;
  const plotW = width - left - right;
  const plotH = height - top - bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, plotW, plotH);

  const stepY = (yMax - yMin) / 4;
  ctx.fillStyle = "#000000";
  ctx.font = "11px sans-serif";
  for (let i = 0; i <= 4; i += 1) {
    const val = yMin + stepY * (4 - i);
    const y = top + (plotH / 4) * i;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + plotW, y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillText(`${Math.round(val)}${ySuffix}`, 4, y + 4);
  }

  ctx.beginPath();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;

  values.forEach((value, i) => {
    const x = left + (i / (values.length - 1)) * plotW;
    const y = top + ((yMax - value) / (yMax - yMin || 1)) * plotH;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  ctx.fillStyle = "#000000";
  const tickIndexes = [0, 6, 12, 18, 23].filter((idx) => idx < labels.length);
  tickIndexes.forEach((idx) => {
    const ratio = labels.length > 1 ? idx / (labels.length - 1) : 0;
    const x = left + ratio * plotW;
    ctx.fillText(labels[idx], x - 10, height - 8);
  });
}

function drawBarChart(canvas, values, labels) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const left = 44;
  const right = 12;
  const top = 16;
  const bottom = 32;
  const plotW = width - left - right;
  const plotH = height - top - bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, plotW, plotH);

  ctx.fillStyle = "#000000";
  ctx.font = "11px sans-serif";
  for (let i = 0; i <= 4; i += 1) {
    const pct = 100 - i * 25;
    const y = top + (plotH / 4) * i;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + plotW, y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillText(`${pct}%`, 8, y + 4);
  }

  const barW = plotW / Math.max(1, values.length);
  values.forEach((value, i) => {
    const h = (value / 100) * plotH;
    const x = left + i * barW + 1;
    const y = top + plotH - h;
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x, y, Math.max(1, barW - 2), h);
    ctx.globalAlpha = 1;
  });

  ctx.fillStyle = "#000000";
  const tickIndexes = [0, 6, 12, 18, 23].filter((idx) => idx < labels.length);
  tickIndexes.forEach((idx) => {
    const ratio = labels.length > 1 ? idx / (labels.length - 1) : 0;
    const x = left + ratio * plotW;
    ctx.fillText(labels[idx], x - 10, height - 8);
  });
}

function hourLabel(isoTime) {
  const d = new Date(isoTime);
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}

async function fetchJsonWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
  if (!res.ok) throw new Error(`Weather API failed (${res.status})`);
  return res.json();
}

function buildSeries(data) {
  const current = data.current || {};
  const currentWeather = data.current_weather || {};
  const hourly = data.hourly || {};
  const hourlyTimes = Array.isArray(hourly.time) ? hourly.time : [];

  const currentTime = current.time || currentWeather.time || hourlyTimes[0];
  const startIdx = hourlyTimes.findIndex((t) => t === currentTime);
  const i0 = startIdx >= 0 ? startIdx : 0;
  const i1 = i0 + 24;

  const times = hourlyTimes.slice(i0, i1).map(hourLabel);
  const temps = (hourly.temperature_2m || []).slice(i0, i1);
  const rain = (hourly.precipitation_probability || []).slice(i0, i1);
  const humidities = (hourly.relative_humidity_2m || hourly.relativehumidity_2m || []).slice(i0, i1);
  const winds = (hourly.wind_speed_10m || hourly.windspeed_10m || []).slice(i0, i1);

  const currentTemp = Number(current.temperature_2m ?? currentWeather.temperature);
  const currentWind = Number(current.wind_speed_10m ?? currentWeather.windspeed ?? winds[0]);
  const currentHumidity = Number(current.relative_humidity_2m ?? humidities[0]);

  return {
    currentTime,
    currentTemp,
    currentWind,
    currentHumidity,
    weatherCode: Number(current.weather_code ?? currentWeather.weathercode),
    times,
    temps,
    rain,
  };
}

function updateWeatherUI(series) {
  const { currentTime, currentTemp, currentWind, currentHumidity, weatherCode, times, temps, rain } = series;

  weatherEls.temp.textContent = Number.isFinite(currentTemp)
    ? `${currentTemp.toFixed(1)}°C`
    : "--.-°C";
  weatherEls.condition.textContent = weatherCodeMap[weatherCode] || "Weather live";
  weatherEls.wind.textContent = Number.isFinite(currentWind) ? `${currentWind.toFixed(1)} km/h` : "--.- km/h";
  weatherEls.humidity.textContent = Number.isFinite(currentHumidity) ? `${Math.round(currentHumidity)}%` : "--%";
  weatherEls.time.textContent = currentTime ? `${hourLabel(currentTime)} local` : "--:-- local";

  if (times.length >= 2 && temps.length >= 2 && rain.length >= 2) {
    const minTemp = Math.floor(Math.min(...temps) - 1);
    const maxTemp = Math.ceil(Math.max(...temps) + 1);
    drawLineChart(tempCanvas, temps, times, "°", minTemp, maxTemp);
    drawBarChart(rainCanvas, rain, times);
  }
}

function drawOfflineFallbackGraphs() {
  const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
  const fallbackTemps = [
    22, 22, 21, 21, 20, 20, 21, 23, 25, 27, 28, 29,
    29, 30, 30, 29, 28, 27, 26, 25, 24, 24, 23, 22,
  ];
  const fallbackRain = [
    10, 10, 8, 8, 8, 10, 12, 20, 28, 35, 40, 45,
    50, 55, 58, 50, 42, 36, 30, 24, 18, 14, 12, 10,
  ];
  drawLineChart(tempCanvas, fallbackTemps, labels, "°", 19, 31);
  drawBarChart(rainCanvas, fallbackRain, labels);
}

async function loadBandungWeather() {
  const primaryUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${BANDUNG_LAT}` +
    `&longitude=${BANDUNG_LON}` +
    `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m` +
    `&hourly=temperature_2m,precipitation_probability,relative_humidity_2m,wind_speed_10m` +
    `&timezone=Asia%2FJakarta&forecast_days=2`;

  const fallbackUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${BANDUNG_LAT}` +
    `&longitude=${BANDUNG_LON}` +
    `&current_weather=true` +
    `&hourly=temperature_2m,precipitation_probability,relativehumidity_2m,windspeed_10m` +
    `&timezone=Asia%2FJakarta&forecast_days=2`;

  const attempts = [
    { url: primaryUrl, timeout: 15000 },
    { url: primaryUrl, timeout: 20000 },
    { url: fallbackUrl, timeout: 20000 },
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const data = await fetchJsonWithTimeout(attempt.url, attempt.timeout);
      const series = buildSeries(data);
      updateWeatherUI(series);
      return;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Weather load failed");
}

function showWeatherError() {
  weatherEls.temp.textContent = "26.0°C";
  weatherEls.wind.textContent = "7.0 km/h";
  weatherEls.humidity.textContent = "74%";
  weatherEls.condition.textContent = "Live weather unavailable";
  weatherEls.time.textContent = "Showing fallback pattern";
  drawOfflineFallbackGraphs();
}

if (
  weatherEls.temp &&
  weatherEls.condition &&
  weatherEls.wind &&
  weatherEls.humidity &&
  weatherEls.time &&
  tempCanvas &&
  rainCanvas
) {
  loadBandungWeather().catch(showWeatherError);
}

