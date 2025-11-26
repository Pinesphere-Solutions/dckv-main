// src/components/Toast.jsx
import React, { useEffect } from "react";
import "./toast.css";

export default function Toast({ message, type = "info", onClose }) {
  
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`toast ${type}`}>
      <span>{message}</span>
      <button className="close-btn" onClick={onClose}>×</button>
    </div>
  );
}
