import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage/AuthPage';
import Notes from './pages/Notes/Notes';
import LandingPage from './pages/LandingPage/LandingPage';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout/Layout';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/signup" element={<AuthPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
