const API_BASE = "http://127.0.0.1:8000/api";

export async function loginUser(username, password) {
  const res = await fetch(`${API_BASE}/login/`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({username, password})
  });
  return res.json();
}

export async function fetchHoods(hotel_id=1001, kitchen_id=1) {
  const res = await fetch(`${API_BASE}/hoods/?hotel_id=${hotel_id}&kitchen_id=${kitchen_id}`);
  return res.json();
}

export async function fetchChartData(mid_hid, dateStr) {
  const res = await fetch(`${API_BASE}/chart-data/?mid_hid=${mid_hid}&date=${dateStr}`);
  return res.json();
}

export async function setBenchmark(hotel_id, kitchen_id, value, dateStr) {
  const res = await fetch(`${API_BASE}/set-benchmark/`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({hotel_id, kitchen_id, value, date: dateStr})
  });
  return res.json();
}

export async function getBenchmark(hotel_id, kitchen_id, dateStr) {
  const res = await fetch(`${API_BASE}/get-benchmark/?hotel_id=${hotel_id}&kitchen_id=${kitchen_id}&date=${dateStr}`);
  return res.json();
}

export async function computeEnergySaved(hotel_id, kitchen_id, mid_hid, dateStr) {
  const res = await fetch(`${API_BASE}/energy-saved/?hotel_id=${hotel_id}&kitchen_id=${kitchen_id}&mid_hid=${mid_hid}&date=${dateStr}`);
  return res.json();
}

export async function downloadReport(hotel_id, kitchen_id, mid_hid, dateStr) {
  window.location = `${API_BASE}/download-report/?hotel_id=${hotel_id}&kitchen_id=${kitchen_id}&mid_hid=${mid_hid}&date=${dateStr}`;
}



