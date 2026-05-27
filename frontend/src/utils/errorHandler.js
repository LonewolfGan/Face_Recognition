/**
 * Central error parsing for all API calls.
 *
 * parseApiError(err) → string (message FR lisible par l'utilisateur)
 * handleApiError(err, toast, options) → void (affiche un toast)
 */

const ERROR_CODE_MESSAGES = {
  no_face_detected:       "Aucun visage détecté. Placez votre visage face à la caméra.",
  no_face_registered:     "Aucun visage enregistré sur ce compte.",
  face_already_registered:"Un compte avec ce visage existe déjà. Connectez-vous plutôt.",
  invalid_credentials:    "Visage ou mot de passe incorrect.",
  registration_failed:    "Enregistrement facial échoué. Assurez-vous que votre visage est bien éclairé et visible.",
  validation_error:       null,
  rate_limited:           "Trop de tentatives. Veuillez patienter avant de réessayer.",
  token_expired:          "Session expirée. Reconnectez-vous.",
  forbidden:              "Accès refusé.",
  not_found:              "Ressource introuvable.",
  internal_error:         "Erreur serveur. Veuillez réessayer dans quelques instants.",
  face_service_unavailable: "Le service de reconnaissance faciale est temporairement indisponible.",
};

const STATUS_MESSAGES = {
  400: "Données invalides. Vérifiez les informations saisies.",
  401: "Identifiants incorrects ou session expirée.",
  403: "Accès refusé.",
  404: "Ressource introuvable.",
  409: "Un conflit existe déjà (compte ou ressource dupliqué).",
  413: "Données trop volumineuses. Réduisez la taille de l'image.",
  429: "Trop de tentatives. Veuillez patienter avant de réessayer.",
  500: "Erreur serveur. Veuillez réessayer dans quelques instants.",
  502: "Le serveur est temporairement indisponible. Veuillez réessayer.",
  503: "Le serveur est temporairement indisponible. Veuillez réessayer.",
  504: "Le serveur met trop de temps à répondre. Veuillez réessayer.",
};

/**
 * Converts any axios/network error into a human-readable French message.
 *
 * Priority:
 *   1. Network offline / no response
 *   2. Request timeout
 *   3. Known error code (from backend JSON body)
 *   4. Server-provided message (if it looks human-readable)
 *   5. HTTP status fallback
 *   6. Generic fallback
 *
 * @param {Error} error - Axios error or generic Error
 * @returns {string} User-facing message in French
 */
export function parseApiError(error) {
  if (!error) return "Une erreur inattendue est survenue.";

  const isTimeout =
    error.code === "ECONNABORTED" ||
    (typeof error.message === "string" && error.message.toLowerCase().includes("timeout"));

  if (isTimeout) {
    return "La requête a pris trop longtemps. Vérifiez votre connexion et réessayez.";
  }

  if (!error.response) {
    return "Connexion impossible. Vérifiez votre connexion internet et réessayez.";
  }

  const status    = error.response.status;
  const errorCode = error.response.data?.error;
  const serverMsg = error.response.data?.message;

  if (errorCode && ERROR_CODE_MESSAGES[errorCode] !== undefined) {
    if (ERROR_CODE_MESSAGES[errorCode] === null) {
      const fieldErrors = error.response.data?.errors;
      if (fieldErrors && typeof fieldErrors === "object") {
        const parts = Object.entries(fieldErrors).map(([, msg]) => msg);
        return parts.join(" • ");
      }
      return serverMsg || "Données invalides. Vérifiez les informations saisies.";
    }
    return ERROR_CODE_MESSAGES[errorCode];
  }

  if (serverMsg && isHumanReadable(serverMsg)) {
    return serverMsg;
  }

  return STATUS_MESSAGES[status] || "Une erreur inattendue est survenue. Veuillez réessayer.";
}

/**
 * Heuristic: is a server message safe to show directly to the user?
 * Rejects messages that look like stack traces, internal paths, or raw exceptions.
 */
function isHumanReadable(msg) {
  if (typeof msg !== "string" || msg.length > 300) return false;
  const badPatterns = [
    /traceback/i,
    /exception/i,
    /file "/i,
    /line \d+/i,
    /sqlalchemy/i,
    /psycopg/i,
    /werkzeug/i,
    /internal server error/i,
  ];
  return !badPatterns.some(p => p.test(msg));
}

/**
 * Handles API error responses and shows an appropriate toast.
 * token_expired (401) is auto-handled by the authFetch interceptor.
 *
 * @param {Error} error - The axios error object
 * @param {object} toast - Toast context with .error() / .warning() methods
 * @param {object} [options]
 * @param {Function} [options.onForbidden] - Custom handler for 403
 */
export function handleApiError(error, toast, { onForbidden } = {}) {
  const status    = error.response?.status;
  const errorCode = error.response?.data?.error;

  if (status === 403 || errorCode === "forbidden") {
    if (onForbidden) { onForbidden(); return; }
  }

  const message = parseApiError(error);

  if (status === 429 || errorCode === "rate_limited") {
    toast.warning(message);
  } else {
    toast.error(message);
  }
}
