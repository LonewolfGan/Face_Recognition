import React from 'react';
import '../styles/components/modal.css';

const DeleteNoteModal = ({ onClose, onDelete, noteTitle, loading }) => {
  const handleDelete = () => {
    onDelete();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Supprimer la note</h3>
        <p className="delete-confirmation">
          Êtes-vous sûr de vouloir supprimer la note "{noteTitle}" ? Cette action est irréversible.
        </p>
        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={loading}>Annuler</button>
          <button 
            type="button" 
            onClick={handleDelete} 
            disabled={loading}
            className="delete-button"
          >
            {loading ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteNoteModal;