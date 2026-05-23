import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuScanFace,
  LuArrowLeft,
  LuArrowRight,
  LuUser,
  LuKeyRound,
  LuCheck,
  LuX,
  LuCamera,
  LuTriangleAlert,
  LuLoader,
  LuLogOut,
  LuNotebook,
} from "react-icons/lu";
import { IoCheckmarkDoneCircleOutline } from "react-icons/io5";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useToastContext } from "../../context/ToastContext";
import { API_URL } from "../../config";
import { Button, Card } from "../../components/ui";
import { cn } from "../../lib/utils";

const EASE = [0.16, 1, 0.3, 1];

/* ──────────────────────────────────────────────────────────────────────
   Modal
   ────────────────────────────────────────────────────────────────────── */
function Modal({ open, onClose, icon: Icon, title, children, actions }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(26,13,48,0.6)] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px]"
          >
            <Card className="p-7 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                {Icon && (
                  <span className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-[rgba(122,53,242,0.12)] text-tech-violet dark:bg-[rgba(155,112,229,0.15)] dark:text-biometric-glow shrink-0">
                    <Icon className="w-5 h-5" />
                  </span>
                )}
                <h3 className="text-[18px] font-bold text-title m-0 mt-1">
                  {title}
                </h3>
              </div>
              <div className="text-[15px] leading-[1.65] text-body">
                {children}
              </div>
              <div className="flex gap-3 mt-2">{actions}</div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Form field
   ────────────────────────────────────────────────────────────────────── */
function FormField({ icon: Icon, hint, ...inputProps }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="relative flex items-center">
        {Icon && (
          <Icon className="absolute left-4 w-4 h-4 text-muted-token pointer-events-none" />
        )}
        <input
          {...inputProps}
          className={cn(
            "w-full h-11 rounded-full border border-neutral surface-card text-title",
            "text-[15px] font-medium px-4 transition-colors duration-200",
            "focus-visible:outline-none focus-visible:border-tech-violet dark:focus-visible:border-biometric-glow",
            Icon && "pl-10"
          )}
        />
      </span>
      {hint && <span className="text-[12px] text-muted-token">{hint}</span>}
    </label>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Tab bar — CSS-based active state (no framer-motion layoutId)
   ────────────────────────────────────────────────────────────────────── */
function TabBar({ isLogin, onLogin, onSignup }) {
  return (
    <div className="grid grid-cols-2 p-1 rounded-xl bg-section-alt border border-neutral">
      <button
        type="button"
        onClick={onLogin}
        className={cn(
          "h-10 text-[14px] font-semibold rounded-lg transition-colors duration-200",
          isLogin
            ? "bg-tech-violet text-zinc-50"
            : "text-muted-token hover:text-title"
        )}
      >
        Connexion
      </button>
      <button
        type="button"
        onClick={onSignup}
        className={cn(
          "h-10 text-[14px] font-semibold rounded-lg transition-colors duration-200",
          !isLogin
            ? "bg-tech-violet text-zinc-50"
            : "text-muted-token hover:text-title"
        )}
      >
        Inscription
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Spinner
   ────────────────────────────────────────────────────────────────────── */
function Spinner({ className }) {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={cn("inline-flex", className)}
    >
      <LuLoader className="w-4 h-4" />
    </motion.span>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   AuthPage
   ────────────────────────────────────────────────────────────────────── */
export default function AuthPage() {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname === "/login");

  // ── Login state ───────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showFaceFailModal, setShowFaceFailModal] = useState(false);
  const [password, setPassword] = useState("");
  const [showNoFacesModal, setShowNoFacesModal] = useState(false);

  // ── Signup state ──────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showCapture, setShowCapture] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [processingSignup, setProcessingSignup] = useState(false);
  const [success, setSuccess] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const { login, logout, isAuthenticated, user } = useAuth();
  const toast = useToastContext();

  const LOGIN_ENDPOINT = "/login";
  const REGISTER_ENDPOINT = "/register";

  /* ── Password login ─────────────────────────────────────────────── */
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login({ password });
      setLoginSuccess(true);
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      toast.error("Erreur lors de la connexion : " + message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Face login — direct async, no useEffect watcher ────────────── */
  const handleFaceLogin = async () => {
    setShowCamera(true);
    setError("");
    setLoading(true);

    // Give React time to re-render and mount the video element
    await new Promise((r) => setTimeout(r, 150));

    let stream = null;
    try {
      console.log("[FaceLogin] Starting face capture");
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log("[FaceLogin] Stream obtained");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } else {
        throw new Error("videoRef not available — video element not mounted");
      }

      // Wait 2 s for the face to be clearly visible
      await new Promise((r) => setTimeout(r, 2000));

      if (videoRef.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        const imageData = canvasRef.current.toDataURL("image/jpeg");
        console.log("[FaceLogin] Frame captured, sending to API");

        // Stop camera before the API call
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
        stream = null;

        const response = await axios.post(
          `${API_URL}${LOGIN_ENDPOINT}`,
          { image: imageData },
          { withCredentials: true }
        );
        console.log("[FaceLogin] API response:", response.data);
        const result = response.data;

        if (result.access_token || result.status === "success") {
          await login({ image: imageData });
          setLoginSuccess(true);
        } else if (result.status === "face_failed") {
          setShowFaceFailModal(true);
        } else {
          setError(result.message || "Échec inattendu");
          toast.error(result.message || "Échec inattendu");
        }
      }
    } catch (err) {
      console.error("[FaceLogin] Error:", err);
      if (err.response?.status === 401) {
        const msg = err.response?.data?.message || "";
        if (msg.includes("Aucun visage")) {
          setShowNoFacesModal(true);
        } else {
          setShowFaceFailModal(true);
          setError(msg || "Visage non reconnu");
        }
      } else {
        setError(err.message);
        toast.error(err.message);
      }
      if (stream) stream.getTracks().forEach((t) => t.stop());
    } finally {
      setShowCamera(false);
      setLoading(false);
    }
  };

  /* ── Signup form submit ──────────────────────────────────────────── */
  const handleFullSignup = async (e) => {
    e.preventDefault();
    if (!name) return toast.error("Nom requis");
    if (!signupPassword) return toast.error("Mot de passe requis");
    if (signupPassword.length < 8 || signupPassword.length > 128)
      return toast.error("Le mot de passe doit contenir entre 8 et 128 caractères.");
    setCaptureProgress(0);
    setProcessingSignup(false);
    setShowCapture(true);
  };

  /* ── Signup capture (5 photos) ───────────────────────────────────── */
  useEffect(() => {
    let stream = null;
    let captureInterval = null;

    const startCapture = async () => {
      if (!showCapture || loading) return;

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("L'API mediaDevices n'est pas disponible.");
        }

        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoEl = videoRef.current;

        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play();

          setTimeout(() => {
            const capturedImages = [];
            let captureCount = 0;

            captureInterval = setInterval(async () => {
              if (captureCount >= 5) {
                clearInterval(captureInterval);

                // Stop camera immediately — show processing state
                if (stream) stream.getTracks().forEach((t) => t.stop());
                if (videoEl) videoEl.srcObject = null;
                stream = null;
                setProcessingSignup(true);

                try {
                  const response = await axios.post(
                    `${API_URL}${REGISTER_ENDPOINT}`,
                    { name, password: signupPassword, images: capturedImages },
                    { withCredentials: true }
                  );
                  const result = response.data;

                  if (result.status === "success" || result.access_token) {
                    setSuccess(true);
                    setProcessingSignup(false);

                    try {
                      await login({ password: signupPassword });
                    } catch {
                      // Registration succeeded; login may need explicit token auth
                    }

                    setShowCapture(false);
                    navigate("/notes");
                  }
                } catch (err) {
                  console.error("Erreur lors de l'envoi des images:", err);
                  toast.error("Erreur lors de l'inscription: " + err.message);
                  setProcessingSignup(false);
                  setShowCapture(false);
                }
                return;
              }

              const canvasEl = canvasRef.current;
              if (videoEl && canvasEl) {
                const ctx = canvasEl.getContext("2d");
                ctx.drawImage(videoEl, 0, 0, 320, 240);
                capturedImages.push(canvasEl.toDataURL("image/jpeg"));
                captureCount++;
                setCaptureProgress(captureCount);
              }
            }, 2000);
          }, 1000);
        }
      } catch (err) {
        console.error("Erreur caméra:", err);
        toast.error("Erreur caméra: " + err.message);
        setShowCapture(false);
      }
    };

    if (showCapture) startCapture();

    return () => {
      if (captureInterval) clearInterval(captureInterval);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [showCapture, loading, name, signupPassword, login, navigate, toast]);

  /* ── Cleanup on unmount ──────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      const videoEl = videoRef.current;
      if (videoEl && videoEl.srcObject) {
        videoEl.srcObject.getTracks().forEach((t) => t.stop());
        videoEl.srcObject = null;
      }
    };
  }, []);

  /* ── Login success → redirect ────────────────────────────────────── */
  useEffect(() => {
    if (!loginSuccess) return;
    setLoading(false);
    const t = setTimeout(() => navigate("/notes"), 1500);
    return () => clearTimeout(t);
  }, [loginSuccess, navigate]);

  /* ── Tab switching ───────────────────────────────────────────────── */
  const handleTabSwitch = (toLogin) => {
    setIsLogin(toLogin);
    navigate(toLogin ? "/login" : "/signup");
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen w-full bg-page relative overflow-hidden flex items-center justify-center px-4 py-10">
      {/* Background face image */}
      <img
        src="/face.png"
        alt=""
        aria-hidden="true"
        loading="eager"
        className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover opacity-20 dark:opacity-25 z-0"
        style={{ filter: "saturate(0.85)" }}
      />

      {/* ← Back to home button */}
      <a
        href="/"
        className="absolute top-5 left-5 z-20 flex items-center gap-2 text-[13px] font-medium text-muted-token hover:text-title transition-colors duration-200 no-underline"
      >
        <LuArrowLeft className="w-4 h-4" />
        Retour
      </a>

      {/* Auth card — already-logged-in state OR slide transition */}
      <div className="relative z-10 w-[420px] max-w-[95vw]">
        <AnimatePresence mode="wait">
          {isAuthenticated ? (
            <motion.div
              key="already-logged-in"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              <AlreadySignedInCard
                user={user}
                onGoToNotes={() => navigate("/notes")}
                onLogout={async () => {
                  await logout();
                }}
              />
            </motion.div>
          ) : isLogin ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              <LoginPanel
                loading={loading}
                showCamera={showCamera}
                loginSuccess={loginSuccess}
                showPasswordForm={showPasswordForm}
                password={password}
                setPassword={setPassword}
                error={error}
                setError={setError}
                setShowPasswordForm={setShowPasswordForm}
                handleFaceLogin={handleFaceLogin}
                handlePasswordLogin={handlePasswordLogin}
                videoRef={videoRef}
                canvasRef={canvasRef}
                onSwitchToSignup={() => handleTabSwitch(false)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              <SignupPanel
                loading={loading}
                name={name}
                setName={setName}
                signupPassword={signupPassword}
                setSignupPassword={setSignupPassword}
                showCapture={showCapture}
                captureProgress={captureProgress}
                processingSignup={processingSignup}
                success={success}
                videoRef={videoRef}
                canvasRef={canvasRef}
                handleFullSignup={handleFullSignup}
                onSwitchToLogin={() => handleTabSwitch(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <Modal
        open={showNoFacesModal}
        onClose={() => setShowNoFacesModal(false)}
        icon={LuTriangleAlert}
        title="Aucun visage enregistré"
        actions={
          <>
            <Button variant="ghost" size="md" onClick={() => setShowNoFacesModal(false)} className="flex-1">
              Annuler
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setShowNoFacesModal(false);
                handleTabSwitch(false);
              }}
              className="flex-1"
            >
              S'inscrire
              <LuArrowRight />
            </Button>
          </>
        }
      >
        Aucun visage n'est enregistré pour ce compte. Veuillez vous inscrire
        pour ajouter votre signature biométrique.
      </Modal>

      <Modal
        open={showFaceFailModal}
        onClose={() => setShowFaceFailModal(false)}
        icon={LuX}
        title="Visage non reconnu"
        actions={
          <>
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                setShowFaceFailModal(false);
                setShowPasswordForm(true);
              }}
              className="flex-1"
            >
              Mot de passe
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setShowFaceFailModal(false);
                handleFaceLogin();
              }}
              className="flex-1"
            >
              Réessayer
            </Button>
          </>
        }
      >
        Votre visage n'a pas été reconnu. Voulez-vous réessayer ou utiliser
        votre mot de passe ?
      </Modal>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   ALREADY SIGNED IN CARD
   ────────────────────────────────────────────────────────────────────── */
function AlreadySignedInCard({ user, onGoToNotes, onLogout }) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await onLogout();
    setLoggingOut(false);
  };

  return (
    <Card className="w-[420px] max-w-[95vw] p-8 flex flex-col items-center gap-5 text-center">
      {/* Icon */}
      <span className="w-16 h-16 inline-flex items-center justify-center rounded-2xl bg-[rgba(122,53,242,0.12)] dark:bg-[rgba(155,112,229,0.15)]">
        <IoCheckmarkDoneCircleOutline className="w-9 h-9 text-tech-violet dark:text-biometric-glow" />
      </span>

      {/* Text */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[20px] font-bold text-title m-0">
          Déjà connecté(e)
        </h2>
        <p className="text-[14px] text-body m-0">
          Vous êtes connecté(e) en tant que{" "}
          <span className="font-semibold text-title">
            {user?.name || "Utilisateur"}
          </span>
          .
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2.5 w-full mt-1">
        <Button
          variant="primary"
          size="md"
          onClick={onGoToNotes}
          className="btn-shimmer w-full rounded-full!"
        >
          <LuNotebook />
          Accéder à mes notes
        </Button>
        <Button
          variant="ghost"
          size="md"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full rounded-full!"
        >
          {loggingOut ? (
            <Spinner />
          ) : (
            <LuLogOut className="w-4 h-4" />
          )}
          {loggingOut ? "Déconnexion…" : "Se déconnecter"}
        </Button>
      </div>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   LOGIN PANEL
   ────────────────────────────────────────────────────────────────────── */
function LoginPanel({
  loading,
  showCamera,
  loginSuccess,
  showPasswordForm,
  password,
  setPassword,
  error,
  setError,
  setShowPasswordForm,
  handleFaceLogin,
  handlePasswordLogin,
  videoRef,
  canvasRef,
  onSwitchToSignup,
}) {
  const showCameraOverlay = showCamera || loginSuccess;

  return (
    <Card className="w-[420px] max-w-[95vw] h-[420px] p-6 flex flex-col gap-4 overflow-hidden">
      {/* Tabs */}
      <TabBar isLogin={true} onLogin={() => {}} onSignup={onSwitchToSignup} />

      {/*
        Camera area — always mounted (CSS show/hide, not conditional rendering).
        This ensures videoRef.current is never null when handleFaceLogin runs.
      */}
      <div className={showCameraOverlay ? "flex-1 flex flex-col items-center justify-center gap-3" : "hidden"}>
        <div className="relative w-[180px] h-[180px] rounded-2xl overflow-hidden border-2 border-tech-violet dark:border-biometric-glow bg-section-alt">
          {/* Video always in DOM; hidden after success */}
          <video
            ref={videoRef}
            width="320"
            height="240"
            autoPlay
            muted
            playsInline
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              loginSuccess && "hidden"
            )}
          />
          {/* Success checkmark */}
          {loginSuccess && (
            <div className="absolute inset-0 flex items-center justify-center text-signal-teal">
              <IoCheckmarkDoneCircleOutline size={90} />
            </div>
          )}
          <canvas ref={canvasRef} width="320" height="240" className="hidden" />
        </div>
        <p className="text-[13px] text-muted-token text-center m-0">
          {loginSuccess ? "Connexion réussie. Redirection…" : "Restez immobile…"}
        </p>
      </div>

      {/* Default state */}
      {!showCameraOverlay && !showPasswordForm && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="text-center mb-1">
            <p className="text-[14px] text-muted-token m-0">
              Votre visage suffit. Pas de mot de passe à retenir.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleFaceLogin}
            disabled={loading}
            className="btn-shimmer w-full rounded-full!"
          >
            <LuScanFace />
            Se connecter avec mon visage
          </Button>

          <button
            type="button"
            onClick={() => setShowPasswordForm(true)}
            className="text-[13px] text-tech-violet dark:text-biometric-glow font-medium hover:underline transition-colors duration-200"
          >
            Utiliser le mot de passe
          </button>
        </div>
      )}

      {/* Password form */}
      {showPasswordForm && !showCameraOverlay && (
        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          onSubmit={handlePasswordLogin}
          className="flex-1 flex flex-col justify-center gap-3"
        >
          <FormField
            icon={LuKeyRound}
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />

          {error && (
            <p className="text-[13px] text-secure-coral flex items-center gap-2 m-0">
              <LuTriangleAlert className="w-4 h-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex gap-2.5">
            <Button
              variant="ghost"
              size="md"
              type="button"
              onClick={() => {
                setShowPasswordForm(false);
                setPassword("");
                setError("");
              }}
              className="flex-1 rounded-full!"
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={loading}
              className="btn-shimmer flex-1 rounded-full!"
            >
              {loading ? "…" : "Valider"}
            </Button>
          </div>
        </motion.form>
      )}
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   SIGNUP PANEL
   ────────────────────────────────────────────────────────────────────── */
function SignupPanel({
  loading,
  name,
  setName,
  signupPassword,
  setSignupPassword,
  showCapture,
  captureProgress,
  processingSignup,
  success,
  videoRef,
  canvasRef,
  handleFullSignup,
  onSwitchToLogin,
}) {
  /* Phase label for the status line */
  const phaseLabel = (() => {
    if (success) return null;
    if (processingSignup) return "Analyse biométrique en cours…";
    if (captureProgress === 0) return "Positionnez votre visage…";
    if (captureProgress < 5) return `Photo ${captureProgress} sur 5 capturée`;
    return "Préparation de l'envoi…";
  })();

  return (
    <Card className="w-[420px] max-w-[95vw] h-[420px] p-6 flex flex-col gap-4 overflow-hidden">
      {/* Tabs */}
      <TabBar isLogin={false} onLogin={onSwitchToLogin} onSignup={() => {}} />

      {!showCapture ? (
        <form onSubmit={handleFullSignup} className="flex-1 flex flex-col justify-center gap-3">
          <FormField
            icon={LuUser}
            type="text"
            placeholder="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <FormField
            icon={LuKeyRound}
            type="password"
            placeholder="Mot de passe (min 8 caractères)"
            value={signupPassword}
            onChange={(e) => setSignupPassword(e.target.value)}
            required
          />
          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={loading}
            className="btn-shimmer w-full mt-2 rounded-full!"
          >
            <LuCamera />
            Capturer mon visage
          </Button>
        </form>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {/* Camera / success frame */}
          <div className="relative w-[160px] h-[160px] rounded-2xl overflow-hidden border-2 border-tech-violet dark:border-biometric-glow bg-section-alt">
            {success ? (
              <div className="absolute inset-0 flex items-center justify-center text-signal-teal">
                <IoCheckmarkDoneCircleOutline size={80} />
              </div>
            ) : processingSignup ? (
              /* Processing overlay — hide video, show spinner */
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-section-alt">
                <Spinner className="text-tech-violet dark:text-biometric-glow w-8 h-8" />
              </div>
            ) : (
              <video
                ref={videoRef}
                width="320"
                height="240"
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <canvas ref={canvasRef} width="320" height="240" className="hidden" />

            {/* Capture flash dots — overlay on the video (hidden during processing/success) */}
            {!processingSignup && !success && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.span
                    key={n}
                    animate={{
                      scale: captureProgress >= n ? 1 : 0.7,
                      opacity: captureProgress >= n ? 1 : 0.35,
                    }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className={cn(
                      "w-2 h-2 rounded-full",
                      captureProgress >= n
                        ? "bg-signal-teal"
                        : "bg-zinc-400"
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Progress bar + status */}
          <div className="w-full flex flex-col gap-2">
            {/* Animated progress bar */}
            <div className="w-full h-1.5 rounded-full bg-section-alt overflow-hidden">
              <motion.div
                animate={{
                  width: processingSignup
                    ? "100%"
                    : `${(captureProgress / 5) * 100}%`,
                }}
                transition={{ duration: 0.4, ease: EASE }}
                className={cn(
                  "h-full rounded-full",
                  processingSignup
                    ? "bg-tech-violet dark:bg-biometric-glow"
                    : "bg-tech-violet dark:bg-biometric-glow"
                )}
              />
            </div>

            {/* Status line */}
            <AnimatePresence mode="wait">
              {success ? (
                <motion.p
                  key="success"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="text-[13px] inline-flex items-center justify-center gap-1.5 text-signal-teal m-0"
                >
                  <LuCheck className="w-4 h-4" />
                  Enregistrement réussi !
                </motion.p>
              ) : (
                <motion.p
                  key={phaseLabel}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="text-[13px] text-muted-token text-center m-0 inline-flex items-center justify-center gap-1.5"
                >
                  {processingSignup && <Spinner />}
                  {phaseLabel}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </Card>
  );
}
