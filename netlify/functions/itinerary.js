const fs = require('fs');
const path = require('path');

function getPlanData() {
  // Look in src/data/place_data/plan.json
  const planPath = path.resolve(__dirname, '../../src/data/place_data/plan.json');
  if (!fs.existsSync(planPath)) {
    throw new Error(`plan.json not found at ${planPath}`);
  }
  const raw = fs.readFileSync(planPath, 'utf8');
  return JSON.parse(raw);
}

function getPlaceData() {
  const placePath = path.resolve(__dirname, '../../src/data/place_data/place.json');
  if (fs.existsSync(placePath)) {
    const raw = fs.readFileSync(placePath, 'utf8');
    return JSON.parse(raw);
  }
  return null;
}

/**
 * Parse date from key like "plan_2/5/70"
 * Returns: { dateCE: "2027-05-02", dateBE: "02/05/2570", day: 2, month: 5, yearBE: 2570 }
 */
function parsePlanDateKey(key) {
  // key format: plan_D/M/YY or plan_DD/MM/YY where YY=70 -> 2570 BE -> 2027 CE
  const match = key.match(/plan_(\d+)\/(\d+)\/(\d+)/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  let yearTwoDigits = parseInt(match[3], 10);
  const yearBE = 2500 + yearTwoDigits; // 70 -> 2570
  const yearCE = yearBE - 543; // 2570 - 543 = 2027

  const pad = (n) => String(n).padStart(2, '0');
  const dateCE = `${yearCE}-${pad(month)}-${pad(day)}`;
  const dateBE = `${pad(day)}/${pad(month)}/${yearBE}`;

  return { dateCE, dateBE, day, month, yearBE, yearCE };
}

/**
 * Standardize activity item supporting both 'place_name' and 'name'
 */
function standardizeActivity(item, index) {
  const placeName = item.place_name || item.name || 'ไม่ระบุชื่อสถานที่';
  return {
    id: `act_${index}_${Math.abs(Math.sin(index)).toString(36).substring(2, 7)}`,
    place_name: placeName,
    name: placeName,
    time_begin: item.time_begin || '',
    time_end: item.time_end || '',
    mapUrl: item.mapUrl || '',
    lat: typeof item.lat === 'number' ? item.lat : null,
    lng: typeof item.lng === 'number' ? item.lng : null,
    note: item.note || '',
    price: item.price || ''
  };
}

/**
 * Get formatted itinerary list
 */
function getItinerary() {
  const planJson = getPlanData();
  const days = [];

  let dayIndex = 1;
  for (const [key, dayArr] of Object.entries(planJson)) {
    const dateInfo = parsePlanDateKey(key);
    const dayItem = dayArr[0] || {};
    const title = dayItem.title || `วันที่ ${dayIndex}`;

    // Collect all activities from activities_1, activities_2, etc.
    const activities = [];
    let actIndex = 1;
    for (const [subKey, val] of Object.entries(dayItem)) {
      if (subKey.startsWith('activities_') && Array.isArray(val)) {
        val.forEach(item => {
          activities.push(standardizeActivity(item, actIndex++));
        });
      }
    }

    days.push({
      key,
      dayIndex,
      dateInfo,
      title,
      activities
    });

    dayIndex++;
  }

  return days;
}

/**
 * Get distinct places categorized for Places section
 */
function getPlaces() {
  const itinerary = getItinerary();
  const placesMap = new Map();

  itinerary.forEach(day => {
    day.activities.forEach(act => {
      const name = act.name.trim();
      if (!placesMap.has(name)) {
        // Determine category from place context
        let category = 'attraction'; // default
        let image = null;

        if (name.includes('ชลิตา') || name.includes('กู๊ดวิว') || name.includes('ที่พัก') || name.includes('โรงแรม')) {
          category = 'accommodation';
          image = '/data/pic/hotel.jpeg';
        } else if (name.includes('ร้าน') || name.includes('อาหาร') || name.includes('กาแฟ') || name.includes('คาเฟ่')) {
          category = 'restaurant';
        } else if (name.includes('เกาะล้าน')) {
          category = 'attraction';
          image = '/data/pic/kholan.jpeg';
        } else if (name.includes('ท่าเรือ') || name.includes('บขส') || name.includes('หมอชิต') || name.includes('407')) {
          category = 'transit';
        }

        placesMap.set(name, {
          name,
          category,
          image,
          mapUrl: act.mapUrl,
          lat: act.lat,
          lng: act.lng,
          note: act.note,
          price: act.price,
          daysAppearing: [day.dayIndex]
        });
      } else {
        const existing = placesMap.get(name);
        if (!existing.daysAppearing.includes(day.dayIndex)) {
          existing.daysAppearing.push(day.dayIndex);
        }
      }
    });
  });

  return Array.from(placesMap.values());
}

module.exports = {
  getItinerary,
  getPlaces,
  parsePlanDateKey
};
