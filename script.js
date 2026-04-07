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
  [0, 6, 12, 18, 23].forEach((idx) => {
    const x = left + (idx / 23) * plotW;
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

  const barW = plotW / values.length;
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
  [0, 6, 12, 18, 23].forEach((idx) => {
    const x = left + (idx / 23) * plotW;
    ctx.fillText(labels[idx], x - 10, height - 8);
  });
}

function hourLabel(isoTime) {
  const d = new Date(isoTime);
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}

async function loadBandungWeather() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${BANDUNG_LAT}` +
    `&longitude=${BANDUNG_LON}` +
    `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m` +
    `&hourly=temperature_2m,precipitation_probability,relative_humidity_2m` +
    `&timezone=Asia%2FJakarta&forecast_days=2`;

  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
  if (!res.ok) throw new Error("Weather API failed");
  const data = await res.json();

  const current = data.current || {};
  const hourly = data.hourly || {};
  const hourlyTimes = Array.isArray(hourly.time) ? hourly.time : [];
  const startIdx = hourlyTimes.findIndex((t) => t === current.time);
  const i0 = startIdx >= 0 ? startIdx : 0;
  const i1 = i0 + 24;

  const times = hourlyTimes.slice(i0, i1).map(hourLabel);
  const temps = (hourly.temperature_2m || []).slice(i0, i1);
  const rain = (hourly.precipitation_probability || []).slice(i0, i1);
  const humidities = (hourly.relative_humidity_2m || []).slice(i0, i1);

  const currentTemp = Number(current.temperature_2m);
  const currentWind = Number(current.wind_speed_10m);
  const currentHumidity = Number(current.relative_humidity_2m);
  const fallbackHumidity = humidities.length ? humidities[0] : NaN;

  weatherEls.temp.textContent = Number.isFinite(currentTemp) ? `${currentTemp.toFixed(1)}°C` : "--.-°C";
  weatherEls.condition.textContent = weatherCodeMap[current.weather_code] || "Weather live";
  weatherEls.wind.textContent = Number.isFinite(currentWind) ? `${currentWind.toFixed(1)} km/h` : "--.- km/h";
  weatherEls.humidity.textContent = Number.isFinite(currentHumidity)
    ? `${Math.round(currentHumidity)}%`
    : Number.isFinite(fallbackHumidity)
      ? `${Math.round(fallbackHumidity)}%`
      : "--%";
  weatherEls.time.textContent = current.time ? `${hourLabel(current.time)} local` : "--:-- local";

  if (times.length >= 2 && temps.length >= 2 && rain.length >= 2) {
    const minTemp = Math.floor(Math.min(...temps) - 1);
    const maxTemp = Math.ceil(Math.max(...temps) + 1);
    drawLineChart(tempCanvas, temps, times, "°", minTemp, maxTemp);
    drawBarChart(rainCanvas, rain, times);
  } else {
    throw new Error("Insufficient hourly weather data");
  }
}

function showWeatherError() {
  weatherEls.temp.textContent = "--.-°C";
  weatherEls.wind.textContent = "--.- km/h";
  weatherEls.humidity.textContent = "--%";
  weatherEls.condition.textContent = "Unable to load live weather now";
  weatherEls.time.textContent = "Please refresh later";
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

