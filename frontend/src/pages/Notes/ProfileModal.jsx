import React, { useEffect, useRef, useState } from 'react';
import {
  LuX,
  LuUser,
  LuCamera,
  LuCheck,
  LuLoader,
  LuFileText,
  LuFolder,
  LuCircleCheck,
  LuSettings,
} from 'react-icons/lu';
import './ProfileModal.css';

/**
 * ProfileModal — avatar-triggered profile quick-editor.
 * Displays identity info, account stats, and lets the user edit
 * their display name and avatar.
 */
export default function ProfileModal({
  currentUser,
  onClose,
  onSave,
  notesCount = 0,
  foldersCount = 0,
  onOpenSettings,
}) {
  const [name, setName] = useState(currentUser?.name || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const fileRef = useRef(null);
  const nameRef = useRef(null);

  const initials = (currentUser?.name || 'PN').slice(0, 2).toUpperCase();

  const memberSince = currentUser?.created_at
    ? new Date(currentUser.created_at).toLocaleDateString('fr-FR', {
        month: 'short',
        year: 'numeric',
      })
    : null;

  useEffect(() => { nameRef.current?.focus(); }, []);

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Fichier image requis.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Max 2 MB.'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Le nom ne peut pas être vide.'); return; }
    if (trimmed.length > 100) { setError('Nom trop long.'); return; }
    setError('');
    setSaving(true);
    try {
      await onSave({ name: trimmed, avatar });
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 900);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erreur. Réessayez.');
    } finally {
      setSaving(false);
    }
  }

  const hasChanges =
    name.trim() !== (currentUser?.name || '') ||
    avatar !== (currentUser?.avatar || null);

  return (
    <div className="pm-backdrop" onClick={handleBackdrop} aria-modal="true" role="dialog">
      <div className="pm-modal">

        {/* ── Header ── */}
        <div className="pm-header">
          <div className="pm-header__left">
            <span className="pm-header__title">Mon profil</span>
          </div>
          <div className="pm-header__actions">
            {onOpenSettings && (
              <button
                className="pm-icon-btn"
                onClick={() => { onClose(); onOpenSettings(); }}
                aria-label="Ouvrir les paramètres"
                title="Paramètres"
                type="button"
              >
                <LuSettings size={14} />
              </button>
            )}
            <button className="pm-icon-btn" onClick={onClose} aria-label="Fermer" type="button">
              <LuX size={14} />
            </button>
          </div>
        </div>

        {/* ── Identity card ── */}
        <div className="pm-identity">
          <div className="pm-avatar-wrap">
            <div className="pm-avatar">
              {avatar
                ? <img src={avatar} alt="Avatar" className="pm-avatar__img" />
                : <span className="pm-avatar__initials">{initials}</span>
              }
            </div>
            <button
              className="pm-avatar-btn"
              onClick={() => fileRef.current?.click()}
              aria-label="Changer l'avatar"
              type="button"
            >
              <LuCamera size={11} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="pm-file-input"
              onChange={handleFileChange}
            />
          </div>

          <div className="pm-identity__info">
            <p className="pm-identity__name">{currentUser?.name || 'Utilisateur'}</p>
            <div className="pm-identity__badges">
              <span className="pm-badge pm-badge--accent">PrivyNote</span>
            </div>
            {memberSince && (
              <p className="pm-identity__since">Membre depuis {memberSince}</p>
            )}
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="pm-stats">
          <div className="pm-stat">
            <LuFileText size={13} className="pm-stat__icon" />
            <span className="pm-stat__value">{notesCount}</span>
            <span className="pm-stat__label">Notes</span>
          </div>
          <div className="pm-stats__divider" aria-hidden="true" />
          <div className="pm-stat">
            <LuFolder size={13} className="pm-stat__icon" />
            <span className="pm-stat__value">{foldersCount}</span>
            <span className="pm-stat__label">Dossiers</span>
          </div>
          <div className="pm-stats__divider" aria-hidden="true" />
          <div className="pm-stat">
            <LuUser size={13} className="pm-stat__icon" />
            <span className="pm-stat__label">Standard</span>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="pm-divider" />

        {/* ── Edit name ── */}
        <div className="pm-field">
          <label className="pm-label" htmlFor="pm-name">Nom d'affichage</label>
          <input
            ref={nameRef}
            id="pm-name"
            className="pm-input"
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            placeholder="Votre nom"
            maxLength={100}
          />
        </div>

        {/* ── Avatar actions ── */}
        <div className="pm-avatar-actions">
          <button className="pm-link-btn" onClick={() => fileRef.current?.click()} type="button">
            {avatar ? 'Changer la photo' : 'Ajouter une photo'}
          </button>
          {avatar && (
            <>
              <span className="pm-link-sep">·</span>
              <button className="pm-link-btn pm-link-btn--danger" onClick={() => setAvatar(null)} type="button">
                Supprimer
              </button>
            </>
          )}
        </div>

        {/* ── Error ── */}
        {error && <p className="pm-error">{error}</p>}

        {/* ── Save ── */}
        <button
          className={`pm-save-btn${saved ? ' pm-save-btn--saved' : ''}`}
          onClick={handleSave}
          disabled={saving || !hasChanges}
          type="button"
        >
          {saving
            ? <><LuLoader size={14} className="pm-spinner" /> Enregistrement…</>
            : saved
            ? <><LuCheck size={14} /> Enregistré</>
            : 'Enregistrer les modifications'
          }
        </button>

      </div>
    </div>
  );
}
