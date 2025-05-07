import "../styles/components/toast.css";
import React, { useState, useEffect } from "react";

// Types de toast
const TOAST_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  INFO: "info",
  WARNING: "warning"
};

// Icônes pour chaque type
const ToastIcon = ({ type }) => {
  switch (type) {
    case TOAST_TYPES.SUCCESS:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      );
    case TOAST_TYPES.ERROR:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      );
    case TOAST_TYPES.WARNING:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      );
    case TOAST_TYPES.INFO:
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      );
  }
};

// Composant Toast individuel
const Toast = ({ message, type = TOAST_TYPES.INFO, duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const [intervalId, setIntervalId] = useState(null);

  // Gérer l'animation de fermeture
  useEffect(() => {
    // Démarrer le compte à rebours
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          setIsVisible(false);
          setTimeout(() => onClose && onClose(), 300); // Attendre la fin de l'animation
          return 0;
        }
        return prev - (100 / (duration / 100));
      });
    }, 100);
    
    setIntervalId(interval);
    
    // Nettoyer l'intervalle
    return () => {
      clearInterval(interval);
    };
  }, [duration, onClose]);

  // Mettre en pause le compte à rebours au survol
  const handleMouseEnter = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  // Reprendre le compte à rebours à la sortie du survol
  const handleMouseLeave = () => {
    if (!intervalId) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev <= 0) {
            clearInterval(interval);
            setIsVisible(false);
            setTimeout(() => onClose && onClose(), 300);
            return 0;
          }
          return prev - (100 / (duration / 100));
        });
      }, 100);
      
      setIntervalId(interval);
    }
  };

  // Fermer manuellement
  const handleClose = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
    setIsVisible(false);
    setTimeout(() => onClose && onClose(), 300);
  };

  return (
    <div 
      className={`toast toast-${type} ${isVisible ? 'toast-visible' : 'toast-hidden'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="toast-icon">
        <ToastIcon type={type} />
      </div>
      <div className="toast-content">
        <p>{message}</p>
      </div>
      <button className="toast-close" onClick={handleClose}>
        &times;
      </button>
      <div className="toast-progress">
        <div 
          className="toast-progress-bar" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

// Conteneur pour tous les toasts
const ToastContainer = ({ position = "top-right", toasts = [], removeToast }) => {
  return (
    <div className={`toast-container toast-${position}`}>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

// Hook personnalisé pour gérer les toasts
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = TOAST_TYPES.INFO, duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Méthodes pratiques pour chaque type de toast
  const success = (message, duration) => addToast(message, TOAST_TYPES.SUCCESS, duration);
  const error = (message, duration) => addToast(message, TOAST_TYPES.ERROR, duration);
  const info = (message, duration) => addToast(message, TOAST_TYPES.INFO, duration);
  const warning = (message, duration) => addToast(message, TOAST_TYPES.WARNING, duration);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
    ToastContainer: (props) => (
      <ToastContainer
        {...props}
        toasts={toasts}
        removeToast={removeToast}
      />
    )
  };
};

export { TOAST_TYPES };
export default Toast;