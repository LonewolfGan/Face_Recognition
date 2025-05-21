import "../styles/components/webcam-capture.css";
import React, { useRef, useState, useEffect } from "react";

const WebcamCapture = ({ onCapture, onError, onCancel, guidanceText, autoStart = false }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const streamRef = useRef(null);

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
        streamRef.current = mediaStream;
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
  const stopWebcam = async () => {
    console.log("Arrêt de la webcam");
    try {
      // Fonction pour arrêter un stream
      const stopStream = async (stream, source) => {
        if (!stream) return;
        const tracks = stream.getTracks();
        console.log(`Arrêt des tracks de ${source}:`, tracks.length);
        
        for (const track of tracks) {
          track.enabled = false;
          await new Promise(resolve => setTimeout(resolve, 100));
          track.stop();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      };

      // Arrêter le stream stocké dans la ref
      if (streamRef.current) {
        await stopStream(streamRef.current, "streamRef");
        streamRef.current = null;
      }

      // Arrêter le stream stocké dans l'état
      if (stream) {
        await stopStream(stream, "state");
        setStream(null);
      }

      // Nettoyer l'élément vidéo
      if (videoRef.current) {
        const videoElement = videoRef.current;
        if (videoElement.srcObject) {
          await stopStream(videoElement.srcObject, "videoElement");
          videoElement.srcObject = null;
        }
        videoElement.pause();
        videoElement.load();
      }

      // Vérification finale et nettoyage supplémentaire
      if (videoRef.current) {
        if (videoRef.current.srcObject) {
          console.log("Nettoyage supplémentaire nécessaire");
          videoRef.current.srcObject = null;
        }
        videoRef.current.pause();
        videoRef.current.load();
      }

      // Forcer le garbage collector
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log("Webcam arrêtée avec succès");
    } catch (error) {
      console.error("Erreur lors de l'arrêt de la webcam:", error);
    }
  };

  // Annuler la capture
  const handleCancel = () => {
    console.log("Annulation de la capture");
    stopWebcam();
    setIsCapturing(false);
    setCaptureProgress(0);
    setHasStarted(false);
    onCancel && onCancel();
  };

  // Capturer une image
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return null;

    const context = canvasRef.current.getContext("2d");
    const { videoWidth, videoHeight } = videoRef.current;

    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);

    return canvasRef.current.toDataURL("image/jpeg");
  };

  // Démarrer le processus de capture
  const startCapture = async () => {
    if (hasStarted) {
      console.log("Capture déjà démarrée, arrêt");
      return;
    }

    setHasStarted(true);
    console.log("Démarrage de la capture");

    const webcamStarted = await startWebcam();
    if (!webcamStarted) {
      setHasStarted(false);
      return;
    }

    setIsCapturing(true);
    setCaptureProgress(0);

    try {
      const capturedImages = [];
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const imageData = captureImage();
        if (imageData) {
          capturedImages.push(imageData);
          setCaptureProgress(i + 1);
        }
      }

      console.log("Capture terminée, arrêt de la caméra");
      await stopWebcam();
      setIsCapturing(false);

      // Ne pas envoyer les images si l'utilisateur a annulé
      if (!isCapturing) {
        console.log("Capture annulée, images non envoyées");
        return;
      }

      if (capturedImages.length > 0) {
        console.log("Envoi des images capturées");
        onCapture && onCapture(capturedImages);
        // Fermer le modal immédiatement après l'envoi des images
        onCancel && onCancel();
      } else {
        throw new Error("Aucune image n'a pu être capturée");
      }
    } catch (err) {
      console.error("Erreur lors de la capture:", err);
      onError && onError(err.message);
      stopWebcam();
      setIsCapturing(false);
      setHasStarted(false);
    }
  };

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      console.log("Nettoyage du composant");
      stopWebcam();
    };
  }, []);

  // Démarrage automatique si demandé
  useEffect(() => {
    let mounted = true;
    let timeoutId = null;

    if (autoStart && !hasStarted && mounted) {
      console.log("Démarrage automatique de la capture");
      timeoutId = setTimeout(() => {
        if (mounted) {
          startCapture();
        }
      }, 100);
    }

    return () => {
      console.log("Nettoyage de l'effet autoStart");
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      stopWebcam();
    };
  }, [autoStart, hasStarted]);

  // Nettoyage lors de la fermeture du modal
  useEffect(() => {
    return () => {
      console.log("Fermeture du modal");
      stopWebcam();
    };
  }, []);

  return (
    <div className="webcam-capture">
      <div className="webcam-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            borderRadius: "8px",
            transform: "scaleX(-1)"
          }}
        />

        <canvas
          ref={canvasRef}
          style={{ display: "none" }}
        />

        {stream && (
          <div className="face-guide">
            <div className="face-outline"></div>
            {isCapturing && (
              <>
                <div
                  style={{
                    width: "80%",
                    height: 10,
                    background: "var(--bg)",
                    borderRadius: 6,
                    margin: "18px auto 0 auto",
                    position: "absolute",
                    bottom: 30,
                    left: "10%",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(captureProgress / 5) * 100}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, var(--accent) 60%, #6366f1 100%)",
                      borderRadius: 6,
                      transition: "width 0.5s",
                    }}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="guidance-text">
        {guidanceText || "Placez votre visage dans le cadre et restez immobile."}
      </div>

      <div className="webcam-controls" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        {!autoStart && !isCapturing && (
          <button
            className="capture-button"
            onClick={startCapture}
            disabled={isCapturing}
          >
            Démarrer la capture
          </button>
        )}

        {isCapturing && (
          <button
            className="cancel-button"
            onClick={handleCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e53935',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
};

export default WebcamCapture;