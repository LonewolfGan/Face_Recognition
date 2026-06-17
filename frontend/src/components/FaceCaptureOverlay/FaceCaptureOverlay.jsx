/**
 * FaceCaptureOverlay — high-quality face capture overlay.
 * Circular camera frame with pulsing radar rings during scanning,
 * progress dots, and cancel button.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LuScanFace, LuX } from 'react-icons/lu';
import { IoCheckmarkDoneCircleOutline } from 'react-icons/io5';

const TOTAL_FRAMES = 5;
const CAPTURE_INTERVAL_MS = 800;
const WARMUP_MS = 1400;
const EASE = [0.16, 1, 0.3, 1];

export default function FaceCaptureOverlay({ onCapture, onCancel, onError }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [phase, setPhase]       = useState('starting'); // starting | scanning | done
  const [progress, setProgress] = useState(0);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handleCancel = useCallback(() => {
    stopStream();
    onCancel?.();
  }, [stopStream, onCancel]);

  useEffect(() => {
    let captureInterval = null;
    let mounted = true;

    const run = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        await new Promise(r => setTimeout(r, WARMUP_MS));
        if (!mounted) return;

        setPhase('scanning');
        const images = [];
        let count = 0;

        captureInterval = setInterval(() => {
          if (!mounted) { clearInterval(captureInterval); return; }
          if (videoRef.current && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0, 320, 240);
            images.push(canvasRef.current.toDataURL('image/jpeg', 0.92));
            count++;
            setProgress(count);
          }
          if (count >= TOTAL_FRAMES) {
            clearInterval(captureInterval);
            stopStream();
            setPhase('done');
            setTimeout(() => { if (mounted) onCapture?.(images); }, 700);
          }
        }, CAPTURE_INTERVAL_MS);

      } catch {
        if (!mounted) return;
        onError?.("Impossible d'accéder à la caméra. Vérifiez les permissions.");
        onCancel?.();
      }
    };

    run();
    return () => {
      mounted = false;
      if (captureInterval) clearInterval(captureInterval);
      stopStream();
    };
  }, []); // eslint-disable-line

  const statusText =
    phase === 'starting' ? 'Initialisation de la caméra…' :
    phase === 'scanning' ? 'Regardez la caméra et restez immobile' :
    'Traitement en cours…';

  const FRAME_SIZE = 200;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10,5,20,0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        transition={{ duration: 0.28, ease: EASE }}
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-neutral)',
          borderRadius: 20,
          padding: '32px 28px',
          width: '100%', maxWidth: 340,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
          position: 'relative',
          boxShadow: '0 24px 60px rgba(0,0,0,0.32)',
          margin: '0 16px',
        }}
      >
        {/* Close button */}
        {phase !== 'done' && (
          <button
            onClick={handleCancel}
            type="button"
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 30, height: 30,
              border: '1px solid var(--border-neutral)',
              borderRadius: 8, background: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-muted)',
              transition: 'color 0.15s, background-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-title)'; e.currentTarget.style.backgroundColor = 'var(--border-neutral)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <LuX size={14} />
          </button>
        )}

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, textAlign: 'center', paddingRight: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LuScanFace size={17} style={{ color: 'var(--color-tech-violet, #7A35F2)', flexShrink: 0 }} />
            <span style={{
              fontSize: '1rem', fontWeight: 700,
              color: 'var(--text-title)', fontFamily: 'var(--font-heading)',
              letterSpacing: '-0.01em',
            }}>
              Reconnaissance faciale
            </span>
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
            Enregistrement d'un nouveau visage
          </span>
        </div>

        {/* Camera frame */}
        <div style={{ position: 'relative', width: FRAME_SIZE, height: FRAME_SIZE, flexShrink: 0 }}>
          {/* Pulsing radar rings — premium scanning indicator */}
          {phase === 'scanning' && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none', zIndex: -1,
            }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  style={{
                    position: 'absolute',
                    width: FRAME_SIZE, height: FRAME_SIZE,
                    borderRadius: '50%',
                    border: '1.5px solid rgba(122,53,242,0.35)',
                  }}
                  initial={{ opacity: 0.6, scale: 0.92 }}
                  animate={{ opacity: 0, scale: 1.5 }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    delay: i * 0.6,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>
          )}
          <div style={{
            width: FRAME_SIZE, height: FRAME_SIZE,
            borderRadius: '50%',
            border: `2.5px solid ${phase === 'done' ? 'rgba(122,53,242,1)' : 'rgba(122,53,242,0.75)'}`,
            background: 'var(--sidebar-bg)',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 0 32px rgba(122,53,242,0.22)',
            transition: 'border-color 0.4s',
          }}>
            {/* Live video */}
            <video
              ref={videoRef}
              width="320" height="240"
              autoPlay muted playsInline
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
                display: phase === 'done' ? 'none' : 'block',
              }}
            />
            <canvas ref={canvasRef} width="320" height="240" style={{ display: 'none' }} />

            {/* Success checkmark */}
            {phase === 'done' && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: EASE }}
                style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)',
                }}
              >
                <IoCheckmarkDoneCircleOutline size={Math.round(FRAME_SIZE * 0.52)} />
              </motion.div>
            )}
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Array.from({ length: TOTAL_FRAMES }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                backgroundColor: i < progress
                  ? 'var(--color-tech-violet, #7A35F2)'
                  : 'var(--border-neutral)',
                scale: i < progress ? 1 : 0.8,
              }}
              transition={{ duration: 0.2 }}
              style={{ width: 8, height: 8, borderRadius: '50%' }}
            />
          ))}
        </div>

        {/* Status text */}
        <p style={{
          margin: 0, fontSize: '0.8125rem',
          color: 'var(--text-muted)', textAlign: 'center',
          fontFamily: 'var(--font-sans)', lineHeight: 1.5,
        }}>
          {statusText}
        </p>

        {/* Cancel button */}
        {phase !== 'done' && (
          <button
            onClick={handleCancel}
            type="button"
            style={{
              height: 38, padding: '0 20px',
              background: 'none',
              border: '1px solid var(--border-neutral)',
              borderRadius: 8,
              fontSize: '0.875rem', fontWeight: 500,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-title)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-neutral)'; }}
          >
            Annuler
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
