import React, { useState, useEffect } from "react";
import "./styles/App.css";
import "./styles/base.css";
import "./styles/themes/variables.css";
import "./styles/responsive.css";
import "./styles/global.css";
import { LuScanFace } from "react-icons/lu";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Signup from "./pages/signup";
import Login from "./pages/Login";
import Notes from "./pages/Notes";
import { motion } from "framer-motion";
import { AuthProvider } from "./context/AuthContext";

function App() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <AuthProvider>
      <Router>
        <button
        style={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 1000,
          background: "var(--accent)",
          color: "var(--card)",
          border: "none",
          borderRadius: 8,
          padding: "8px 16px",
          cursor: "pointer"
        }}
        onClick={() => setDark(d => !d)}
      >
        {dark ? "Mode clair" : "Mode sombre"}
      </button>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/notes" element={<Notes />} />
        {/* Route par défaut/accueil */}
        <Route path="*" element={
          <div className="landing-page" style={{position: "relative", overflow: "hidden"}}>
            <div className="landing-overlay"></div>
            <motion.div 
              className="landing-content"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <div className="landing-left">
                <motion.h1 
                  className="landing-title"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                >
                  MyNote
                </motion.h1>
                <motion.p 
                  className="landing-subtitle"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.7, delay: 0.4 }}
                >
                  Vos notes sécurisées par reconnaissance faciale
                </motion.p>
                <motion.div 
                  className="landing-buttons"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.6 }}
                >
                  <button className="landing-btn primary" onClick={() => window.location.href='/signup'}>
                    S'inscrire
                  </button>
                  <button className="landing-btn secondary" onClick={() => window.location.href='/login'}>
                    Se connecter
                  </button>
                </motion.div>
              </div>
              <motion.div 
                className="landing-right"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.3 }}
              >
                <div className="face-scan-animation">
                  <LuScanFace className="face-icon" />
                  <div className="scan-line"></div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        } />
      </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;