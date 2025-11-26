import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  fetchHoods,
  fetchChartData,
  setBenchmark,
  getBenchmark,
  computeEnergySaved,
  downloadReport
} from "../api";

import Toast from "../components/Toast";
import "chart.js/auto";
import "./dashboard.css";
import { MdCalendarMonth, MdSaveAlt, MdLogout } from "react-icons/md";
import { RiSave3Fill } from "react-icons/ri";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const HOTEL_ID = 1001;
  const KITCHEN_ID = 1;
  const MASTER_ID = 11;

  const [hoods, setHoods] = useState([]);
  const [selectedMid, setSelectedMid] = useState(MASTER_ID);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [chartData, setChartData] = useState(null);

  const [benchmark, setBenchmarkVal] = useState("");
  const [energySaved, setEnergySaved] = useState(null);
  const [duration, setDuration] = useState(0);
  const [energyConsumed, setEnergyConsumed] = useState(0);

  const [hasBenchmark, setHasBenchmark] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(message, type = "info") {
    setToast({ message, type });
  }

  useEffect(() => {
    loadHoods();
  }, [selectedDate]);

  useEffect(() => {
    loadChart();
    loadBenchmark();
  }, [selectedMid, selectedDate]);

  useEffect(() => {
    handleEnergySaved();
  }, [selectedMid, selectedDate]);

  async function loadHoods() {
    try {
      const res = await fetchHoods(HOTEL_ID, KITCHEN_ID, selectedDate);
      if (res && res.hoods?.length > 0) {
        const unique = Array.from(new Map(res.hoods.map(h => [h.id, h])).values());
        setHoods(unique);
        setSelectedMid(unique.find(h => h.id === MASTER_ID) ? MASTER_ID : unique[0].id);
      } else {
        setHoods([{ id: MASTER_ID }]);
        setSelectedMid(MASTER_ID);
      }
    } catch {
      showToast("Failed to load views", "error");
    }
  }

  // 🔥 UPDATED FUNCTION WITH EMPTY DATA FALLBACK
  async function loadChart() {
    try {
      const res = await fetchChartData(selectedMid, selectedDate);

      if (res.error) {
        showToast(res.error, "error");
        setChartData({
          x: [],
          exhaust: [],
          voltage: [],
          energy: [],
          temperature: [],
          smoke: [],
          damper: []
        });
      } else {
        setChartData(res);
      }

    } catch {
      showToast("Failed to load chart", "error");
      setChartData({
        x: [],
        exhaust: [],
        voltage: [],
        energy: [],
        temperature: [],
        smoke: [],
        damper: []
      });
    }
  }

  async function loadBenchmark() {
    try {
      const res = await getBenchmark(HOTEL_ID, KITCHEN_ID, selectedDate);
      if (res.benchmark) {
        setBenchmarkVal(String(res.benchmark.value_units_per_hour));
        setHasBenchmark(true);
      } else {
        setBenchmarkVal("");
        setHasBenchmark(false);
      }
    } catch {
      showToast("Failed to load benchmark", "error");
    }
  }

  async function handleSetBenchmark() {
    if (!benchmark || isNaN(parseFloat(benchmark))) {
      showToast("Please enter numeric value only (Units/Hour).", "error");
      return;
    }

    try {
      const res = await setBenchmark(HOTEL_ID, KITCHEN_ID, parseFloat(benchmark), selectedDate);
      if (res.error) showToast(res.error, "error");
      else {
        showToast("Benchmark saved successfully", "success");
        loadBenchmark();
      }
    } catch {
      showToast("Failed to save benchmark", "error");
    }
  }

  async function handleEnergySaved() {
    try {
      const res = await computeEnergySaved(HOTEL_ID, KITCHEN_ID, selectedMid, selectedDate);

      if (res.error) {
        showToast(res.error, "error");
        return;
      }

      setEnergySaved(res.energy_saved ?? 0);
      setDuration(res.duration_hours ?? 0);
      setEnergyConsumed(res.energy_consumed ?? 0);

    } catch {
      showToast("Failed to compute energy saved", "error");
    }
  }

  function formatLabel(mid) {
    if (mid === MASTER_ID) return "Central Control Unit";
    return `Hood Control Unit ${mid - 20}`;
  }

  function buildLineConfig(labels, data, label) {
    return {
      labels,
      datasets: [
        {
          label,
          data,
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0,
        },
      ],
    };
  }

  return (
    <div className="dash-container">

      <div className="logout-area">
        <button className="btn logout-btn glass" onClick={() => { localStorage.removeItem("token"); showToast("Logged out", "info"); navigate("/login"); }}>
          <MdLogout size={20} /> Logout
        </button>
      </div>

      <h1 className="dash-title">DEMAND CONTROLLED KITCHEN VENTILATION (DCKV)</h1>

      {/* CONTROL BAR */}
      <div className="top-bar glass">

        <div className="field-block">
          <label>Select View</label>
          <div className="select-box">
            <select value={selectedMid} onChange={(e) => setSelectedMid(Number(e.target.value))}>
              {hoods.map(h => (
                <option key={h.id} value={h.id}>{formatLabel(h.id)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-block">
          <label>Select Date</label>
          <div className="input-icon">
            <MdCalendarMonth size={20} />
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
        </div>

        <div className="field-block">
          <label>Benchmark (Units/hr)</label>
          <div className="benchmark-box">
            <input
              value={benchmark}
              onChange={(e) => setBenchmarkVal(e.target.value)}
              placeholder="Units/hr"
              style={{ backgroundColor: hasBenchmark ? "rgba(0,255,0,0.18)" : "white" }}
            />
            <button className="btn small-btn" onClick={handleSetBenchmark}>
              <RiSave3Fill size={20} />
            </button>
          </div>
        </div>

        <div className="download-section">
          <button className="btn primary" onClick={() => downloadReport(HOTEL_ID, KITCHEN_ID, selectedMid, selectedDate)}>
            <MdSaveAlt size={20} /> Download Report
          </button>
        </div>
      </div>


      {/* CHART GRID */}
      <div className="grid-layout">

        <div className="glass card">
          <h4>{selectedMid === MASTER_ID ? "Exhaust Speed" : "Temperature"}</h4>
          <Line
            data={buildLineConfig(
              chartData?.x || [],
              selectedMid === MASTER_ID ? chartData?.exhaust || [] : chartData?.temperature || [],
              selectedMid === MASTER_ID ? "Exhaust Speed (%)" : "Temperature (°C)"
            )}
          />
        </div>

        <div className="glass card">
          <h4>{selectedMid === MASTER_ID ? "Mains Voltage" : "Damper Position"}</h4>
          <Line
            data={buildLineConfig(
              chartData?.x || [],
              selectedMid === MASTER_ID ? chartData?.voltage || [] : chartData?.damper || [],
              selectedMid === MASTER_ID ? "Voltage (V)" : "Damper (%)"
            )}
          />
        </div>

        <div className="glass card">
          <h4>{selectedMid === MASTER_ID ? "Energy Consumption (kWh/hr)" : "Smoke"}</h4>
          <Line
            data={buildLineConfig(
              chartData?.x || [],
              selectedMid === MASTER_ID ? chartData?.energy || [] : chartData?.smoke || [],
              selectedMid === MASTER_ID ? "Energy (kWh)" : "Smoke"
            )}
          />
        </div>
      </div>

      {/* KPI ROW */}
      <div className="kpi-row">

        <div className="glass kpi-card">
          <h4>Duration</h4>
          <div className="kpi-value">{duration ? `${duration.toFixed(2)} hrs` : "—"}</div>
        </div>

        <div className="glass kpi-card">
          <h4>Energy Consumed</h4>
          <div className="kpi-value">{energyConsumed ? `${energyConsumed.toFixed(2)} kWh` : "—"}</div>
        </div>

        <div className="glass kpi-card">
          <h4>Energy Saved</h4>
          <div className="kpi-value">{energySaved ? `${energySaved.toFixed(2)} kWh` : "—"}</div>
        </div>

      </div>


      <footer className="footer glass">
        © All Rights Reserved — <a href="https://pinesphere.com/" target="_blank" rel="noopener noreferrer">Pinesphere</a>
      </footer>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}






// //////////////////////////// Before red dot thin line //////////////////////////////////////////////////////////


// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";

import {
  fetchHoods,
  fetchChartData,
  setBenchmark,
  getBenchmark,
  computeEnergySaved,
  downloadReport
} from "../api";

import Toast from "../components/Toast";
import "chart.js/auto";
import "./dashboard.css";
import { MdCalendarMonth, MdSaveAlt, MdLogout } from "react-icons/md";
import { RiSave3Fill } from "react-icons/ri";
import { useNavigate } from "react-router-dom";

// ⭐ ZOOM IMPORTS
import zoomPlugin from "chartjs-plugin-zoom";
import { Chart } from "chart.js";
Chart.register(zoomPlugin);

export default function Dashboard() {
  const navigate = useNavigate();

  const HOTEL_ID = 1001;
  const KITCHEN_ID = 1;
  const MASTER_ID = 11;

  const [hoods, setHoods] = useState([]);
  const [selectedMid, setSelectedMid] = useState(MASTER_ID);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [chartData, setChartData] = useState(null);

  const [benchmark, setBenchmarkVal] = useState("");
  const [energySaved, setEnergySaved] = useState(null);
  const [duration, setDuration] = useState(0);
  const [energyConsumed, setEnergyConsumed] = useState(0);

  const [hasBenchmark, setHasBenchmark] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(message, type = "info") {
    setToast({ message, type });
  }

  useEffect(() => {
    loadHoods();
  }, [selectedDate]);

  useEffect(() => {
    loadChart();
    loadBenchmark();
  }, [selectedMid, selectedDate]);

  useEffect(() => {
    handleEnergySaved();
  }, [selectedMid, selectedDate]);


  // -------------------------------------------------
  // Load Hoods
  // -------------------------------------------------
  async function loadHoods() {
    try {
      const res = await fetchHoods(HOTEL_ID, KITCHEN_ID, selectedDate);

      if (res && res.hoods?.length > 0) {
        const unique = Array.from(new Map(res.hoods.map(h => [h.id, h])).values());
        setHoods(unique);
        setSelectedMid(unique.find(h => h.id === MASTER_ID) ? MASTER_ID : unique[0].id);
      } else {
        setHoods([{ id: MASTER_ID }]);
        setSelectedMid(MASTER_ID);
      }

    } catch {
      showToast("Failed to load views", "error");
    }
  }


  // -------------------------------------------------
  // Load Chart – with fallback data
  // -------------------------------------------------
  async function loadChart() {
    try {
      const res = await fetchChartData(selectedMid, selectedDate);

      if (res.error) {
        showToast(res.error, "error");
        setChartData({ x: [], exhaust: [], voltage: [], energy: [], temperature: [], smoke: [], damper: [] });
      } else {
        setChartData(res);
      }

    } catch {
      showToast("Failed to load chart", "error");
      setChartData({ x: [], exhaust: [], voltage: [], energy: [], temperature: [], smoke: [], damper: [] });
    }
  }


  // -------------------------------------------------
  async function loadBenchmark() {
  try {
    const res = await getBenchmark(HOTEL_ID, KITCHEN_ID, selectedDate);

    if (res.found === true) {
      // Benchmark exists for this date → lock the field
      setBenchmarkVal(String(res.benchmark.value_units_per_hour));
      setHasBenchmark(true);  
    } 
    else if (res.carried === true) {
      // Carried forward → fill value but keep field editable
      setBenchmarkVal(String(res.benchmark.value_units_per_hour));
      setHasBenchmark(false); // 🔥 allow editing
    } 
    else {
      // No benchmark at all
      setBenchmarkVal("");
      setHasBenchmark(false);
    }

  } catch {
    showToast("Failed to load benchmark", "error");
  }
}



  // -------------------------------------------------
  async function handleSetBenchmark() {
    if (!benchmark || isNaN(parseFloat(benchmark))) {
      showToast("Please enter numeric value only (Units/Hour).", "error");
      return;
    }

    try {
      const res = await setBenchmark(HOTEL_ID, KITCHEN_ID, parseFloat(benchmark), selectedDate);

      if (res.error) showToast(res.error, "error");
      else {
        showToast("Benchmark saved successfully", "success");
        loadBenchmark();
      }

    } catch {
      showToast("Failed to save benchmark", "error");
    }
  }


  // -------------------------------------------------
  async function handleEnergySaved() {
  try {
    const res = await computeEnergySaved(HOTEL_ID, KITCHEN_ID, selectedMid, selectedDate);

    if (res.error) {
      showToast(res.error, "error");

      // 🔥 CLEAR KPI VALUES WHEN NO DATA
      setEnergySaved(null);
      setDuration(0);
      setEnergyConsumed(0);
      return;
    }

    setEnergySaved(res.energy_saved ?? 0);
    setDuration(res.duration_hours ?? 0);
    setEnergyConsumed(res.energy_consumed ?? 0);

  } catch {
    showToast("Failed to compute energy saved", "error");

    // 🔥 ALSO CLEAR ON FETCH FAILURE
    setEnergySaved(null);
    setDuration(0);
    setEnergyConsumed(0);
  }
}



  // -------------------------------------------------
  function formatLabel(mid) {
    if (mid === MASTER_ID) return "Central Control Unit";
    return `Hood Control Unit ${mid - 20}`;
  }


  // -------------------------------------------------
  // ZOOM OPTIONS
  // -------------------------------------------------
  const zoomOptions = {
    responsive: true,
    plugins: {
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          drag: { enabled: false },
          mode: "x",
        },
        pan: {
          enabled: true,
          mode: "x",
        },
        limits: {
          x: { min: 0 }
        }
      }
    },
    onDoubleClick: () => {},
  };


  function buildLineConfig(labels, data, label) {
  return {
    labels,
    datasets: [
      {
        label,
        data,
        borderWidth: 2,
        tension: 0.4,     // smoother curves
        pointRadius: 2,   // tiny dots
        pointHoverRadius: 4,
      },
    ],
  };
}



  // -------------------------------------------------
  return (
    <div className="dash-container">

      <div className="logout-area">
        <button
          className="btn logout-btn glass"
          onClick={() => {
            localStorage.removeItem("token");
            showToast("Logged out", "info");
            navigate("/login");
          }}
        >
          <MdLogout size={20} /> Logout
        </button>
      </div>

      <h1 className="dash-title">DEMAND CONTROLLED KITCHEN VENTILATION (DCKV)</h1>


      {/* ------------------------------------------- */}
      {/* CONTROL BAR */}
      {/* ------------------------------------------- */}
      <div className="top-bar glass">

        <div className="field-block">
          <label>Select View</label>
          <div className="select-box">
            <select value={selectedMid} onChange={(e) => setSelectedMid(Number(e.target.value))}>
              {hoods.map(h => (
                <option key={h.id} value={h.id}>{formatLabel(h.id)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-block">
          <label>Select Date</label>
          <div className="input-icon">
            <MdCalendarMonth size={20} />
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
        </div>

        <div className="field-block">
          <label>Benchmark (Units/hr)</label>
          <div className="benchmark-box">
            <input
              value={benchmark}
              onChange={(e) => setBenchmarkVal(e.target.value)}
              placeholder="Units/hr"
              disabled={hasBenchmark}   // 🔥 MAKE INPUT NON-CLICKABLE
              style={{
                backgroundColor: hasBenchmark ? "rgba(0,255,0,0.18)" : "white",
                cursor: hasBenchmark ? "not-allowed" : "text",
                transition: "0.3s",
              }}
            />
            <button
            className="btn small-btn"
            onClick={handleSetBenchmark}
            disabled={hasBenchmark}          // 🔥 DISABLE SAVE
            style={{
              opacity: hasBenchmark ? 0.5 : 1,
              cursor: hasBenchmark ? "not-allowed" : "pointer",
            }}
          >
            <RiSave3Fill size={20} />
          </button>

          </div>
        </div>

        <div className="download-section">
          <button className="btn primary" onClick={() => downloadReport(HOTEL_ID, KITCHEN_ID, selectedMid, selectedDate)}>
            <MdSaveAlt size={20} /> Download Report
          </button>
        </div>

      </div>



      {/* ------------------------------------------- */}
      {/* CHART GRID */}
      {/* ------------------------------------------- */}
      <div className="grid-layout">

        {/* Chart 1 */}
        <div className="glass card">
          <h4>{selectedMid === MASTER_ID ? "Exhaust Speed" : "Temperature"}</h4>
          <Line
            options={zoomOptions}
            data={buildLineConfig(
              chartData?.x || [],
              selectedMid === MASTER_ID ? chartData?.exhaust || [] : chartData?.temperature || [],
              selectedMid === MASTER_ID ? "Exhaust Speed (%)" : "Temperature (°C)"
            )}
          />
        </div>

        {/* Chart 2 */}
        <div className="glass card">
          <h4>{selectedMid === MASTER_ID ? "Mains Voltage" : "Damper Position"}</h4>
          <Line
            options={zoomOptions}
            data={buildLineConfig(
              chartData?.x || [],
              selectedMid === MASTER_ID ? chartData?.voltage || [] : chartData?.damper || [],
              selectedMid === MASTER_ID ? "Voltage (V)" : "Damper (%)"
            )}
          />
        </div>

        {/* Chart 3 */}
        <div className="glass card">
          <h4>{selectedMid === MASTER_ID ? "Energy Consumption (kWh/hr)" : "Smoke"}</h4>
          <Line
            options={zoomOptions}
            data={buildLineConfig(
              chartData?.x || [],
              selectedMid === MASTER_ID ? chartData?.energy || [] : chartData?.smoke || [],
              selectedMid === MASTER_ID ? "Energy (kWh)" : "Smoke"
            )}
          />
        </div>

      </div>



      {/* ------------------------------------------- */}
      {/* KPI SECTION */}
      {/* ------------------------------------------- */}
      <div className="kpi-row">

        <div className="glass kpi-card">
          <h4>Duration</h4>
          <div className="kpi-value">{duration ? `${duration.toFixed(2)} hrs` : "—"}</div>
        </div>

        <div className="glass kpi-card">
          <h4>Energy Consumed</h4>
          <div className="kpi-value">{energyConsumed ? `${energyConsumed.toFixed(2)} kWh` : "—"}</div>
        </div>

        <div className="glass kpi-card">
          <h4>Energy Saved</h4>
          <div className="kpi-value">{energySaved ? `${energySaved.toFixed(2)} kWh` : "—"}</div>
        </div>

      </div>



      {/* FOOTER */}
      <footer className="footer glass">
        © All Rights Reserved — 
        <a href="https://pinesphere.com/" target="_blank" rel="noopener noreferrer"> &nbsp;Pinesphere</a>
      </footer>


      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}










// ///////////////////////// red dot thin line //////////////////////////////////////////////////////////


// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";

import {
  fetchHoods,
  fetchChartData,
  setBenchmark,
  getBenchmark,
  computeEnergySaved,
  downloadReport
} from "../api";

import Toast from "../components/Toast";
import "chart.js/auto";
import "./dashboard.css";
import { MdCalendarMonth, MdSaveAlt, MdLogout } from "react-icons/md";
import { RiSave3Fill } from "react-icons/ri";
import { useNavigate } from "react-router-dom";

// ZOOM
import zoomPlugin from "chartjs-plugin-zoom";
import { Chart } from "chart.js";
Chart.register(zoomPlugin);

export default function Dashboard() {
  const navigate = useNavigate();

  const HOTEL_ID = 1001;
  const KITCHEN_ID = 1;
  const MASTER_ID = 11;

  const [hoods, setHoods] = useState([]);
  const [selectedMid, setSelectedMid] = useState(MASTER_ID);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [chartData, setChartData] = useState(null);

  const [benchmark, setBenchmarkVal] = useState("");
  const [energySaved, setEnergySaved] = useState(null);
  const [duration, setDuration] = useState(0);
  const [energyConsumed, setEnergyConsumed] = useState(0);

  const [hasBenchmark, setHasBenchmark] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(message, type = "info") {
    setToast({ message, type });
  }

  useEffect(() => {
    loadHoods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    loadChart();
    loadBenchmark();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMid, selectedDate]);

  useEffect(() => {
    handleEnergySaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMid, selectedDate]);

  // -------------------------------------------
  // Load Hoods
  // -------------------------------------------
  async function loadHoods() {
    try {
      const res = await fetchHoods(HOTEL_ID, KITCHEN_ID, selectedDate);

      if (res && res.hoods?.length > 0) {
        const unique = Array.from(new Map(res.hoods.map(h => [h.id, h])).values());
        setHoods(unique);
        setSelectedMid(unique.find(h => h.id === MASTER_ID) ? MASTER_ID : unique[0].id);
      } else {
        setHoods([{ id: MASTER_ID }]);
        setSelectedMid(MASTER_ID);
      }
    } catch {
      showToast("Failed to load views", "error");
    }
  }

  // -------------------------------------------
  // Load Chart
  // -------------------------------------------
  async function loadChart() {
    try {
      const res = await fetchChartData(selectedMid, selectedDate);

      if (res.error) {
        showToast(res.error, "error");
        setChartData({ x: [], exhaust: [], voltage: [], energy: [], temperature: [], smoke: [], damper: [] });
      } else {
        // ensure arrays exist
        setChartData({
          x: Array.isArray(res.x) ? res.x : [],
          exhaust: Array.isArray(res.exhaust) ? res.exhaust : [],
          voltage: Array.isArray(res.voltage) ? res.voltage : [],
          energy: Array.isArray(res.energy) ? res.energy : [],
          temperature: Array.isArray(res.temperature) ? res.temperature : [],
          smoke: Array.isArray(res.smoke) ? res.smoke : [],
          damper: Array.isArray(res.damper) ? res.damper : []
        });
      }
    } catch {
      showToast("Failed to load chart", "error");
      setChartData({ x: [], exhaust: [], voltage: [], energy: [], temperature: [], smoke: [], damper: [] });
    }
  }

  // -------------------------------------------
  // Benchmark Load + Lock Logic
  // -------------------------------------------
  async function loadBenchmark() {
    try {
      const res = await getBenchmark(HOTEL_ID, KITCHEN_ID, selectedDate);

      if (res.found === true) {
        setBenchmarkVal(String(res.benchmark.value_units_per_hour));
        setHasBenchmark(true); // lock field
      } else if (res.carried === true) {
        setBenchmarkVal(String(res.benchmark.value_units_per_hour));
        setHasBenchmark(false); // allow editing when carried
      } else {
        setBenchmarkVal("");
        setHasBenchmark(false);
      }
    } catch {
      showToast("Failed to load benchmark", "error");
    }
  }

  // -------------------------------------------
  // Save Benchmark
  // -------------------------------------------
  async function handleSetBenchmark() {
    if (!benchmark || isNaN(parseFloat(benchmark))) {
      showToast("Please enter numeric value only (Units/Hour).", "error");
      return;
    }

    try {
      const res = await setBenchmark(HOTEL_ID, KITCHEN_ID, parseFloat(benchmark), selectedDate);

      if (res.error) showToast(res.error, "error");
      else {
        showToast("Benchmark saved successfully", "success");
        loadBenchmark();
      }
    } catch {
      showToast("Failed to save benchmark", "error");
    }
  }

  // -------------------------------------------
  // KPI → Energy Saved
  // -------------------------------------------
  async function handleEnergySaved() {
    try {
      const res = await computeEnergySaved(HOTEL_ID, KITCHEN_ID, selectedMid, selectedDate);

      if (res.error) {
        showToast(res.error, "error");
        setEnergySaved(null);
        setDuration(0);
        setEnergyConsumed(0);
        return;
      }

      setEnergySaved(res.energy_saved ?? 0);
      setDuration(res.duration_hours ?? 0);
      setEnergyConsumed(res.energy_consumed ?? 0);
    } catch {
      showToast("Failed to compute energy saved", "error");
      setEnergySaved(null);
      setDuration(0);
      setEnergyConsumed(0);
    }
  }

  // -----------------------------------------------------------------
  // Chart OPTIONS (Option A — Same Style For All Charts)
  // -----------------------------------------------------------------
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: "#444", maxRotation: 45, autoSkip: true, maxTicksLimit: 24 },
        grid: { color: "#eaeaea" }
      },
      y: {
        ticks: { color: "#444" },
        grid: { color: "#eaeaea" }
      }
    },
    elements: {
      point: {
        radius: 3,
        backgroundColor: "#ff4d4d",
        borderColor: "#fff",
        borderWidth: 1
      },
      line: {
        borderWidth: 1.25,
        borderColor: "#3b82f6",
        tension: 0.35,
        fill: false
      }
    },
    plugins: {
      legend: {
        labels: { color: "#333", boxWidth: 20 }
      },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "x"
        },
        pan: {
          enabled: true,
          mode: "x"
        }
      }
    }
  };

  // -----------------------------------------------------------------
  // helpers to build datasets — we add dataset-level visual props so
  // every chart has consistent thinner lines & colored dots
  // -----------------------------------------------------------------
  function buildLineConfig(labels, data, label, datasetColor = "#3b82f6", pointColor = "#ff4d4d") {
    // Ensure labels/data lengths match — Chart.js handles mismatched lengths but we try to be tidy
    const safeLabels = Array.isArray(labels) ? labels : [];
    const safeData = Array.isArray(data) ? data : [];

    return {
      labels: safeLabels,
      datasets: [
        {
          label,
          data: safeData,
          borderColor: datasetColor,
          backgroundColor: datasetColor,
          pointBackgroundColor: pointColor,
          pointBorderColor: "#ffffff",
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 1.25,
          tension: 0.35,
          fill: false
        }
      ]
    };
  }

  function formatLabel(mid) {
    if (mid === MASTER_ID) return "Central Control Unit";
    return `Hood Control Unit ${mid - 20}`;
  }

  // -----------------------------------------------------------------
  // RENDER UI
  // -----------------------------------------------------------------
  return (
    <div className="dash-container">
      <div className="logout-area">
        <button
          className="btn logout-btn glass"
          onClick={() => {
            localStorage.removeItem("token");
            showToast("Logged out", "info");
            navigate("/login");
          }}
        >
          <MdLogout size={20} /> Logout
        </button>
      </div>

      <h1 className="dash-title">DEMAND CONTROLLED KITCHEN VENTILATION (DCKV)</h1>

      {/* TOP BAR */}
      <div className="top-bar glass">
        <div className="field-block">
          <label>Select View</label>
          <div className="select-box">
            <select value={selectedMid} onChange={(e) => setSelectedMid(Number(e.target.value))}>
              {hoods.map(h => (
                <option key={h.id} value={h.id}>
                  {formatLabel(h.id)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-block">
          <label>Select Date</label>
          <div className="input-icon">
            <MdCalendarMonth size={20} />
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
        </div>

        <div className="field-block">
          <label>Benchmark (Units/hr)</label>
          <div className="benchmark-box">
            <input
              value={benchmark}
              onChange={(e) => setBenchmarkVal(e.target.value)}
              placeholder="Units/hr"
              disabled={hasBenchmark}
              style={{
                backgroundColor: hasBenchmark ? "rgba(0,255,0,0.18)" : "white",
                cursor: hasBenchmark ? "not-allowed" : "text"
              }}
            />
            <button
              className="btn small-btn"
              onClick={handleSetBenchmark}
              disabled={hasBenchmark}
              style={{
                opacity: hasBenchmark ? 0.5 : 1,
                cursor: hasBenchmark ? "not-allowed" : "pointer"
              }}
            >
              <RiSave3Fill size={20} />
            </button>
          </div>
        </div>

        <div className="download-section">
          <button className="btn primary" onClick={() => downloadReport(HOTEL_ID, KITCHEN_ID, selectedMid, selectedDate)}>
            <MdSaveAlt size={20} /> Download Report
          </button>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid-layout">
        <div className="glass card">
          <h4>{selectedMid === MASTER_ID ? "Exhaust Speed" : "Temperature"}</h4>
          <div style={{ height: 320 }}>
            <Line
              options={chartOptions}
              data={buildLineConfig(
                chartData?.x || [],
                selectedMid === MASTER_ID ? chartData?.exhaust || [] : chartData?.temperature || [],
                selectedMid === MASTER_ID ? "Exhaust Speed (%)" : "Temperature (°C)",
                "#2b9cff", // line color
                "#ff4d4d"  // dot color (same tone)
              )}
            />
          </div>
        </div>

        <div className="glass card">
          <h4>{selectedMid === MASTER_ID ? "Mains Voltage" : "Damper Position"}</h4>
          <div style={{ height: 320 }}>
            <Line
              options={chartOptions}
              data={buildLineConfig(
                chartData?.x || [],
                selectedMid === MASTER_ID ? chartData?.voltage || [] : chartData?.damper || [],
                selectedMid === MASTER_ID ? "Voltage (V)" : "Damper (%)",
                "#2b9cff",
                "#ff4d4d"
              )}
            />
          </div>
        </div>

        <div className="glass card">
          <h4>{selectedMid === MASTER_ID ? "Energy Consumption (kWh/hr)" : "Smoke"}</h4>
          <div style={{ height: 320 }}>
            <Line
              options={chartOptions}
              data={buildLineConfig(
                chartData?.x || [],
                selectedMid === MASTER_ID ? chartData?.energy || [] : chartData?.smoke || [],
                selectedMid === MASTER_ID ? "Energy (kWh)" : "Smoke",
                "#2b9cff",
                "#ff4d4d"
              )}
            />
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="kpi-row">
        <div className="glass kpi-card">
          <h4>Duration</h4>
          <div className="kpi-value">{duration ? `${duration.toFixed(2)} hrs` : "—"}</div>
        </div>

        <div className="glass kpi-card">
          <h4>Energy Consumed</h4>
          <div className="kpi-value">{energyConsumed ? `${energyConsumed.toFixed(2)} kWh` : "—"}</div>
        </div>

        <div className="glass kpi-card">
          <h4>Energy Saved</h4>
          <div className="kpi-value">{energySaved ? `${energySaved.toFixed(2)} kWh` : "—"}</div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer glass">
        © All Rights Reserved — <a href="https://pinesphere.com/" target="_blank" rel="noopener noreferrer">Pinesphere</a>
      </footer>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
