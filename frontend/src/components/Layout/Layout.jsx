import React from "react";
import { useLocation } from "react-router-dom";
import { MdOutlineLightMode, MdOutlineDarkMode } from "react-icons/md";
import { useTheme } from "../../theme";
import TextLogo from "../TextLogo/TextLogo.jsx";
import './Layout.css';

export default function Layout({ children }) {
  const { isDarkMode: dark, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <div className="layout">
      {/* Header avec logo et bouton de mode - Ne s'affiche pas sur la page des notes ni la landing ni les pages auth */}
      {location.pathname !== "/notes" && location.pathname !== "/" && location.pathname !== "/login" && location.pathname !== "/signup" && (
        <header className="layout-header">
          <TextLogo />

          {/* Bouton Mode sombre/clair */}
          <button className="layout-theme-btn" onClick={toggleTheme}>
            {dark ? (
              <>
                <MdOutlineLightMode size="1.5em" />
                <span className="layout-mode-text">Mode clair</span>
              </>
            ) : (
              <>
                <MdOutlineDarkMode size="1.5em" />
                <span className="layout-mode-text">Mode sombre</span>
              </>
            )}
          </button>
        </header>
      )}

      {/* Rendre les routes enfants */}
      {children}
    </div>
  );
}
