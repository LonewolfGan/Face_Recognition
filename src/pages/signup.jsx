import React, { useState, useRef } from "react";
import { IoCheckmarkDoneCircleOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "../styles/components/settings-menu.css";
import "../styles/components/card.css";

// API endpoints
const API_URL = "http://localhost:5000";
const REGISTER_ENDPOINT = "/register";


export default function Signup() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const { login } = useAuth(); // Utilisation du hook useAuth pour accéder à la fonction login

  // Lance la capture et l'enregistrement
  const handleFullSignup = async (e) => {
    e.preventDefault();
    // Vérification des champs (similaire à votre code JavaScript)
    if (!name) {
      alert("Nom requis pour l'enregistrement");
      return;
    }

    if (!password) {
      alert("Mot de passe requis pour l'enregistrement");
      return;
    }

    setShowCapture(true);
    setTimeout(() => startCaptureProcess(), 500);
  };

  // Processus de capture et envoi (similaire à captureImageForSave et la suite de addFaceToDatabase)
  const startCaptureProcess = async () => {
    setLoading(true);
    setCaptureProgress(0);
    setSuccess(false);

    try {
      // Démarrer la caméra (similaire à accessCamera)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        if (videoRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          videoRef.current.srcObject = stream;
        } else {
          throw new Error("Video element not ready.");
        }
      }

      // Capturer 5 images (similaire à captureImageForSave)
      let capturedImages = [];
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (videoRef.current && canvasRef.current) {
          const context = canvasRef.current.getContext("2d");
          context.drawImage(videoRef.current, 0, 0, 320, 240);
          const dataUrl = canvasRef.current.toDataURL("image/jpeg");
          capturedImages.push(dataUrl);
          setCaptureProgress(i + 1);
        } else {
          throw new Error("Video or Canvas element not ready during capture.");
        }
      }

      // Arrêter la caméra (similaire à stopCamera)
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      // Envoi au serveur (similaire à la partie fetch de addFaceToDatabase)
      console.log(
        "Envoi des images au serveur pour ajouter à la base de données..."
      );

      try {
        const response = await axios.post(`${API_URL}${REGISTER_ENDPOINT}`, {
          name,
          password,
          images: capturedImages,
        });
        const result = await response.data;
        console.log("Resultat de l'enregistrement:", result);

        if (result.status === "success") {
          // Utiliser la fonction login du contexte avec les données de la réponse du serveur
          login({
            user_id: result.user_id,
            name: name,
            face_id: result.face_id,
          });
        }
        setSuccess(true);
        // Redirection après succès
        setTimeout(() => {
          setShowCapture(false);
          navigate("/notes");
        }, 1200);
      } catch (error) {
        console.error("Erreur lors de l'inscription:", error);
        alert(
          `Erreur lors de l'inscription: ${
            error.response?.data?.message || error.message
          }`
        );
        throw error;
      }
    } catch (err) {
      console.error("Erreur lors de la capture:", err);
      alert("Erreur lors de l'inscription: " + err.message);

      // Assure-toi d'arrêter la caméra même en cas d'erreur
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      setSuccess(false);
      setShowCapture(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="background">
      <div className="card" style={{ maxWidth: 380 }}>
        <h2>Inscription</h2>
        <form
          onSubmit={handleFullSignup}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          <label
            style={{ fontWeight: 500, marginBottom: 4, color: "var(--text)" }}
          >
            Nom
            <input
              type="text"
              placeholder="Entrez votre nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ marginTop: 4 }}
            />
          </label>
          <label
            style={{ fontWeight: 500, marginBottom: 4, color: "var(--text)" }}
          >
            Mot de passe
            <input
              type="password"
              placeholder="Mot de passe sécurisé"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ marginTop: 4 }}
            />
          </label>
          <button type="submit" disabled={loading} style={{ marginTop: 12 }}>
            {loading ? "Préparation..." : "S'inscrire (capture visage)"}
          </button>
        </form>
      </div>
      {showCapture && (
        <div
          className="card"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            zIndex: 2000,
            maxWidth: 400, // Ajusté pour correspondre à la taille de la vidéo
            background: "var(--card)",
            padding: 24, // Ajouté un padding pour l'esthétique
            borderRadius: 28, // Ajouté un borderRadius pour l'esthétique
            boxShadow: "0 8px 32px rgba(79,70,229,0.10)", // Ajouté une ombre pour l'esthétique
          }}
        >
          <h3
            style={{
              color: "var(--text)",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Enregistrement du visage
          </h3>
          <div
            style={{
              position: "relative",
              width: 320,
              height: 240,
              margin: "10px auto",
            }}
          >
            {!success ? (
              <video
                ref={videoRef}
                width="320"
                height="240"
                autoPlay
                style={{
                  borderRadius: 12,
                  display: "block",
                  background: "var(--bg)", // Fond adapté au thème
                  border: "4px dotted var(--text)", // Bordure adaptée au thème
                }}
              />
            ) : (
              <div
                style={{
                  width: 320,
                  height: 240,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12, // Ajouté pour correspondre à la vidéo
                  border: "4px dotted var(--bg)", // Adapté au thème
                  background: "var(--bg)", // Adapté au thème
                }}
              >
                <IoCheckmarkDoneCircleOutline size={120} color="#22c55e" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              width="320"
              height="240"
              style={{ display: "none" }}
            />
          </div>
          <div
            style={{
              width: "80%",
              height: 10,
              background: "var(--bg)",
              borderRadius: 6,
              margin: "18px auto 0 auto",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(captureProgress / 5) * 100}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, var(--accent) 60%, #6366f1 100%)", // Utilisation de variable
                borderRadius: 6,
                transition: "width 0.5s",
              }}
            />
          </div>
          <div
            style={{
              margin: "14px 0 0 0",
              fontWeight: 500,
              textAlign: "center",
              fontSize: "1.05rem",
            }}
          >
            {loading && !success
              ? "Positionnez votre visage dans le cadre"
              : success
              ? "Enregistrement réussi !"
              : ""}
          </div>
        </div>
      )}
    </div>
  );
}
