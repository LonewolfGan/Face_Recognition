import React, { useState } from 'react';
import './ChangePasswordModal.css';
import { useToastContext } from '../../context/ToastContext';

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

    if (newPassword.length < 8 || newPassword.length > 128) {
      toast.error('Le mot de passe doit contenir entre 8 et 128 caractères.');
      setError('Le mot de passe doit contenir entre 8 et 128 caractères.');
      return;
    }

    onChangePassword(newPassword);
  };

  return (
    <div className="change-password-overlay">
      <div className="change-password-modal">
        <h3 className="change-password-title">Changer le mot de passe</h3>
        <form onSubmit={handleSubmit}>
          <div className="change-password-field">
            <label htmlFor="new-password">Nouveau mot de passe</label>
            <input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Entrez votre nouveau mot de passe (8-128 car.)"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </div>
          <div className="change-password-field">
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
          {error && <p className="change-password-error">{error}</p>}
          <div className="change-password-actions">
            <button type="button" className="change-password-cancel" onClick={onClose} disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="change-password-submit" disabled={loading}>
              {loading ? 'Changement...' : 'Changer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
