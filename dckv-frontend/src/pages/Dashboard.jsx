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

export default function Dashboard() {
  const HOTEL_ID = 1001;
  const KITCHEN_ID = 1;
  const MASTER_ID = 11;

  const [hoods, setHoods] = useState([]);
  const [selectedMid, setSelectedMid] = useState(MASTER_ID);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0,10));
  const [chartData, setChartData] = useState(null);
  const [benchmark, setBenchmarkVal] = useState("");
  const [benchmarkInfo, setBenchmarkInfo] = useState(null);
  const [energySaved, setEnergySaved] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHoods();
  }, []);

  useEffect(() => {
    loadChart();
    loadBenchmark();
  }, [selectedMid, selectedDate]);

  async function loadHoods() {
    const res = await fetchHoods(HOTEL_ID, KITCHEN_ID);
    if (res.hoods) {
      setHoods(res.hoods);
      // set default if master exists
      const foundMaster = res.hoods.find(h => h.id === MASTER_ID);
      if (foundMaster) setSelectedMid(MASTER_ID);
      else if (res.hoods.length>0) setSelectedMid(res.hoods[0].id);
    }
  }

  async function loadChart() {
    const res = await fetchChartData(selectedMid, selectedDate);
    setChartData(res);
  }

  async function loadBenchmark() {
    const res = await getBenchmark(HOTEL_ID, KITCHEN_ID, selectedDate);
    setBenchmarkInfo(res);
    if (res && res.benchmark) {
      setBenchmarkVal(String(res.benchmark.value_units_per_hour));
    }
  }

  async function handleSetBenchmark() {
    setError("");
    if (!benchmark || isNaN(parseFloat(benchmark))) {
      setError("Please enter numeric value only (Units/Hour).");
      return;
    }
    // attempt save
    const res = await setBenchmark(HOTEL_ID, KITCHEN_ID, parseFloat(benchmark), selectedDate);
    if (res.error) {
      setError(res.error);
    } else {
      alert(res.message || "Benchmark saved");
      loadBenchmark();
    }
  }

  async function handleEnergySaved() {
    const res = await computeEnergySaved(HOTEL_ID, KITCHEN_ID, selectedMid, selectedDate);
    if (res.error) {
      setEnergySaved(null);
      setError(res.error);
    } else {
      setEnergySaved(res);
    }
  }

  function buildLineConfig(labels, data, label, yLabel) {
    return {
      labels,
      datasets: [
        {
          label,
          data,
          fill: false,
          tension: 0.2,
        },
      ],
    };
  }

  return (
    <div style={{padding:20}}>
      <h1 style={{textAlign:"center", color:"#0d47a1"}}>DEMAND CONTROLLED KITCHEN VENTILATION - DCKV</h1>

      <div style={{display:"flex",gap:10,alignItems:"center",marginTop:20}}>
        <div>
          <label>Select View</label><br/>
          <select value={selectedMid} onChange={(e)=>setSelectedMid(Number(e.target.value))}>
            {hoods.map(h=>(
              <option key={h.id} value={h.id}>{h.label} ({h.id})</option>
            ))}
          </select>
        </div>

        <div>
          <label>Select Date</label><br/>
          <input type="date" value={selectedDate} onChange={(e)=>setSelectedDate(e.target.value)} />
        </div>

        <div style={{marginLeft:"auto"}}>
          <button onClick={()=>downloadReport(HOTEL_ID, KITCHEN_ID, selectedMid, selectedDate)} style={{background:"#0d47a1", color:"white", padding:"10px 14px", border:"none", borderRadius:6}}>Download Report</button>
        </div>
      </div>

      {/* Charts area */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginTop:24}}>
        {/* Left chart */}
        <div style={{background:"#f5f5f5", padding:12, borderRadius:6, boxShadow:"0 2px 6px rgba(0,0,0,0.08)"}}>
          <h4 style={{textAlign:"center"}}>
            {selectedMid === MASTER_ID ? "Exhaust Speed" : "Temperature"}
          </h4>
          {chartData && (
            <Line data={ buildLineConfig(chartData.x, selectedMid===MASTER_ID ? chartData.exhaust : chartData.temperature,
                selectedMid===MASTER_ID ? "Exhaust Speed (%)" : "Temperature (°C)") } />
          )}
        </div>

        {/* Right chart */}
        <div style={{background:"#f5f5f5", padding:12, borderRadius:6, boxShadow:"0 2px 6px rgba(0,0,0,0.08)"}}>
          <h4 style={{textAlign:"center"}}>
            {selectedMid === MASTER_ID ? "Mains Voltage" : "Damper Position"}
          </h4>
          {chartData && (
            <Line data={ buildLineConfig(chartData.x, selectedMid===MASTER_ID ? chartData.voltage : chartData.damper,
                selectedMid===MASTER_ID ? "Voltage (V)" : "Damper (%)") } />
          )}
        </div>

        {/* Bottom left - energy or smoke */}
        <div style={{gridColumn:"1 / span 1", background:"#f5f5f5", padding:12, borderRadius:6, boxShadow:"0 2px 6px rgba(0,0,0,0.08)"}}>
          <h4 style={{textAlign:"center"}}>
            {selectedMid === MASTER_ID ? "Energy Consumption (per interval kWh)" : "Smoke"}
          </h4>
          {chartData && (
            <Line data={ buildLineConfig(chartData.x, selectedMid===MASTER_ID ? chartData.energy : chartData.smoke,
                selectedMid===MASTER_ID ? "Energy (kWh)" : "Smoke (counts)") } />
          )}
        </div>

        {/* Bottom right - energy saved / benchmark box */}
        <div style={{display:"flex", flexDirection:"column", gap:10, alignItems:"center"}}>
          <div style={{width:"100%", background:"#e8f5e9", padding:12, borderRadius:6, textAlign:"center", border:"1px solid #c8e6c9"}}>
            <strong>Energy Saved</strong>
            <div style={{fontSize:24, marginTop:6}}>
              {energySaved ? `${energySaved.energy_saved} kWh` : "—"}
            </div>
            <div style={{marginTop:8}}>
              <button onClick={handleEnergySaved} style={{padding:"8px 10px", background:"#43a047", color:"white", border:"none", borderRadius:6}}>Calculate</button>
            </div>
          </div>

          <div style={{width:"100%", background:"#fff", padding:12, borderRadius:6, border:"1px solid #ddd"}}>
            <div><strong>BENCH MARK Value</strong></div>
            <div style={{marginTop:8, display:"flex", gap:8}}>
              <input value={benchmark} onChange={(e)=>setBenchmarkVal(e.target.value)} placeholder="Units/hour" />
              <button onClick={handleSetBenchmark}>Save</button>
            </div>
            <div style={{marginTop:8, fontSize:12, color:"#666"}}>
              {benchmarkInfo?.message || (benchmarkInfo?.carried ? "Previous value carried forward." : "")}
            </div>
          </div>
        </div>
      </div>

      {error && <div style={{color:"red", marginTop:12}}>{error}</div>}
    </div>
  );
}
