import React from "react";
import "./styles/App.css";
import "./styles/base.css";
import "./styles/themes/variables.css";
import "./styles/responsive.css";
import "./styles/global.css";
import { LuScanFace } from "react-icons/lu";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import Notes from "./pages/Notes";
import { motion } from "framer-motion";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import backgroundPatternLight from "./assets/background-pattern.svg";
import backgroundPatternDark from "./assets/background-pattern-dark.svg";
import { useTheme } from "./theme";

// Composant LandingPage séparé
function LandingPage({ isDarkMode }) {
  const navigate = useNavigate();

  return (
    <div className={`landing-page ${isDarkMode ? 'dark' : ''}`} style={{position: "relative", overflow: "hidden"}}>
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
            <button className="landing-btn primary" onClick={() => navigate('/signup')}>
              S'inscrire
            </button>
            <button className="landing-btn secondary" onClick={() => navigate('/login')}>
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
  );
}

function App() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/signup" element={<AuthPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="*" element={<LandingPage isDarkMode={isDarkMode} />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;