"""Gunicorn configuration for Render deployment.

With --preload the Flask app is imported once in the master process and
then forked into workers. Python threads do NOT survive a fork, so the
DeepFace warmup thread that was started in the master never runs inside
the worker. post_fork() re-launches it in every worker process so the
model is hot before the first real face-recognition request arrives.
"""

import os
import threading


def post_fork(server, worker):
    try:
        from app import _warmup_status, _warmup_lock, _warmup_deepface
        from run import app as flask_app

        with _warmup_lock:
            _warmup_status["state"] = "pending"

        model_name = os.environ.get("MODEL_NAME", "SFace")
        detector = os.environ.get("DETECTOR_BACKEND", "opencv")

        t = threading.Thread(
            target=_warmup_deepface,
            args=(model_name, detector, flask_app.logger),
            daemon=True,
            name="deepface-warmup",
        )
        t.start()
    except Exception as exc:
        server.log.warning("post_fork warmup start failed: %s", exc)
