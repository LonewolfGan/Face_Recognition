import './SettingsMenu.css';
import React, { useRef, useEffect } from 'react';

const SettingsMenu = ({ isOpen, onClose, onLogout, onAddFace, onChangePassword, onThemeToggle }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="settings-menu" ref={menuRef}>
      <button onClick={onLogout} className="settings-menu__item">
        <span className="settings-menu__icon" aria-hidden="true">🚪</span>
        <span>Déconnexion</span>
      </button>
      <div className="settings-menu__divider" />
      <button onClick={onAddFace} className="settings-menu__item">
        <span className="settings-menu__icon" aria-hidden="true">📷</span>
        <span>Ajouter un visage</span>
      </button>
      <button onClick={onChangePassword} className="settings-menu__item">
        <span className="settings-menu__icon" aria-hidden="true">🔑</span>
        <span>Changer mot de passe</span>
      </button>
      {onThemeToggle && (
        <>
          <div className="settings-menu__divider" />
          <button onClick={onThemeToggle} className="settings-menu__item">
            <span className="settings-menu__icon" aria-hidden="true">🎨</span>
            <span>Changer de thème</span>
          </button>
        </>
      )}
    </div>
  );
};

export default SettingsMenu;
