const https = require('https');

// WMO Weather interpretation codes
const WEATHER_CODES = {
  0: { label: 'ท้องฟ้าแจ่มใส', icon: 'sun' },
  1: { label: 'ท้องฟ้าโปร่งเป็นส่วนใหญ่', icon: 'sun-medium' },
  2: { label: 'มีเมฆบางส่วน', icon: 'cloud-sun' },
  3: { label: 'มีเมฆมาก', icon: 'cloud' },
  45: { label: 'มีหมอก', icon: 'cloud-fog' },
  48: { label: 'มีหมอกน้ำค้างแข็ง', icon: 'cloud-fog' },
  51: { label: 'ละอองฝนเบาบาง', icon: 'cloud-drizzle' },
  53: { label: 'ละอองฝนปานกลาง', icon: 'cloud-drizzle' },
  55: { label: 'ละอองฝนหนาแน่น', icon: 'cloud-drizzle' },
  61: { label: 'ฝนตกเล็กน้อย', icon: 'cloud-rain' },
  63: { label: 'ฝนตกปานกลาง', icon: 'cloud-rain' },
  65: { label: 'ฝนตกหนัก', icon: 'cloud-rain' },
  80: { label: 'ฝนซู่เล็กน้อย', icon: 'cloud-rain' },
  81: { label: 'ฝนซู่ปานกลาง', icon: 'cloud-rain' },
  82: { label: 'ฝนซู่รุนแรง', icon: 'cloud-lightning' },
  95: { label: 'พายุฝนฟ้าคะนอง', icon: 'cloud-lightning' }
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch forecast for coordinates
 */
async function getForecast(lat = 12.92297, lng = 100.78881, targetDate = null) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FBangkok&forecast_days=14`;

  try {
    const data = await fetchJson(url);
    if (!data.daily) {
      return { ok: false, error: 'ไม่สามารถดึงข้อมูลพยากรณ์อากาศได้' };
    }

    const daily = data.daily;
    const forecasts = daily.time.map((dateStr, idx) => {
      const code = daily.weathercode[idx];
      const info = WEATHER_CODES[code] || { label: 'สภาพอากาศปกติ', icon: 'cloud-sun' };
      return {
        date: dateStr,
        tempMax: daily.temperature_2m_max[idx],
        tempMin: daily.temperature_2m_min[idx],
        precipSum: daily.precipitation_sum[idx],
        precipProb: daily.precipitation_probability_max[idx],
        weatherCode: code,
        condition: info.label,
        icon: info.icon
      };
    });

    let targetForecast = null;
    let isOutsideHorizon = false;

    if (targetDate) {
      targetForecast = forecasts.find(f => f.date === targetDate);
      if (!targetForecast) {
        isOutsideHorizon = true;
      }
    }

    return {
      ok: true,
      provider: 'Open-Meteo',
      location: { lat, lng },
      currentDays: forecasts,
      targetDate,
      targetForecast: targetForecast || null,
      isOutsideHorizon,
      horizonMessage: isOutsideHorizon
        ? 'วันเดินทางอยู่นอกช่วงพยากรณ์ล่วงหน้า (Open-Meteo รองรับพยากรณ์ล่วงหน้าสูงสุด 14-16 วัน)'
        : null
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getForecast,
  WEATHER_CODES
};
