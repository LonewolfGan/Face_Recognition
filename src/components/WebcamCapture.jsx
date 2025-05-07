import "../styles/components/webcam-capture.css";
import React, { useRef, useState, useEffect } from "react";

const WebcamCapture = ({ onCapture, onError, guidanceText, captureCount = 5, autoStart = false }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [countdown, setCountdown] = useState(3);

  // Démarrer la webcam
  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Erreur d'accès à la webcam:", err);
      onError && onError("Impossible d'accéder à la caméra. Veuillez vérifier les permissions.");
      return false;
    }
  };

  // Arrêter la webcam
  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStream(null);
    }
  };

  // Capturer une image
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const context = canvasRef.current.getContext("2d");
    const { videoWidth, videoHeight } = videoRef.current;
    
    // Définir les dimensions du canvas pour correspondre à la vidéo
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;
    
    // Dessiner l'image de la vidéo sur le canvas
    context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
    
    // Convertir en base64
    return canvasRef.current.toDataURL("image/jpeg");
  };

  // Démarrer le processus de capture
  const startCapture = async () => {
    const webcamStarted = await startWebcam();
    if (!webcamStarted) return;
    
    setIsCapturing(true);
    setCaptureProgress(0);
    
    // Compte à rebours avant de commencer
    setCountdown(3);
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Capturer plusieurs images
    const capturedImages = [];
    for (let i = 0; i < captureCount; i++) {
      // Attendre un peu entre chaque capture
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const imageData = captureImage();
      if (imageData) {
        capturedImages.push(imageData);
        setCaptureProgress(i + 1);
      }
    }
    
    // Terminer la capture
    setIsCapturing(false);
    stopWebcam();
    
    // Envoyer les images capturées
    if (capturedImages.length > 0) {
      onCapture && onCapture(capturedImages);
    } else {
      onError && onError("Aucune image n'a pu être capturée.");
    }
  };

  // Démarrage automatique si demandé
  useEffect(() => {
    if (autoStart) {
      startCapture();
    }
    
    return () => {
      stopWebcam();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return (
    <div className="webcam-capture">
      <div className="webcam-container">
        {/* Vidéo de la webcam */}
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            borderRadius: "8px",
            transform: "scaleX(-1)" // Effet miroir
          }}
        />
        
        {/* Canvas pour la capture (invisible) */}
        <canvas 
          ref={canvasRef} 
          style={{ display: "none" }}
        />
        
        {/* Guide de positionnement */}
        {stream && (
          <div className="face-guide">
            <div className="face-outline"></div>
            {isCapturing && countdown > 0 && (
              <div className="countdown">{countdown}</div>
            )}
            {isCapturing && countdown === 0 && (
              <div className="progress-indicator">
                <div className="progress-text">
                  Capture {captureProgress}/{captureCount}
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${(captureProgress / captureCount) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Texte d'aide */}
      <div className="guidance-text">
        {guidanceText || "Placez votre visage dans le cadre et restez immobile."}
      </div>
      
      {/* Bouton de démarrage (si pas en mode automatique) */}
      {!autoStart && !isCapturing && (
        <button 
          className="capture-button"
          onClick={startCapture}
          disabled={isCapturing}
        >
          Démarrer la capture
        </button>
      )}
    </div>
  );
};

export default WebcamCapture;