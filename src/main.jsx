import './styles/global.css';
import "./styles/responsive.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "@fontsource/inter";
import "@fontsource/poppins";
import "./styles/themes/variables.css";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./theme";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
