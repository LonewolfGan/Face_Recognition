import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LuScanFace } from "react-icons/lu";
import { IoCheckmarkDoneCircleOutline } from "react-icons/io5";
import "../styles/components/card.css";
import "../styles/components/main-btn.css";
import "../styles/components/auth-page.css";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useToastContext } from "../context/ToastContext";

export default function AuthPage() {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname === "/login");
  
  // États du Login
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showFaceFailModal, setShowFaceFailModal] = useState(false);
  const [password, setPassword] = useState("");
  
  // États pour le cas "Aucun visage enregistré"
  const [noFacesRegistered, setNoFacesRegistered] = useState(false);
  const [showNoFacesModal, setShowNoFacesModal] = useState(false);
  
  // États du Signup
  const [name, setName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showCapture, setShowCapture] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToastContext();

  const API_URL = "http://localhost:5000";
  const LOGIN_ENDPOINT = "/login";
  const REGISTER_ENDPOINT = "/register";

  // Fonctions du Login
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

  // Fonctions du Signup
  const handleFullSignup = async (e) => {
    e.preventDefault();
    if (!name) {
      alert("Nom requis pour l'enregistrement");
      return;
    }

    if (!signupPassword) {
      alert("Mot de passe requis pour l'enregistrement");
      return;
    }

    setShowCapture(true);
    setTimeout(() => startCaptureProcess(), 500);
  };

  const startCaptureProcess = async () => {
    setLoading(true);
    setCaptureProgress(0);
    setSuccess(false);

    try {
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

      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      try {
        const response = await axios.post(`${API_URL}${REGISTER_ENDPOINT}`, {
          name,
          password: signupPassword,
          images: capturedImages,
        });
        const result = await response.data;
        console.log("Resultat de l'enregistrement:", result);

        if (result.status === "success") {
          login({
            user_id: result.user_id,
            name: name,
            face_id: result.face_id,
          });
        }
        setSuccess(true);
        setTimeout(() => {
          setShowCapture(false);
          navigate("/notes");
        }, 1200);
      } catch (error) {
        console.error("Erreur lors de l'inscription:", error);
        toast.error(`Erreur lors de l'inscription: ${error.response?.data?.message || error.message}`);
        throw error;
      }
    } catch (err) {
      console.error("Erreur lors de la capture:", err);
      toast.error("Erreur lors de l'inscription: " + err.message);

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

  // Effets pour la capture et la connexion
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
            console.log("Réponse du serveur:", result);
            
            if (result.status === "success") {
              login(result.user);
              setLoginSuccess(true);
            } else if (result.status === "face_failed") {
              setShowCamera(false);
              setLoading(false);
              setShowFaceFailModal(true);
              return;
            } else {
              toast.error(result.message || "Échec de la connexion inattendu.");
              setError(result.message || "Échec de la connexion inattendu.");
            }
          }
        } catch (error) {
          console.error("Erreur lors de la connexion faciale:", error);
          
          if (error.response?.status === 401) {
            const message = error.response?.data?.message;
            if (message?.includes("Aucun visage enregistré")) {
              setShowCamera(false);
              setLoading(false);
              setNoFacesRegistered(false);
              setShowNoFacesModal(true);
            } else {
              setShowCamera(false);
              setLoading(false);
              setShowFaceFailModal(true);
              const errorMessage = message || "Visage non reconnu (erreur 401)";
              toast.error("Erreur lors de la connexion faciale : " + errorMessage);
              setError("Erreur lors de la connexion faciale : " + errorMessage);
            }
          } else {
            const errorMessage = error.response?.data?.message || error.message;
            toast.error("Erreur lors de la connexion faciale : " + errorMessage);
            setError("Erreur lors de la connexion faciale : " + errorMessage);
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
  }, [showCamera, login, toast, setError]);

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
      <div className="card-3d-wrap">
        <div className={`card-3d-wrapper ${!isLogin ? 'flipped' : ''}`}>
          <div className="card-front">
            <div className="card" style={{ maxWidth: 380, height: "100%", textAlign: "center" }}>
              <div style={{
                display: "flex",
                justifyContent: "center",
                gap: "20px",
                marginBottom: "20px",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "15px"
              }}>
                <button
                  onClick={() => setIsLogin(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: isLogin ? "var(--accent)" : "var(--text)",
                    fontWeight: isLogin ? "600" : "400",
                    cursor: "pointer",
                    fontSize: "1.1rem"
                  }}
                >
                  Connexion
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: !isLogin ? "var(--accent)" : "var(--text)",
                    fontWeight: !isLogin ? "600" : "400",
                    cursor: "pointer",
                    fontSize: "1.1rem"
                  }}
                >
                  Inscription
                </button>
              </div>
              <>
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
                    position: "relative"
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
                    !loading && !noFacesRegistered && (
                      <div className="icon-container">
                        <LuScanFace style={{ width: "150px", height: "150px" }} />
                      </div>
                    )
                  )}
                  {loading && !showCamera && !loginSuccess && (
                    <p style={{ fontStyle: "italic" }}>Traitement...</p>
                  )}
                </div>

                {!loginSuccess && !showPasswordForm && !noFacesRegistered && (
                  <button
                    className="main-btn"
                    onClick={handleFaceLogin}
                    disabled={loading || showCamera}
                    style={{ width: "70%", marginTop: "20px" }}
                  >
                    {loading ? "Chargement..." : "Se connecter"}
                  </button>
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
              </>
            </div>
          </div>
          <div className="card-back">
            <div className="card" style={{ maxWidth: 380, height: "100%", textAlign: "center" }}>
              <div style={{
                display: "flex",
                justifyContent: "center",
                gap: "20px",
                marginBottom: "20px",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "15px"
              }}>
                <button
                  onClick={() => setIsLogin(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: isLogin ? "var(--accent)" : "var(--text)",
                    fontWeight: isLogin ? "600" : "400",
                    cursor: "pointer",
                    fontSize: "1.1rem"
                  }}
                >
                  Connexion
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: !isLogin ? "var(--accent)" : "var(--text)",
                    fontWeight: !isLogin ? "600" : "400",
                    cursor: "pointer",
                    fontSize: "1.1rem"
                  }}
                >
                  Inscription
                </button>
              </div>
              <>
                <form
                  onSubmit={handleFullSignup}
                  style={{ display: "flex", flexDirection: "column", gap: 18, margin: "30px auto" }}
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
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      style={{ marginTop: 4 }}
                    />
                  </label>
                  <button type="submit" disabled={loading} style={{ marginTop: 30 }}>
                    {loading ? "Préparation..." : "S'inscrire (capture visage)"}
                  </button>
                </form>
              </>
            </div>
          </div>
        </div>
      </div>
      
      {/* Nouveau modal pour "Aucun visage enregistré" */}
      {showNoFacesModal && (
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
            <h3 style={{color: "var(--accent)"}}>Aucun visage enregistré</h3>
            <p style={{margin: "18px 0 24px 0"}}>Il semble qu'aucun visage ne soit enregistré pour votre compte. Veuillez vous inscrire pour enregistrer votre visage.</p>
            <div style={{display: "flex", gap: 16, justifyContent: "center"}}>
              <button className="main-btn" style={{minWidth: 120}} onClick={() => {
                setShowNoFacesModal(false);
                setIsLogin(false); // Basculer vers le formulaire d'inscription
              }}>S'inscrire</button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
} 