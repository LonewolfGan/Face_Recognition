import "../styles/components/main-btn.css";
import React from "react";

const FloatingButton = ({ onClick, icon, label, position = "bottom-right" }) => {
  // Styles pour différentes positions
  const positions = {
    "bottom-right": { bottom: "30px", right: "30px" },
    "bottom-left": { bottom: "30px", left: "30px" },
    "top-right": { top: "30px", right: "30px" },
    "top-left": { top: "30px", left: "30px" }
  };

  return (
    <button
      className="floating-button"
      onClick={onClick}
      style={{
        position: "fixed",
        ...positions[position],
        backgroundColor: "#4f46e5",
        color: "white",
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        border: "none",
        cursor: "pointer",
        zIndex: 1000,
        transition: "transform 0.2s, background-color 0.2s"
      }}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
};

export default FloatingButton;