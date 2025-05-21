import React, { useState } from 'react';
import '../styles/components/modal.css';
import { useToastContext } from '../context/ToastContext';

const ChangePasswordModal = ({ onClose, onChangePassword, loading }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const toast = useToastContext();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (newPassword.trim() === '') {
      toast.error('Le nouveau mot de passe ne peut pas être vide.');
      setError('Le nouveau mot de passe ne peut pas être vide.');
      return;
    }

    onChangePassword(newPassword);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Changer le mot de passe</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="new-password">Nouveau mot de passe</label>
            <input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Entrez votre nouveau mot de passe"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password">Confirmer le mot de passe</label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmez votre nouveau mot de passe"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>Annuler</button>
            <button type="submit" disabled={loading}>
              {loading ? 'Changement...' : 'Changer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;