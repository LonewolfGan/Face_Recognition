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
  LuShieldCheck,
  LuFolderLock,
  LuWifiOff,
  LuSun,
  LuMoon,
  LuEye,
  LuEyeOff,
} from "react-icons/lu";
import { IoCheckmarkDoneCircleOutline } from "react-icons/io5";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useToastContext } from "../../context/ToastContext";
import { API_URL } from "../../config";
import { Button } from "../../components/ui";
import { cn } from "../../lib/utils";
import { useTheme } from "../../theme";

const EASE = [0.16, 1, 0.3, 1];

/* ─── Spinner ──────────────────────────────────────────────────────── */
function Spinner({ className }) {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={cn("inline-flex shrink-0", className)}
    >
      <LuLoader className="w-4 h-4" />
    </motion.span>
  );
}

/* ─── Theme Toggle ─────────────────────────────────────────────────── */
function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();
  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      aria-label={isDarkMode ? "Mode clair" : "Mode sombre"}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.18 }}
      className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-neutral text-title hover:bg-section-alt transition-colors duration-200"
    >
      {isDarkMode ? <LuSun className="w-4 h-4" /> : <LuMoon className="w-4 h-4" />}
    </motion.button>
  );
}

/* ─── Modal ────────────────────────────────────────────────────────── */
function Modal({ open, onClose, icon: Icon, title, children, actions }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,5,20,0.65)", backdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[400px]"
          >
            <div className="surface-card border border-neutral rounded-2xl p-7 flex flex-col gap-5 relative">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 w-7 h-7 inline-flex items-center justify-center rounded-lg text-muted-token hover:text-title hover:bg-section-alt transition-colors duration-150"
              >
                <LuX className="w-4 h-4" />
              </button>
              <div className="flex items-start gap-3">
                {Icon && (
                  <span className="w-10 h-10 inline-flex items-center justify-center rounded-xl shrink-0"
                    style={{ background: "rgba(122,53,242,0.12)", color: "#7A35F2" }}>
                    <Icon className="w-5 h-5" />
                  </span>
                )}
                <h3 className="text-[17px] font-bold text-title m-0 mt-1 leading-snug pr-6">{title}</h3>
              </div>
              <p className="text-[14px] leading-relaxed text-body m-0">{children}</p>
              <div className="flex gap-2.5 mt-1">{actions}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── PasswordInput ────────────────────────────────────────────────── */
function PasswordInput({ value, onChange, placeholder, autoFocus, required }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative flex items-center">
      <LuKeyRound className="absolute left-4 w-4 h-4 text-muted-token pointer-events-none" />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required={required}
        autoComplete="current-password"
        className={cn(
          "w-full h-12 rounded-xl border border-neutral surface-card text-title",
          "text-[15px] pl-10 pr-10 transition-colors duration-200",
          "focus-visible:outline-none focus-visible:border-tech-violet dark:focus-visible:border-biometric-glow"
        )}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 text-muted-token hover:text-title transition-colors"
        tabIndex={-1}
      >
        {show ? <LuEyeOff className="w-4 h-4" /> : <LuEye className="w-4 h-4" />}
      </button>
    </span>
  );
}

/* ─── FormField ────────────────────────────────────────────────────── */
function FormField({ icon: Icon, ...inputProps }) {
  return (
    <span className="relative flex items-center">
      {Icon && <Icon className="absolute left-4 w-4 h-4 text-muted-token pointer-events-none" />}
      <input
        {...inputProps}
        className={cn(
          "w-full h-12 rounded-xl border border-neutral surface-card text-title",
          "text-[15px] px-4 transition-colors duration-200",
          "focus-visible:outline-none focus-visible:border-tech-violet dark:focus-visible:border-biometric-glow",
          Icon && "pl-10"
        )}
      />
    </span>
  );
}

/* ─── ScanRing ─────────────────────────────────────────────────────── */
function ScanRing({ active, success }) {
  return (
    <div className="relative flex items-center justify-center">
      {active && !success && [0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border"
          style={{ borderColor: "rgba(122,53,242,0.35)" }}
          initial={{ width: 160, height: 160, opacity: 0.6 }}
          animate={{ width: 160 + (i + 1) * 36, height: 160 + (i + 1) * 36, opacity: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.55, ease: "easeOut" }}
        />
      ))}
      {success && [0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border"
          style={{ borderColor: "rgba(122,53,242,0.45)" }}
          initial={{ width: 160, height: 160, opacity: 0.7 }}
          animate={{ width: 220 + i * 30, height: 220 + i * 30, opacity: 0 }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/* ─── CameraFrame ──────────────────────────────────────────────────── */
function CameraFrame({ videoRef, canvasRef, showScan, success, size = 160 }) {
  const borderColor = success ? "rgba(122,53,242,0.9)" : "rgba(122,53,242,0.8)";
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <ScanRing active={showScan} success={success} />
      <div
        className="relative overflow-hidden"
        style={{
          width: size, height: size,
          borderRadius: "50%",
          border: `2.5px solid ${borderColor}`,
          background: "var(--color-section-alt, #f5f3ff)",
          transition: "border-color 0.4s ease",
          boxShadow: "0 0 24px rgba(122,53,242,0.22)",
        }}
      >
        <video
          ref={videoRef}
          width="320" height="240"
          autoPlay muted playsInline
          className={cn("absolute inset-0 w-full h-full object-cover", success && "hidden")}
        />
        {success && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ color: "#7A35F2" }}>
            <IoCheckmarkDoneCircleOutline size={size * 0.52} />
          </div>
        )}
        <canvas ref={canvasRef} width="320" height="240" className="hidden" />
        {showScan && !success && (
          <motion.div
            className="absolute left-0 right-0 h-0.5 pointer-events-none"
            style={{ background: "linear-gradient(to right, transparent, rgba(122,53,242,0.7), transparent)" }}
            animate={{ top: ["10%", "90%", "10%"] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        {showScan && !success && (
          <>
            {[
              { top: 8, left: 8, rotate: 0 },
              { top: 8, right: 8, rotate: 90 },
              { bottom: 8, right: 8, rotate: 180 },
              { bottom: 8, left: 8, rotate: 270 },
            ].map((pos, i) => (
              <div key={i} className="absolute" style={{ ...pos, width: 14, height: 14 }}>
                <svg viewBox="0 0 14 14" fill="none" style={{ transform: `rotate(${pos.rotate}deg)` }}>
                  <path d="M0 7V0H7" stroke="rgba(122,53,242,0.9)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Left branding panel ──────────────────────────────────────────── */
function BrandPanel({ isDarkMode }) {
  const features = [
    { icon: LuScanFace,    label: "Reconnaissance faciale en temps réel" },
    { icon: LuFolderLock,  label: "Notes privées, jamais partagées" },
    { icon: LuShieldCheck, label: "Chiffrement côté appareil" },
    { icon: LuWifiOff,     label: "Fonctionne hors ligne" },
  ];

  return (
    <div
      className="hidden lg:flex flex-col justify-start gap-16 p-10 relative overflow-hidden h-full min-h-screen border-r-[0px]"
      style={{
        background: isDarkMode
          ? "linear-gradient(145deg, #0f0620 0%, #1A0D30 50%, #130825 100%)"
          : "linear-gradient(145deg, #f5f0ff 0%, #ede8ff 50%, #e8f0ff 100%)",
      }}
    >
      {/* Radial glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDarkMode
            ? "radial-gradient(ellipse at 30% 40%, rgba(122,53,242,0.18) 0%, transparent 65%)"
            : "radial-gradient(ellipse at 30% 40%, rgba(122,53,242,0.1) 0%, transparent 65%)",
        }}
      />
      {/* Grid overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: isDarkMode
            ? "linear-gradient(rgba(122,53,242,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(122,53,242,0.06) 1px, transparent 1px)"
            : "linear-gradient(rgba(122,53,242,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(122,53,242,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10">
        <a href="/" className="inline-flex items-center gap-2.5 group">
          <img
            src={isDarkMode ? "/logodark.png" : "/logolight.png"}
            alt=""
            style={{ height: 32, width: "auto" }}
          />
          <span
            className="text-[20px] font-bold tracking-[-0.02em]"
            style={{ fontFamily: '"Syne", sans-serif', color: isDarkMode ? "#f4f4f5" : "#7A35F2" }}
          >
            PrivyNote
          </span>
        </a>
      </div>

      <div className="relative z-10 flex flex-col gap-8">
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="text-[2.2rem] font-black leading-[1.15] m-0 tracking-[-0.03em]"
            style={{ fontFamily: '"Syne", sans-serif', color: isDarkMode ? "#f4f4f5" : "#1a0d30" }}
          >
            Vos notes,<br />
            <span style={{ color: "#7A35F2" }}>protégées</span><br />
            par votre visage.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="text-[15px] leading-relaxed mt-4 m-0 max-w-[280px]"
            style={{ color: isDarkMode ? "rgba(209,188,249,0.6)" : "rgba(80,50,130,0.7)" }}
          >
            Plus de mots de passe à mémoriser. Votre visage est la clé.
          </motion.p>
        </div>

        <div className="flex flex-col gap-3">
          {features.map(({ icon: Icon, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.2 + i * 0.07, ease: EASE }}
              className="flex items-center gap-3"
            >
              <span
                className="w-8 h-8 rounded-lg inline-flex items-center justify-center shrink-0"
                style={{
                  background: isDarkMode ? "rgba(122,53,242,0.15)" : "rgba(122,53,242,0.1)",
                  color: "#7A35F2",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span
                className="text-[13.5px] font-medium"
                style={{ color: isDarkMode ? "rgba(209,188,249,0.75)" : "rgba(80,50,130,0.8)" }}
              >
                {label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

    </div>
  );
}

/* ─── Tab buttons (box style — one filled, one not) ───────────────── */
function TabBar({ isLogin, onLogin, onSignup }) {
  return (
    <div className="grid grid-cols-2 p-1 rounded-xl bg-section-alt border border-neutral gap-1">
      <button
        type="button"
        onClick={onLogin}
        className={cn(
          "h-9 text-[14px] font-semibold rounded-lg transition-all duration-200",
          isLogin ? "bg-tech-violet text-zinc-50 shadow-sm" : "text-muted-token hover:text-title"
        )}
      >
        Connexion
      </button>
      <button
        type="button"
        onClick={onSignup}
        className={cn(
          "h-9 text-[14px] font-semibold rounded-lg transition-all duration-200",
          !isLogin ? "bg-tech-violet text-zinc-50 shadow-sm" : "text-muted-token hover:text-title"
        )}
      >
        Inscription
      </button>
    </div>
  );
}

/* ─── 3D flip variants (direction-aware via custom prop) ───────────── */
const flipVariants = {
  enter: (dir) => ({
    rotateY: dir > 0 ? 90 : -90,
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    rotateY: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.48, ease: EASE },
  },
  exit: (dir) => ({
    rotateY: dir > 0 ? -90 : 90,
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.32, ease: [0.4, 0, 1, 1] },
  }),
};

/* ═══════════════════════════════════════════════════════════════════
   AuthPage (main)
   ═══════════════════════════════════════════════════════════════════ */
export default function AuthPage() {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname === "/login");
  const [flipDirection, setFlipDirection] = useState(1); // 1 = login→signup, -1 = signup→login
  const { isDarkMode } = useTheme();

  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showFaceFailModal, setShowFaceFailModal] = useState(false);
  const [password, setPassword] = useState("");
  const [showNoFacesModal, setShowNoFacesModal] = useState(false);

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

  const handleFaceLogin = async () => {
    setShowCamera(true);
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 150));
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } else {
        throw new Error("Video element not mounted");
      }
      await new Promise((r) => setTimeout(r, 2000));
      if (videoRef.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        const imageData = canvasRef.current.toDataURL("image/jpeg");
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
        stream = null;
        const response = await axios.post(
          `${API_URL}${LOGIN_ENDPOINT}`,
          { image: imageData },
          { withCredentials: true }
        );
        const result = response.data;
        if (result.access_token || result.status === "success") {
          await login({ image: imageData });
          setLoginSuccess(true);
        } else if (result.status === "face_failed") {
          setShowFaceFailModal(true);
        } else {
          setError(result.message || "Echec inattendu");
          toast.error(result.message || "Echec inattendu");
        }
      }
    } catch (err) {
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

  const handleFullSignup = async (e) => {
    e.preventDefault();
    if (!name) return toast.error("Nom requis");
    if (!signupPassword) return toast.error("Mot de passe requis");
    if (signupPassword.length < 8 || signupPassword.length > 128)
      return toast.error("Le mot de passe doit contenir entre 8 et 128 caracteres.");
    setCaptureProgress(0);
    setProcessingSignup(false);
    setShowCapture(true);
  };

  useEffect(() => {
    let stream = null;
    let captureInterval = null;
    const startCapture = async () => {
      if (!showCapture || loading) return;
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error("L'API mediaDevices n'est pas disponible.");
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
                    try { await login({ password: signupPassword }); } catch {}
                    setShowCapture(false);
                    navigate("/notes");
                  }
                } catch (err) {
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
        toast.error("Erreur camera: " + err.message);
        setShowCapture(false);
      }
    };
    if (showCapture) startCapture();
    return () => {
      if (captureInterval) clearInterval(captureInterval);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [showCapture, loading, name, signupPassword, login, navigate, toast]);

  useEffect(() => {
    return () => {
      const videoEl = videoRef.current;
      if (videoEl?.srcObject) {
        videoEl.srcObject.getTracks().forEach((t) => t.stop());
        videoEl.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!loginSuccess) return;
    setLoading(false);
    const t = setTimeout(() => navigate("/notes"), 1500);
    return () => clearTimeout(t);
  }, [loginSuccess, navigate]);

  const handleTabSwitch = (toLogin) => {
    setFlipDirection(toLogin ? -1 : 1);
    setIsLogin(toLogin);
    setError("");
    setShowPasswordForm(false);
    setShowCamera(false);
    navigate(toLogin ? "/login" : "/signup");
  };

  return (
    <div className="min-h-screen w-full flex bg-page">
      {/* Left brand panel — full height */}
      <div className="w-[440px] shrink-0 self-stretch">
        <BrandPanel isDarkMode={isDarkMode} />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background image */}
        <img
          src="/face.png"
          alt=""
          aria-hidden="true"
          loading="eager"
          className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover z-0"
          style={{ opacity: isDarkMode ? 0.22 : 0.32, filter: "saturate(0.6)" }}
        />
        {/* Subtle grid */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            backgroundImage: isDarkMode
              ? "linear-gradient(rgba(122,53,242,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(122,53,242,0.05) 1px, transparent 1px)"
              : "linear-gradient(rgba(122,53,242,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(122,53,242,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Top-right radial glow */}
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 pointer-events-none z-[1]"
          style={{
            width: 400, height: 400,
            background: isDarkMode
              ? "radial-gradient(ellipse at top right, rgba(122,53,242,0.14) 0%, transparent 60%)"
              : "radial-gradient(ellipse at top right, rgba(122,53,242,0.08) 0%, transparent 60%)",
          }}
        />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-8 pt-6">
          <a
            href="/"
            className="lg:hidden inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-token hover:text-title transition-colors no-underline"
          >
            <LuArrowLeft className="w-3.5 h-3.5" />
            Retour
          </a>
          <span className="hidden lg:block" />
          <ThemeToggle />
        </div>

        {/* Centered form with 3D perspective container */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-8 py-8">
          <div className="w-full max-w-[420px]" style={{ perspective: "1200px" }}>
            <AnimatePresence mode="wait" custom={flipDirection}>
              {isAuthenticated ? (
                <motion.div
                  key="already-in"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.28, ease: EASE }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <AlreadySignedIn
                    user={user}
                    onGoToNotes={() => navigate("/notes")}
                    onLogout={async () => { await logout(); }}
                  />
                </motion.div>
              ) : isLogin ? (
                <motion.div
                  key="login"
                  custom={flipDirection}
                  variants={flipVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  style={{ transformStyle: "preserve-3d", transformOrigin: "center center" }}
                >
                  <LoginForm
                    isDarkMode={isDarkMode}
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
                  custom={flipDirection}
                  variants={flipVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  style={{ transformStyle: "preserve-3d", transformOrigin: "center center" }}
                >
                  <SignupForm
                    isDarkMode={isDarkMode}
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
        </div>
      </div>

      {/* Modals */}
      <Modal
        open={showNoFacesModal}
        onClose={() => setShowNoFacesModal(false)}
        icon={LuTriangleAlert}
        title="Aucun visage enregistre"
        actions={
          <>
            <Button variant="ghost" size="md" onClick={() => setShowNoFacesModal(false)} className="flex-1 rounded-xl!">
              Annuler
            </Button>
            <Button
              variant="primary" size="md"
              onClick={() => { setShowNoFacesModal(false); handleTabSwitch(false); }}
              className="flex-1 rounded-xl!"
            >
              S'inscrire <LuArrowRight />
            </Button>
          </>
        }
      >
        Aucun visage n'est enregistre. Veuillez vous inscrire pour ajouter votre signature biometrique.
      </Modal>

      <Modal
        open={showFaceFailModal}
        onClose={() => setShowFaceFailModal(false)}
        icon={LuX}
        title="Visage non reconnu"
        actions={
          <>
            <Button
              variant="ghost" size="md"
              onClick={() => { setShowFaceFailModal(false); setShowPasswordForm(true); }}
              className="flex-1 rounded-xl!"
            >
              Mot de passe
            </Button>
            <Button
              variant="primary" size="md"
              onClick={() => { setShowFaceFailModal(false); handleFaceLogin(); }}
              className="flex-1 rounded-xl!"
            >
              Reessayer
            </Button>
          </>
        }
      >
        Votre visage n'a pas ete reconnu. Voulez-vous reessayer ou utiliser votre mot de passe ?
      </Modal>
    </div>
  );
}

/* ─── Section heading ──────────────────────────────────────────────── */
function FormHeading({ title, subtitle }) {
  return (
    <div className="mb-2">
      <h1
        className="text-[26px] font-black tracking-[-0.03em] m-0 text-title leading-tight"
        style={{ fontFamily: '"Syne", sans-serif' }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="text-[14px] text-body mt-1.5 m-0">{subtitle}</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LOGIN FORM
   ═══════════════════════════════════════════════════════════════════ */
function LoginForm({
  isDarkMode, loading, showCamera, loginSuccess, showPasswordForm,
  password, setPassword, error, setError, setShowPasswordForm,
  handleFaceLogin, handlePasswordLogin, videoRef, canvasRef, onSwitchToSignup,
}) {
  const showCameraOverlay = showCamera || loginSuccess;

  return (
    <div className="surface-card border border-neutral rounded-2xl p-8 flex flex-col gap-5">
      <FormHeading
        title="Bon retour"
        subtitle="Connectez-vous avec votre visage ou votre mot de passe."
      />

      <TabBar isLogin={true} onLogin={() => {}} onSignup={onSwitchToSignup} />

      <AnimatePresence mode="wait">
        {showCameraOverlay ? (
          <motion.div
            key="cam"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="flex flex-col items-center gap-5 py-2"
          >
            <CameraFrame
              videoRef={videoRef}
              canvasRef={canvasRef}
              showScan={showCamera && !loginSuccess}
              success={loginSuccess}
              size={176}
            />
            <p className="text-[13.5px] text-muted-token text-center m-0 font-medium">
              {loginSuccess ? (
                <span className="flex items-center gap-1.5" style={{ color: "#7A35F2" }}>
                  <LuCheck className="w-4 h-4" /> Connexion reussie — redirection...
                </span>
              ) : "Restez immobile, analyse en cours..."}
            </p>
          </motion.div>
        ) : showPasswordForm ? (
          <motion.form
            key="pwd"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: EASE }}
            onSubmit={handlePasswordLogin}
            className="flex flex-col gap-3"
          >
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              autoFocus
              required
            />
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[13px] flex items-center gap-2 m-0 px-1"
                style={{ color: "#ef4444" }}
              >
                <LuTriangleAlert className="w-3.5 h-3.5 shrink-0" />
                {error}
              </motion.p>
            )}
            <div className="flex gap-2">
              <Button
                variant="ghost" size="md" type="button"
                onClick={() => { setShowPasswordForm(false); setPassword(""); setError(""); }}
                className="flex-1 rounded-xl! h-12!"
              >
                Annuler
              </Button>
              <Button variant="primary" size="md" type="submit" disabled={loading} className="flex-[2] rounded-xl! h-12!">
                {loading ? <><Spinner /> Connexion...</> : "Se connecter"}
              </Button>
            </div>
          </motion.form>
        ) : (
          <motion.div
            key="default"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="flex flex-col gap-3"
          >
            <Button
              variant="primary" size="lg"
              onClick={handleFaceLogin}
              disabled={loading}
              className="w-full rounded-xl! h-12! text-[15px]!"
            >
              <LuScanFace className="w-5 h-5" />
              Se connecter avec mon visage
            </Button>
            <div className="flex items-center gap-3 my-0.5">
              <div className="flex-1 h-px bg-neutral" />
              <span className="text-[12px] text-muted-token font-medium">ou</span>
              <div className="flex-1 h-px bg-neutral" />
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordForm(true)}
              className="w-full h-12 rounded-xl border border-neutral text-[14px] font-semibold text-title hover:bg-section-alt transition-colors duration-200"
            >
              Utiliser un mot de passe
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-[13px] text-muted-token m-0">
        Pas encore de compte ?{" "}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="font-semibold transition-colors duration-200 hover:underline"
          style={{ color: "#7A35F2" }}
        >
          S'inscrire
        </button>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SIGNUP FORM
   ═══════════════════════════════════════════════════════════════════ */
function SignupForm({
  isDarkMode, loading, name, setName, signupPassword, setSignupPassword,
  showCapture, captureProgress, processingSignup, success,
  videoRef, canvasRef, handleFullSignup, onSwitchToLogin,
}) {
  return (
    <div className="surface-card border border-neutral rounded-2xl p-8 flex flex-col gap-5">
      <FormHeading
        title={showCapture ? "Capture en cours" : "Creer un compte"}
        subtitle={showCapture
          ? "Restez face a la camera le temps de la capture."
          : "Renseignez vos informations, puis enregistrez votre visage."
        }
      />

      <TabBar isLogin={false} onLogin={onSwitchToLogin} onSignup={() => {}} />

      <AnimatePresence mode="wait">
        {showCapture ? (
          <motion.div
            key="capture"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="flex flex-col items-center gap-4 py-1"
          >
            <CameraFrame
              videoRef={videoRef}
              canvasRef={canvasRef}
              showScan={!processingSignup && !success}
              success={success}
              size={176}
            />
            <div className="w-full flex flex-col gap-2.5">
              <div className="w-full h-1 rounded-full bg-section-alt overflow-hidden">
                <motion.div
                  animate={{ width: processingSignup ? "100%" : `${(captureProgress / 5) * 100}%` }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="h-full rounded-full"
                  style={{ background: "#7A35F2" }}
                />
              </div>
              <p className="text-[13px] text-center text-muted-token m-0">
                {processingSignup
                  ? <span className="inline-flex items-center gap-2"><Spinner /> Enregistrement en cours...</span>
                  : success
                    ? <span style={{ color: "#7A35F2" }}>Terminé</span>
                    : "Restez face à la caméra"
                }
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="info"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: EASE }}
            onSubmit={handleFullSignup}
            className="flex flex-col gap-3"
          >
            <FormField
              icon={LuUser}
              type="text"
              placeholder="Nom complet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
            <PasswordInput
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              placeholder="Mot de passe (min. 8 caracteres)"
              required
            />
            <Button
              variant="primary" size="lg" type="submit"
              disabled={loading}
              className="w-full mt-1 rounded-xl! h-12! text-[15px]!"
            >
              <LuCamera className="w-4 h-4" />
              Continuer avec la camera
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ALREADY SIGNED IN
   ═══════════════════════════════════════════════════════════════════ */
function AlreadySignedIn({ user, onGoToNotes, onLogout }) {
  const [loggingOut, setLoggingOut] = useState(false);
  const handleLogout = async () => {
    setLoggingOut(true);
    await onLogout();
    setLoggingOut(false);
  };

  return (
    <div className="surface-card border border-neutral rounded-2xl p-8 flex flex-col items-center gap-6 text-center">
      <div className="w-16 h-16 rounded-2xl inline-flex items-center justify-center"
        style={{ background: "rgba(122,53,242,0.1)", color: "#7A35F2" }}>
        <IoCheckmarkDoneCircleOutline className="w-8 h-8" />
      </div>
      <div>
        <h2 className="text-[22px] font-black text-title m-0" style={{ fontFamily: '"Syne", sans-serif' }}>
          Deja connecte(e)
        </h2>
        <p className="text-[14px] text-body mt-2 m-0">
          Connecte(e) en tant que{" "}
          <span className="font-semibold text-title">{user?.name || "Utilisateur"}</span>
        </p>
      </div>
      <div className="flex flex-col gap-2.5 w-full">
        <Button variant="primary" size="lg" onClick={onGoToNotes} className="w-full rounded-xl! h-12!">
          <LuNotebook className="w-4 h-4" />
          Mes notes
        </Button>
        <Button variant="ghost" size="lg" onClick={handleLogout} disabled={loggingOut} className="w-full rounded-xl! h-12!">
          {loggingOut ? <Spinner /> : <LuLogOut className="w-4 h-4" />}
          {loggingOut ? "Deconnexion..." : "Se deconnecter"}
        </Button>
      </div>
    </div>
  );
}
