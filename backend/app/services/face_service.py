"""Face detection, embedding generation, and recognition service.

Provides the FaceService class that handles face addition and recognition
using DeepFace for embedding generation and a shared EmbeddingStore for
storage and similarity search.
"""

import os
import base64
import uuid
import tempfile
import logging

import cv2
import numpy as np
from deepface import DeepFace

from .embedding_service import EmbeddingStore

logger = logging.getLogger(__name__)


class FaceProcessingError(Exception):
    """Raised when face processing (detection/embedding) fails."""
    pass


class FaceNotFoundError(Exception):
    """Raised when no matching face is found during recognition."""
    pass


class FaceService:
    """Handles face detection, embedding generation, and recognition.

    Uses DeepFace for generating face embeddings and a shared EmbeddingStore
    for persisting and searching embeddings. Images are processed via direct
    function calls (no HTTP).
    """

    def __init__(self, embedding_store: EmbeddingStore, model_name: str = "ArcFace", detector_backend: str = "ssd"):
        """Initialize with shared embedding store.

        Args:
            embedding_store: The shared EmbeddingStore instance for storage/search.
            model_name: DeepFace model to use for embedding generation.
            detector_backend: DeepFace detector backend for face detection.
        """
        self._embedding_store = embedding_store
        self._model_name = model_name
        self._detector_backend = detector_backend

    def add_face(self, name: str, images: list[str]) -> tuple[str, str]:
        """Process images, generate embeddings, store them.

        Decodes base64 images, preprocesses them, generates face embeddings
        using DeepFace, and stores them in the shared EmbeddingStore.

        Args:
            name: The name associated with the face.
            images: List of base64-encoded image strings.

        Returns:
            A tuple of (face_id, name) on success.

        Raises:
            FaceProcessingError: If no valid images are provided or no faces
                are detected in any of the images.
        """
        if not images:
            raise FaceProcessingError("No images provided")

        face_id = str(uuid.uuid4())
        processed_images = self._preprocess_batch(images)

        if not processed_images:
            raise FaceProcessingError("No valid images could be processed")

        embeddings = []

        for i, processed_image in enumerate(processed_images):
            temp_path = None
            try:
                # Write to a temporary file for DeepFace processing
                temp_path = self._write_temp_image(processed_image)

                result = DeepFace.represent(
                    img_path=temp_path,
                    model_name=self._model_name,
                    detector_backend=self._detector_backend,
                    enforce_detection=True,
                    align=True,
                )

                if not result:
                    logger.warning("Image %d: no face detected (empty result)", i + 1)
                    continue

                rep = result[0]
                area = rep.get("facial_area", {})
                w = area.get("w", 0)
                h = area.get("h", 0)
                img_w, img_h = processed_image.shape[1], processed_image.shape[0]
                face_coverage = (w * h) / (img_w * img_h) if img_w and img_h else 0

                if face_coverage < 0.03:
                    logger.warning("Image %d: face area too small (%.2f%%), skipping", i + 1, face_coverage * 100)
                    continue

                embeddings.append(rep["embedding"])

            except (ValueError, AttributeError) as e:
                logger.warning("Image %d: no face detected — %s", i + 1, str(e))
                continue
            except Exception as e:
                logger.warning("Error processing image %d: %s", i + 1, str(e))
                continue
            finally:
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)

        if not embeddings:
            raise FaceProcessingError("Aucun visage détecté dans les images fournies. Veuillez vous assurer que votre visage est bien visible.")

        # Store embeddings via the shared EmbeddingStore
        self._embedding_store.add_embeddings(face_id, embeddings)

        logger.info("Face added successfully: face_id=%s, name=%s, embeddings=%d", face_id, name, len(embeddings))
        return (face_id, name)

    def recognize_best(self, images: list[str]) -> tuple[str, float]:
        """Try multiple images and return the best match (lowest distance).

        Iterates through all provided images, calls recognize() on each, and
        returns the match with the smallest distance. Raises FaceProcessingError
        if no face is found in any image, or FaceNotFoundError if no image
        produces a match within the threshold.

        Args:
            images: List of base64-encoded image strings.

        Returns:
            (face_id, distance) for the best match found.

        Raises:
            FaceProcessingError: If no face is detected in any image.
            FaceNotFoundError: If no matching face is found in any image.
        """
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
            except FaceProcessingError as e:
                no_face_count += 1
                logger.debug("Frame %d: no face detected — %s", i + 1, str(e))
            except FaceNotFoundError as e:
                last_not_found_error = e
                logger.debug("Frame %d: face found but no match", i + 1)

        if best_face_id is not None:
            logger.info(
                "Best match across %d frames: face_id=%s, distance=%.4f",
                len(images), best_face_id, best_distance,
            )
            return (best_face_id, best_distance)

        # No frame produced a match — raise the most descriptive error
        if no_face_count == len(images):
            raise FaceProcessingError("no_face_in_image")
        if last_not_found_error:
            raise last_not_found_error
        raise FaceNotFoundError("No matching face found in any frame")

    def recognize(self, image: str) -> tuple[str, float]:
        """Recognize a face from a base64 image.

        Decodes the base64 image, generates an embedding using DeepFace,
        and searches the EmbeddingStore for the closest match.

        Args:
            image: A base64-encoded image string.

        Returns:
            A tuple of (face_id, distance) on success.

        Raises:
            FaceProcessingError: If the image cannot be processed or no face
                is detected.
            FaceNotFoundError: If no matching face is found within the
                distance threshold.
        """
        processed_image = self._preprocess_base64_image(image)
        if processed_image is None:
            raise FaceProcessingError("Failed to process the provided image")

        temp_path = None
        try:
            temp_path = self._write_temp_image(processed_image)

            representation = DeepFace.represent(
                img_path=temp_path,
                model_name=self._model_name,
                detector_backend=self._detector_backend,
                enforce_detection=True,
                align=True,
            )

            if not representation:
                raise FaceProcessingError("no_face_in_image")

            rep = representation[0]
            area = rep.get("facial_area", {})
            w = area.get("w", 0)
            h = area.get("h", 0)
            img = cv2.imread(temp_path)
            if img is not None:
                img_w, img_h = img.shape[1], img.shape[0]
                face_coverage = (w * h) / (img_w * img_h) if img_w and img_h else 1
                if face_coverage < 0.03:
                    raise FaceProcessingError("no_face_in_image")

            captured_embedding = rep["embedding"]

        except FaceProcessingError:
            raise
        except (ValueError, AttributeError):
            raise FaceProcessingError("no_face_in_image")
        except Exception as e:
            raise FaceProcessingError(f"Error generating embedding: {str(e)}")
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)

        # Search the embedding store
        face_id, distance = self._embedding_store.search(captured_embedding)

        if face_id is None:
            raise FaceNotFoundError("No matching face found")

        logger.info("Face recognized: face_id=%s, distance=%.4f", face_id, distance)
        return (face_id, distance)

    def _preprocess_base64_image(self, base64_str: str, target_size: tuple[int, int] = (112, 112)) -> np.ndarray | None:
        """Decode and preprocess a base64 image for DeepFace.

        Args:
            base64_str: Base64-encoded image string (may include data URI prefix).
            target_size: Target dimensions for resizing.

        Returns:
            Preprocessed image as a numpy array, or None on failure.
        """
        try:
            # Strip data URI prefix if present
            if "," in base64_str:
                base64_str = base64_str.split(",")[1]

            image_bytes = base64.b64decode(base64_str)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if image is None:
                return None

            image = cv2.resize(image, target_size, interpolation=cv2.INTER_AREA)
            return image.astype(np.uint8)

        except Exception as e:
            logger.warning("Error preprocessing base64 image: %s", str(e))
            return None

    def _preprocess_batch(self, images_base64: list[str], target_size: tuple[int, int] = (112, 112)) -> list[np.ndarray]:
        """Preprocess a batch of base64 images.

        Args:
            images_base64: List of base64-encoded image strings.
            target_size: Target dimensions for resizing.

        Returns:
            List of successfully preprocessed images as numpy arrays.
        """
        processed = []
        for b64 in images_base64:
            img = self._preprocess_base64_image(b64, target_size)
            if img is not None:
                processed.append(img)
        return processed

    def _write_temp_image(self, image: np.ndarray) -> str:
        """Write an image to a temporary file for DeepFace processing.

        Args:
            image: Image as a numpy array.

        Returns:
            Path to the temporary image file.
        """
        fd, temp_path = tempfile.mkstemp(suffix=".jpg")
        os.close(fd)
        cv2.imwrite(temp_path, image)
        return temp_path
