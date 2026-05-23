/**
 * Handles API error responses and shows appropriate toast messages.
 * token_expired (401) is auto-handled by the authFetch interceptor.
 * This handles: 403 (forbidden), 429 (rate_limited), 400 (validation_error).
 *
 * @param {Error} error - The axios error object
 * @param {object} toast - The toast context with error/warning methods
 */
export function handleApiError(error, toast) {
  const status = error.response?.status;
  const errorCode = error.response?.data?.error;
  const message = error.response?.data?.message;

  if (status === 403 || errorCode === 'forbidden') {
    toast.error('Accès refusé : vous n\'avez pas la permission d\'accéder à cette ressource.');
    return;
  }

  if (status === 429 || errorCode === 'rate_limited') {
    const retryAfter = error.response?.headers?.['retry-after'] || error.response?.data?.retry_after;
    const retryMsg = retryAfter
      ? `Trop de requêtes. Réessayez dans ${retryAfter} secondes.`
      : 'Trop de requêtes. Veuillez patienter avant de réessayer.';
    toast.warning(retryMsg);
    return;
  }

  if (status === 400 || errorCode === 'validation_error') {
    const fieldErrors = error.response?.data?.errors;
    if (fieldErrors && typeof fieldErrors === 'object') {
      const errorMessages = Object.entries(fieldErrors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join(', ');
      toast.error(`Erreur de validation : ${errorMessages}`);
    } else {
      toast.error(message || 'Erreur de validation des données.');
    }
    return;
  }

  // Generic fallback
  toast.error(message || error.message || 'Une erreur est survenue.');
}
