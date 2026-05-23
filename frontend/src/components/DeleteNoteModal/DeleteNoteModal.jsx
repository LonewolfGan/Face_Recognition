import './DeleteNoteModal.css';

const DeleteNoteModal = ({ onClose, onDelete, noteTitle, loading }) => {
  const handleDelete = () => {
    onDelete();
  };

  return (
    <div className="delete-note-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-note-title">
      <div className="delete-note-content">
        <div className="delete-note-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h3 id="delete-note-title" className="delete-note-heading">Supprimer la note</h3>
        <p className="delete-note-message">
          Êtes-vous sûr de vouloir supprimer la note &ldquo;{noteTitle}&rdquo; ? Cette action est irréversible.
        </p>
        <div className="delete-note-actions">
          <button
            type="button"
            className="delete-note-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Annuler
          </button>
          <button
            type="button"
            className="delete-note-confirm"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteNoteModal;
