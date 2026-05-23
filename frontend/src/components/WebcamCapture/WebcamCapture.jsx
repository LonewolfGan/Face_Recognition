import './WebcamCapture.css';
import React, { useRef, useState, useEffect } from 'react';

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
          facingMode: 'user'
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
    try {
      const stopStream = async (s) => {
        if (!s) return;
        const tracks = s.getTracks();
        for (const track of tracks) {
          track.enabled = false;
          await new Promise(resolve => setTimeout(resolve, 100));
          track.stop();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      };

      if (streamRef.current) {
        await stopStream(streamRef.current);
        streamRef.current = null;
      }

      if (stream) {
        await stopStream(stream);
        setStream(null);
      }

      if (videoRef.current) {
        const videoElement = videoRef.current;
        if (videoElement.srcObject) {
          await stopStream(videoElement.srcObject);
          videoElement.srcObject = null;
        }
        videoElement.pause();
        videoElement.load();
      }

      if (videoRef.current) {
        if (videoRef.current.srcObject) {
          videoRef.current.srcObject = null;
        }
        videoRef.current.pause();
        videoRef.current.load();
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Erreur lors de l'arrêt de la webcam:", error);
    }
  };

  // Annuler la capture
  const handleCancel = () => {
    stopWebcam();
    setIsCapturing(false);
    setCaptureProgress(0);
    setHasStarted(false);
    onCancel && onCancel();
  };

  // Capturer une image
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return null;

    const context = canvasRef.current.getContext('2d');
    const { videoWidth, videoHeight } = videoRef.current;

    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);

    return canvasRef.current.toDataURL('image/jpeg');
  };

  // Démarrer le processus de capture
  const startCapture = async () => {
    if (hasStarted) return;

    setHasStarted(true);

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

      await stopWebcam();
      setIsCapturing(false);

      if (!isCapturing) return;

      if (capturedImages.length > 0) {
        onCapture && onCapture(capturedImages);
        onCancel && onCancel();
      } else {
        throw new Error("Aucune image n'a pu être capturée");
      }
    } catch (err) {
      console.error('Erreur lors de la capture:', err);
      onError && onError(err.message);
      stopWebcam();
      setIsCapturing(false);
      setHasStarted(false);
    }
  };

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  // Démarrage automatique si demandé
  useEffect(() => {
    let mounted = true;
    let timeoutId = null;

    if (autoStart && !hasStarted && mounted) {
      timeoutId = setTimeout(() => {
        if (mounted) {
          startCapture();
        }
      }, 100);
    }

    return () => {
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
          className="webcam-video"
        />

        <canvas
          ref={canvasRef}
          className="webcam-canvas-hidden"
        />

        {stream && (
          <div className="webcam-face-guide">
            <div className="webcam-face-outline"></div>
            {isCapturing && (
              <div className="webcam-progress-bar-container">
                <div
                  className="webcam-progress-bar-fill"
                  style={{ width: `${(captureProgress / 5) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="webcam-guidance-text">
        {guidanceText || 'Placez votre visage dans le cadre et restez immobile.'}
      </div>

      <div className="webcam-controls">
        {!autoStart && !isCapturing && (
          <button
            className="webcam-capture-button"
            onClick={startCapture}
            disabled={isCapturing}
          >
            Démarrer la capture
          </button>
        )}

        {isCapturing && (
          <button
            className="webcam-cancel-button"
            onClick={handleCancel}
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
};

export default WebcamCapture;
