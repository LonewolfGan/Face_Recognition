import "../styles/components/card.css";
import React from "react";

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1100
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "8px",
        padding: "20px",
        width: "90%",
        maxWidth: "400px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
      }}>
        <h3 style={{ margin: "0 0 15px 0" }}>{title}</h3>
        <p style={{ margin: "0 0 20px 0" }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button 
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: "transparent",
              cursor: "pointer"
            }}
          >
            Annuler
          </button>
          <button 
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              backgroundColor: "#ef4444",
              color: "white",
              cursor: "pointer"
            }}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;