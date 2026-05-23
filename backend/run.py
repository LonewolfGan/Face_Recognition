"""Entry point for the Face Recognition Notes application."""

import os
import sys

from app import create_app

config_name = os.getenv("FLASK_ENV", "development")
app = create_app(config_name)


def _warmup_deepface():
    """Download and cache DeepFace model weights before serving requests."""
    try:
        import tempfile
        import numpy as np
        import cv2
        from deepface import DeepFace

        model_name = app.config.get("MODEL_NAME", "ArcFace")
        detector = app.config.get("DETECTOR_BACKEND", "ssd")

        app.logger.info("Warming up DeepFace model '%s' — this may take a moment on first run…", model_name)

        dummy = np.zeros((112, 112, 3), dtype=np.uint8)
        fd, tmp = tempfile.mkstemp(suffix=".jpg")
        os.close(fd)
        cv2.imwrite(tmp, dummy)

        DeepFace.represent(
            img_path=tmp,
            model_name=model_name,
            detector_backend=detector,
            enforce_detection=False,
        )
        os.remove(tmp)
        app.logger.info("DeepFace model ready.")
    except Exception as e:
        app.logger.warning("DeepFace warmup failed (face features may be slow on first use): %s", e)


if __name__ == "__main__":
    # Only warmup in the main process, not in the reloader child
    if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        with app.app_context():
            _warmup_deepface()

    port = int(os.getenv("PORT", "8000"))
    app.run(host="localhost", port=port)
