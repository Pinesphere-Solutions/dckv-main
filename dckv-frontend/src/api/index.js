
// const API_BASE = "/api";

// export async function loginUser(username, password) {
//   const res = await fetch(`${API_BASE}/login/`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ username, password }),
//   });
//   return res.json();
// }

// export async function fetchHoods(hotel_id = 1001, kitchen_id = 1) {
//   const res = await fetch(
//     `${API_BASE}/hoods/?hotel_id=${hotel_id}&kitchen_id=${kitchen_id}`
//   );
//   return res.json();
// }

// export async function fetchChartData(mid_hid, dateStr) {
//   const res = await fetch(
//     `${API_BASE}/chart-data/?mid_hid=${mid_hid}&date=${dateStr}`
//   );
//   return res.json();
// }

// export async function setBenchmark(hotel_id, kitchen_id, value, dateStr) {
//   const res = await fetch(`${API_BASE}/set-benchmark/`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ hotel_id, kitchen_id, value, date: dateStr }),
//   });
//   return res.json();
// }

// export async function getBenchmark(hotel_id, kitchen_id, dateStr) {
//   const res = await fetch(
//     `${API_BASE}/get-benchmark/?hotel_id=${hotel_id}&kitchen_id=${kitchen_id}&date=${dateStr}`
//   );
//   return res.json();
// }

// export async function computeEnergySaved(
//   hotel_id,
//   kitchen_id,
//   mid_hid,
//   dateStr
// ) {
//   const res = await fetch(
//     `${API_BASE}/energy-saved/?hotel_id=${hotel_id}&kitchen_id=${kitchen_id}&mid_hid=${mid_hid}&date=${dateStr}`
//   );
//   return res.json();
// }

// export function downloadReport(
//   hotel_id,
//   kitchen_id,
//   mid_hid,
//   dateStr
// ) {
//   const url = `http://127.0.0.1:8000/api/download-report/?hotel_id=${hotel_id}&kitchen_id=${kitchen_id}&mid_hid=${mid_hid}&date=${dateStr}`;

//   window.open(url, "_blank");
// }


const API_BASE = process.env.REACT_APP_API_BASE;

/* ---------- LOGIN ---------- */
export async function loginUser(username, password) {
  const res = await fetch(`${API_BASE}/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

/* ---------- HOODS ---------- */
export async function fetchHoods(hotel_id, kitchen_id, dateStr) {
  const res = await fetch(
    `${API_BASE}/hoods/?hotel_id=${hotel_id}&kitchen_id=${kitchen_id}&date=${dateStr}`
  );
  return res.json();
}

/* ---------- CHART DATA ---------- */
export async function fetchChartData(mid_hid, dateStr) {
  const res = await fetch(
    `${API_BASE}/chart-data/?mid_hid=${mid_hid}&date=${dateStr}`
  );
  return res.json();
}

/* ---------- BENCHMARK ---------- */
export async function setBenchmark(hotel_id, kitchen_id, value, dateStr) {
  const res = await fetch(`${API_BASE}/set-benchmark/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hotel_id, kitchen_id, value, date: dateStr }),
  });
  return res.json();
}

export async function getBenchmark(hotel_id, kitchen_id, dateStr) {
  const res = await fetch(
    `${API_BASE}/get-benchmark/?hotel_id=${hotel_id}&kitchen_id=${kitchen_id}&date=${dateStr}`
  );
  return res.json();
}

/* ---------- ENERGY SAVED ---------- */
export async function computeEnergySaved(
  hotel_id,
  kitchen_id,
  mid_hid,
  dateStr
) {
  const res = await fetch(
    `${API_BASE}/energy-saved/?hotel_id=${hotel_id}&kitchen_id=${kitchen_id}&mid_hid=${mid_hid}&date=${dateStr}`
  );
  return res.json();
}

/* ---------- DOWNLOAD REPORT ---------- */
// export function downloadReport(
//   hotel_id,
//   kitchen_id,
//   mid_hid,
//   dateStr
// ) {
//   const url = `${API_BASE}/download-report/?hotel_id=${hotel_id}&kitchen_id=${kitchen_id}&mid_hid=${mid_hid}&date=${dateStr}`;
//   window.open(url, "_blank");
// }




/* ---------- DOWNLOAD REPORT ---------- */
export async function downloadReport(
  hotel_id,
  kitchen_id,
  mid_hid,
  dateStr
) {
  const url = `${API_BASE}/download-report/?hotel_id=${hotel_id}&kitchen_id=${kitchen_id}&mid_hid=${mid_hid}&date=${dateStr}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-cache', // Disable cache
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `report_${mid_hid}_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Download error:', error);
    alert('Failed to download report');
  }
}