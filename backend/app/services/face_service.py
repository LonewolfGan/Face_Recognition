"""Face detection, embedding generation, and recognition service.

Uses OpenCV DNN directly (YuNet + SFace) — NO TensorFlow dependency.
Memory footprint: ~50MB vs ~400MB with TensorFlow/ArcFace.
"""

import os
import base64
import uuid
import logging
import urllib.request

import cv2
import numpy as np

from .embedding_service import EmbeddingStore

logger = logging.getLogger(__name__)

SFACE_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"
YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
SFACE_FILENAME = "face_recognition_sface_2021dec.onnx"
YUNET_FILENAME = "face_detection_yunet_2023mar.onnx"


class FaceProcessingError(Exception):
    pass


class FaceNotFoundError(Exception):
    pass


def _get_model_dir(data_dir: str) -> str:
    deepface_dir = os.path.expanduser("~/.deepface/weights")
    if os.path.isdir(deepface_dir):
        return deepface_dir
    return data_dir


def _download_model(url: str, dest: str) -> None:
    logger.info("Downloading model from %s → %s", url, dest)
    tmp = dest + ".tmp"
    try:
        urllib.request.urlretrieve(url, tmp)
        os.replace(tmp, dest)
        logger.info("Downloaded %s (%.1f MB)", os.path.basename(dest), os.path.getsize(dest) / 1e6)
    except Exception:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise


class FaceService:
    """Handles face detection, embedding generation, and recognition.

    Uses OpenCV DNN exclusively — no TensorFlow, no deepface at inference time.
    YuNet detects and aligns faces; SFace generates 128-dimensional embeddings.
    """

    def __init__(
        self,
        embedding_store: EmbeddingStore,
        model_name: str = "SFace",
        detector_backend: str = "opencv",
        data_dir: str = "data/",
    ):
        self._embedding_store = embedding_store
        self._data_dir = data_dir
        self._detector = None
        self._recognizer = None
        self._models_ready = False
        self._load_models()

    def _load_models(self) -> None:
        model_dir = _get_model_dir(self._data_dir)
        os.makedirs(model_dir, exist_ok=True)

        sface_path = os.path.join(model_dir, SFACE_FILENAME)
        yunet_path = os.path.join(model_dir, YUNET_FILENAME)

        try:
            if not os.path.exists(sface_path):
                _download_model(SFACE_URL, sface_path)
            if not os.path.exists(yunet_path):
                _download_model(YUNET_URL, yunet_path)

            self._recognizer = cv2.FaceRecognizerSF.create(sface_path, "")
            self._detector = cv2.FaceDetectorYN.create(
                yunet_path, "", (320, 320), score_threshold=0.6, nms_threshold=0.3
            )
            self._models_ready = True
            logger.info("Face models ready (OpenCV DNN — TensorFlow-free).")
        except Exception as exc:
            logger.error("Failed to load face models: %s", exc, exc_info=True)
            self._models_ready = False

    def _ensure_models(self) -> None:
        if not self._models_ready:
            self._load_models()
        if not self._models_ready:
            raise FaceProcessingError("Face recognition models not available")

    def _get_embedding(self, image: np.ndarray) -> list[float]:
        self._ensure_models()

        h, w = image.shape[:2]
        self._detector.setInputSize((w, h))
        _, faces = self._detector.detect(image)

        if faces is None or len(faces) == 0:
            raise FaceProcessingError("no_face_in_image")

        face = faces[0]

        face_w = float(face[2])
        face_h = float(face[3])
        coverage = (face_w * face_h) / (w * h) if w and h else 0
        if coverage < 0.03:
            raise FaceProcessingError("no_face_in_image")

        aligned = self._recognizer.alignCrop(image, face)
        embedding = self._recognizer.feature(aligned)
        return embedding.flatten().tolist()

    def _decode_image(self, base64_str: str) -> np.ndarray | None:
        try:
            if "," in base64_str:
                base64_str = base64_str.split(",")[1]
            image_bytes = base64.b64decode(base64_str)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None:
                return None
            max_dim = 1280
            h, w = image.shape[:2]
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                image = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
            return image.astype(np.uint8)
        except Exception as exc:
            logger.warning("Error decoding image: %s", exc)
            return None

    def add_face(self, name: str, images: list[str]) -> tuple[str, str]:
        if not images:
            raise FaceProcessingError("No images provided")

        face_id = str(uuid.uuid4())
        embeddings = []

        for i, b64 in enumerate(images):
            image = self._decode_image(b64)
            if image is None:
                continue
            try:
                embeddings.append(self._get_embedding(image))
            except FaceProcessingError as exc:
                logger.warning("Image %d: %s", i + 1, exc)
            except Exception as exc:
                logger.warning("Error processing image %d: %s", i + 1, exc)

        if not embeddings:
            raise FaceProcessingError(
                "Aucun visage détecté dans les images fournies. "
                "Veuillez vous assurer que votre visage est bien visible."
            )

        self._embedding_store.add_embeddings(face_id, embeddings)
        logger.info("Face added: face_id=%s, name=%s, embeddings=%d", face_id, name, len(embeddings))
        return (face_id, name)

    def recognize_best(self, images: list[str]) -> tuple[str, float]:
        best_face_id = None
        best_distance = float("inf")
        no_face_count = 0
        last_not_found_error = None

        for i, image in enumerate(images):
            try:
                face_id, distance = self.recognize(image)
                if distance < best_distance:
                    best_distance = distance
                    best_face_id = face_id
            except FaceProcessingError:
                no_face_count += 1
                logger.debug("Frame %d: no face detected", i + 1)
            except FaceNotFoundError as exc:
                last_not_found_error = exc
                logger.debug("Frame %d: face found but no match", i + 1)

        if best_face_id is not None:
            logger.info("Best match across %d frames: face_id=%s, distance=%.4f", len(images), best_face_id, best_distance)
            return (best_face_id, best_distance)

        if no_face_count == len(images):
            raise FaceProcessingError("no_face_in_image")
        if last_not_found_error:
            raise last_not_found_error
        raise FaceNotFoundError("No matching face found in any frame")

    def recognize(self, image: str) -> tuple[str, float]:
        decoded = self._decode_image(image)
        if decoded is None:
            raise FaceProcessingError("Failed to process the provided image")

        try:
            embedding = self._get_embedding(decoded)
        except FaceProcessingError:
            raise
        except Exception as exc:
            raise FaceProcessingError(f"Error generating embedding: {exc}")

        face_id, distance = self._embedding_store.search(embedding)
        if face_id is None:
            raise FaceNotFoundError("No matching face found")

        logger.info("Face recognized: face_id=%s, distance=%.4f", face_id, distance)
        return (face_id, distance)

    def delete_face(self, face_id: str) -> None:
        try:
            self._embedding_store.delete_embeddings(face_id)
            logger.info("Face deleted: face_id=%s", face_id)
        except Exception as exc:
            logger.warning("Could not delete embeddings for face_id=%s: %s", face_id, exc)
