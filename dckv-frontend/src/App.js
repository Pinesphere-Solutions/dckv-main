import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./ProtectedRoute";

function AppWrapper() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("token"));

  return (
    <Routes>
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Login page */}
      <Route 
        path="/login" 
        element={<Login setToken={setToken} navigate={navigate} />} 
      />

      {/* Protected Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppWrapper />
    </BrowserRouter>
  );
}



export async function fetchHoods(hotelId, kitchenId, date) {
  const res = await fetch(`http://localhost:8000/api/hoods/${hotelId}/${kitchenId}/${date}/`);
  return res.json();
}
