// Configuration des URLs d'API
// In production, set VITE_API_URL to your backend URL e.g. https://your-api.onrender.com/api
const API_URL = import.meta.env.VITE_API_URL || '/api';
const ADD_FACE_URL = `${API_URL}/add_face`;
const RECOGNIZE_URL = `${API_URL}/recognize`;

// Points de terminaison de l'API
const ENDPOINTS = {
  LOGIN: '/login',
  REGISTER: '/register',
  NOTES: '/notes',
  SETTINGS: '/settings'
};

// Configuration de l'application
const CONFIG = {
  // Nombre d'images à capturer pour l'enregistrement
  CAPTURE_COUNT: 5,
  // Délai entre les captures (en ms)
  CAPTURE_DELAY: 300,
  // Seuil de confiance pour la reconnaissance faciale
  RECOGNITION_THRESHOLD: 0.9
};

export { API_URL, ADD_FACE_URL, RECOGNIZE_URL, ENDPOINTS, CONFIG };