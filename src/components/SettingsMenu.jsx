import "../styles/components/settings-menu.css";
import React, { useRef, useEffect } from "react";

const SettingsMenu = ({ isOpen, onClose, onLogout, onAddFace, onChangePassword, onThemeToggle }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    }
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="settings-menu" ref={menuRef}>
      <button onClick={onLogout} className="settings-item">
        <span>Déconnexion</span>
      </button>
      <button onClick={onAddFace} className="settings-item">
        <span>Ajouter un visage</span>
      </button>
      <button onClick={onChangePassword} className="settings-item">
        <span>Changer mot de passe</span>
      </button>
      <button onClick={onThemeToggle} className="settings-item">
        <span>Changer de thème</span>
      </button>
    </div>
  );
};

export default SettingsMenu;