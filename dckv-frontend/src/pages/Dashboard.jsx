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
import "chart.js/auto";
import "./dashboard.css";
import { MdCalendarMonth, MdSaveAlt, MdLogout } from "react-icons/md";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  // 🔧 IMPORTANT: make sure these match your data in DB
  const HOTEL_ID = 1001; // if your client sample uses 1, change this to 1 while testing
  const KITCHEN_ID = 1;
  const MASTER_ID = 11;

  const [hoods, setHoods] = useState([]);
  const [selectedMid, setSelectedMid] = useState(MASTER_ID);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [chartData, setChartData] = useState(null);

  // KPI States
  const [benchmark, setBenchmarkVal] = useState("");
  const [benchmarkInfo, setBenchmarkInfo] = useState(null);

  const [energySaved, setEnergySaved] = useState(null);
  const [duration, setDuration] = useState(0);
  const [energyConsumed, setEnergyConsumed] = useState(0);

  const [error, setError] = useState("");

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Load hoods whenever date changes (so dropdown reflects actual data for that date)
  useEffect(() => {
    loadHoods();
  }, [selectedDate]);

  // Load charts + benchmark whenever view/date changes
  useEffect(() => {
    loadChart();
    loadBenchmark();
  }, [selectedMid, selectedDate]);

  // Also recompute KPIs when view/date changes
  useEffect(() => {
    handleEnergySaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMid, selectedDate]);

  // 🔹 Load hood list for current date
  async function loadHoods() {
    try {
      // !! make sure fetchHoods(hotelId, kitchenId, date) is implemented in api.js
      const res = await fetchHoods(HOTEL_ID, KITCHEN_ID, selectedDate);

      if (res && res.hoods && res.hoods.length > 0) {
        // remove duplicates if any
        const unique = Array.from(
          new Map(res.hoods.map((h) => [h.id, h])).values()
        );

        setHoods(unique);

        // prefer Master if present
        const master = unique.find((h) => h.id === MASTER_ID);
        if (master) {
          setSelectedMid(MASTER_ID);
        } else {
          setSelectedMid(unique[0].id);
        }
      } else {
        // no data for this date → still show Master as fallback
        const fallback = [{ id: MASTER_ID, label: "Master" }];
        setHoods(fallback);
        setSelectedMid(MASTER_ID);
      }
    } catch (err) {
      console.error("Error loading hoods:", err);
      setError("Failed to load views");
      // still show Master as fallback
      const fallback = [{ id: MASTER_ID, label: "Master" }];
      setHoods(fallback);
      setSelectedMid(MASTER_ID);
    }
  }

  async function loadChart() {
    try {
      const res = await fetchChartData(selectedMid, selectedDate);
      setChartData(res);
    } catch (err) {
      console.error("Error loading chart:", err);
      setChartData(null);
    }
  }

  async function loadBenchmark() {
    try {
      const res = await getBenchmark(HOTEL_ID, KITCHEN_ID, selectedDate);
      setBenchmarkInfo(res);
      if (res && res.benchmark) {
        setBenchmarkVal(String(res.benchmark.value_units_per_hour));
      } else if (!res || !res.benchmark) {
        setBenchmarkVal("");
      }
    } catch (err) {
      console.error("Error loading benchmark:", err);
    }
  }

  async function handleSetBenchmark() {
    setError("");
    if (!benchmark || isNaN(parseFloat(benchmark))) {
      setError("Please enter numeric value only (Units/Hour).");
      return;
    }

    try {
      const res = await setBenchmark(
        HOTEL_ID,
        KITCHEN_ID,
        parseFloat(benchmark),
        selectedDate
      );
      if (res.error) {
        setError(res.error);
      } else {
        alert(res.message || "Benchmark saved");
        loadBenchmark();
      }
    } catch (err) {
      console.error("Error saving benchmark:", err);
      setError("Failed to save benchmark");
    }
  }

  // 🔹 ENERGY SAVED + KPI UPDATE
  async function handleEnergySaved() {
    try {
      const res = await computeEnergySaved(
        HOTEL_ID,
        KITCHEN_ID,
        selectedMid,
        selectedDate
      );

      if (res.error) {
        setError(res.error);
        setEnergySaved(null);
        setDuration(0);
        setEnergyConsumed(0);
        return;
      }

      // backend should return: energy_saved, hours_covered (or duration_hours), actual_energy_total
      setEnergySaved(res.energy_saved ?? 0);
      setDuration(res.duration_hours ?? res.hours_covered ?? 0);
      setEnergyConsumed(res.actual_energy_total ?? 0);
    } catch (err) {
      console.error("Error computing energy saved:", err);
      setError("Failed to compute energy saved");
      setEnergySaved(null);
      setDuration(0);
      setEnergyConsumed(0);
    }
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
      {/* LOGOUT BUTTON */}
      <div className="logout-area">
        <button className="btn logout-btn glass" onClick={handleLogout}>
          <MdLogout size={20} /> Logout
        </button>
      </div>

      <h1 className="dash-title">DEMAND CONTROLLED KITCHEN VENTILATION (DCKV)</h1>

      {/* CONTROL BAR */}
      <div className="top-bar glass">
        <div className="field-block">
          <label>View</label>
          <div className="select-box">
            <select
              value={selectedMid}
              onChange={(e) => setSelectedMid(Number(e.target.value))}
            >
              {hoods.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-block">
          <label>Date</label>
          <div className="input-icon">
            <MdCalendarMonth size={20} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <div className="field-block">
          <label>Benchmark (Units/hr)</label>
          <div className="benchmark-box">
            <input
              value={benchmark}
              onChange={(e) => setBenchmarkVal(e.target.value)}
              placeholder="Units/hr"
            />
            <button className="btn small-btn" onClick={handleSetBenchmark}>
              <MdSaveAlt size={20} />
            </button>
          </div>
        </div>

        <div className="download-section">
          <button
            className="btn primary"
            onClick={() =>
              downloadReport(HOTEL_ID, KITCHEN_ID, selectedMid, selectedDate)
            }
          >
            <MdSaveAlt size={20} /> Download
          </button>
        </div>
      </div>

      {/* CHART GRID */}
      <div className="grid-layout">
        <div className="glass card">
          <h4>{selectedMid === MASTER_ID ? "Exhaust Speed" : "Temperature"}</h4>
          {chartData && (
            <Line
              data={buildLineConfig(
                chartData.x,
                selectedMid === MASTER_ID
                  ? chartData.exhaust
                  : chartData.temperature,
                selectedMid === MASTER_ID
                  ? "Exhaust Speed (%)"
                  : "Temperature (°C)"
              )}
            />
          )}
        </div>

        <div className="glass card">
          <h4>{selectedMid === MASTER_ID ? "Mains Voltage" : "Damper Position"}</h4>
          {chartData && (
            <Line
              data={buildLineConfig(
                chartData.x,
                selectedMid === MASTER_ID ? chartData.voltage : chartData.damper,
                selectedMid === MASTER_ID ? "Voltage (V)" : "Damper (%)"
              )}
            />
          )}
        </div>

        <div className="glass card">
          <h4>{selectedMid === MASTER_ID ? "Energy Consumption (kWh)" : "Smoke"}</h4>
          {chartData && (
            <Line
              data={buildLineConfig(
                chartData.x,
                selectedMid === MASTER_ID ? chartData.energy : chartData.smoke,
                selectedMid === MASTER_ID ? "Energy (kWh)" : "Smoke"
              )}
            />
          )}
        </div>
      </div>

      {/* KPI ROW */}
      <div className="kpi-row">
        <div className="glass kpi-card">
          <h4>Duration</h4>
          <div className="kpi-value">
            {duration !== null && duration !== undefined
              ? `${Number(duration).toFixed(2)} hrs`
              : "—"}
          </div>
        </div>

        <div className="glass kpi-card">
          <h4>Energy Consumed</h4>
          <div className="kpi-value">
            {energyConsumed !== null && energyConsumed !== undefined
              ? `${Number(energyConsumed).toFixed(2)} kWh`
              : "—"}
          </div>
        </div>

        <div className="glass kpi-card">
          <h4>Energy Saved</h4>
          <div className="kpi-value">
            {energySaved !== null && energySaved !== undefined
              ? `${Number(energySaved).toFixed(2)} kWh`
              : "—"}
          </div>

          <button className="btn success" onClick={handleEnergySaved}>
            Calculate
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer glass">
        © All Rights Reserved —
        <a
          href="https://pinesphere.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          &nbsp;Pinesphere
        </a>
      </footer>

      {error && <div className="error-msg">{error}</div>}
    </div>
  );
}
