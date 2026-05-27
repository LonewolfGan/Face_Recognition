"""Gunicorn configuration for Render deployment.

The FaceService now loads models (YuNet + SFace via OpenCV DNN) synchronously
at app startup — no background thread needed, no TensorFlow involved.
post_fork is kept as a no-op hook for future use.
"""


def post_fork(server, worker):
    pass
