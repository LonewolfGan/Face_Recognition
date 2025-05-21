import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LuScanFace } from "react-icons/lu";
import { IoCheckmarkDoneCircleOutline } from "react-icons/io5";
import "../styles/components/card.css";
import "../styles/components/main-btn.css";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useToastContext } from "../context/ToastContext";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showFaceFailModal, setShowFaceFailModal] = useState(false);
  const [password, setPassword] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToastContext();

  const API_URL = "http://localhost:5000";
  const LOGIN_ENDPOINT = "/login";

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(`${API_URL}${LOGIN_ENDPOINT}`, {
        password,
      });
      const result = response.data;
      if (result.status === "success") {
        login(result.user);
        setLoginSuccess(true);
      } else {
        toast.error(result.message || "Échec de la connexion.");
        setError(result.message || "Échec de la connexion.");
      }
    } catch (error) {
      toast.error("Erreur lors de la connexion : " + (error.response?.data?.message || error.message));
      setError("Erreur lors de la connexion : " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFaceLogin = () => {
    setShowCamera(true);
    setError("");
  };

  useEffect(() => {
    let stream = null;
    const captureAndLogin = async () => {
      if (showCamera) {
        setLoading(true);
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            if (videoRef.current) {
              stream = await navigator.mediaDevices.getUserMedia({ video: true });
              videoRef.current.srcObject = stream;
            } else {
              throw new Error("Video element not ready.");
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
          if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext("2d");
            context.drawImage(videoRef.current, 0, 0, 320, 240);
            const imageData = canvasRef.current.toDataURL("image/jpeg");
            if (videoRef.current.srcObject) {
              videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
              videoRef.current.srcObject = null;
            }
            const response = await axios.post(`${API_URL}${LOGIN_ENDPOINT}`, {
              image: imageData,
            });
            const result = response.data;
            if (result.status === "success") {
              login(result.user);
              setLoginSuccess(true);
            } else if (result.status === "face_failed") {
              setShowCamera(false);
              setLoading(false);
              setShowFaceFailModal(true);
              return;
            } else {
              toast.error(result.message || "Échec de la connexion.");
              setError(result.message || "Échec de la connexion.");
            }
          }
        } catch (error) {
          console.error("Erreur complète lors de la connexion faciale:", error);
          if (error.response && error.response.status === 401) {
            setShowCamera(false);
            setLoading(false);
            setShowFaceFailModal(true);
            return;
          } else {
            toast.error("Erreur lors de la connexion faciale : " + (error.response?.data?.message || error.message));
            setError("Erreur lors de la connexion faciale : " + (error.response?.data?.message || error.message));
          }
        } finally {
          setShowCamera(false);
          setLoading(false);
        }
      }
    };
    if (showCamera) {
      captureAndLogin();
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [showCamera]);

  useEffect(() => {
    let navigationTimer = null;
    if (loginSuccess) {
      setLoading(false);
      navigationTimer = setTimeout(() => {
        navigate("/notes");
      }, 1500);
    }
    return () => {
      clearTimeout(navigationTimer);
    };
  }, [loginSuccess, navigate]);

  return (
    <div className="background">
      <div className="card" style={{ maxWidth: 380, textAlign: "center" }}>
        <h2>Connexion</h2>

        <div
          style={{
            margin: "20px auto",
            width: 320,
            height: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: loginSuccess
              ? "var(--accent-light, #f0fdf4)"
              : showCamera
              ? "var(--bg)"
              : "transparent",
            borderRadius: 12,
            border: loginSuccess
              ? "4px dotted var(--accent)"
              : showCamera
              ? "4px dotted var(--bg)"
              : "none",
            position:
              "relative"
          }}
        >
          {loginSuccess ? (
            <IoCheckmarkDoneCircleOutline size={120} color="var(--accent)" />
          ) : showCamera ? (
            <>
              <video
                ref={videoRef}
                width="320"
                height="240"
                autoPlay
                muted
                playsInline
                style={{ borderRadius: 8, display: "block" }}
              />
              <canvas
                ref={canvasRef}
                width="320"
                height="240"
                style={{ display: "none" }}
              />
            </>
          ) : (
            !loading && (
              <div className="icon-container">
                <LuScanFace style={{ width: "80px", height: "80px" }} />
              </div>
            )
          )}
          {loading && !showCamera && !loginSuccess && (
            <p style={{ fontStyle: "italic" }}>Traitement...</p>
          )}
        </div>

        {showFaceFailModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000
          }}>
            <div style={{
              background: "var(--card)",
              padding: 32,
              borderRadius: 18,
              boxShadow: "0 8px 32px rgba(79,70,229,0.10)",
              maxWidth: 340,
              textAlign: "center"
            }}>
              <h3 style={{color: "var(--accent)"}}>Visage non reconnu</h3>
              <p style={{margin: "18px 0 24px 0"}}>Voulez-vous réessayer la reconnaissance ou utiliser le mot de passe ?</p>
              <div style={{display: "flex", gap: 16, justifyContent: "center"}}>
                <button className="main-btn" style={{minWidth: 120}} onClick={() => {
                  setShowFaceFailModal(false);
                  setTimeout(() => setShowCamera(true), 200);
                }}>Réessayer</button>
                <button className="main-btn secondary" style={{minWidth: 120}} onClick={() => {
                  setShowFaceFailModal(false);
                  setShowPasswordForm(true);
                }}>Mot de passe</button>
              </div>
            </div>
          </div>
        )}
        {loading && showCamera && (
          <p style={{ fontStyle: "italic", marginTop: "5px" }}>
            Capture en cours...
          </p>
        )}

        {!loginSuccess && !showPasswordForm && (
          <>
            <button
              className="main-btn"
              onClick={handleFaceLogin}
              disabled={loading || showCamera}
              style={{ width: "100%", marginTop: "20px" }}
            >
              {loading ? "Chargement..." : "Se connecter"}
            </button>
            <div style={{ marginTop: "25px", fontSize: "0.9rem" }}>
              <Link
                to="/signup"
                style={{
                  color: "var(--accent-color)",
                  fontWeight: "bold",
                }}
              >
                Première visite ? Inscrivez-vous
              </Link>
            </div>
          </>
        )}
        {showPasswordForm && !loginSuccess && (
          <form onSubmit={handlePasswordLogin} style={{ marginTop: 20 }}>
            <input
              type="password"
              placeholder="Entrez votre mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc", marginBottom: 10 }}
              autoFocus
              required
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" className="main-btn" disabled={loading} style={{ flex: 1 }}>
                {loading ? "Connexion..." : "Valider"}
              </button>
              <button type="button" className="main-btn" style={{ flex: 1, background: "#eee", color: "#333" }} onClick={() => { setShowPasswordForm(false); setPassword(""); setError(""); }}>
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
