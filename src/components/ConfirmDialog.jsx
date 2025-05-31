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
      zIndex: 1100,
      transition: "background 0.3s"
    }}>
      <div style={{
        backgroundColor: "var(--card)",
        color: "var(--text)",
        borderRadius: "16px",
        padding: "28px 24px 20px 24px",
        width: "90%",
        maxWidth: "400px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        animation: "fadeInModal 0.3s"
      }}>
        <h3 style={{ margin: "0 0 18px 0", fontWeight: 700, fontSize: 20, textAlign: 'center', color: 'var(--text)' }}>{title}</h3>
        <p style={{ margin: "0 0 28px 0", fontSize: 16, textAlign: 'center', color: 'var(--text)' }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", width: '100%' }}>
          <button 
            onClick={onCancel}
            style={{
              padding: "10px 22px",
              border: "1px solid var(--bg)",
              borderRadius: "8px",
              backgroundColor: "var(--bg)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 500,
              fontSize: 15,
              transition: "background 0.2s, color 0.2s, border 0.2s"
            }}
          >
            Annuler
          </button>
          <button 
            onClick={onConfirm}
            style={{
              padding: "10px 22px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: "var(--accent)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 15,
              boxShadow: "0 2px 8px rgba(99,102,241,0.08)",
              transition: "background 0.2s"
            }}
          >
            Confirmer
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeInModal {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ConfirmDialog;