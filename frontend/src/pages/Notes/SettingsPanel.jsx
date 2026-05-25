/**
 * SettingsPanel — clean two-column settings layout.
 * Tabs: Profil | Sécurité | Apparence
 */

import React, { useRef, useState } from 'react';
import {
  LuChevronLeft,
  LuScanFace,
  LuKeyRound,
  LuSun,
  LuMoon,
  LuUser,
  LuShield,
  LuPalette,
  LuFileText,
  LuFolder,
  LuCamera,
  LuCheck,
  LuLoader,
  LuCircleCheck,
  LuTriangleAlert,
} from 'react-icons/lu';
import './SettingsPanel.css';

const NAV_ITEMS = [
  { id: 'profil',    label: 'Profil',    icon: LuUser },
  { id: 'securite',  label: 'Sécurité',  icon: LuShield },
  { id: 'apparence', label: 'Apparence', icon: LuPalette },
];

export default function SettingsPanel({
  currentUser,
  onAddFace,
  onChangePassword,
  isDarkMode,
  toggleTheme,
  onClose,
  notesCount = 0,
  foldersCount = 0,
  onProfileSave,
  onDeleteAccount,
}) {
  const [activeTab, setActiveTab] = useState('profil');
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileAvatar, setProfileAvatar] = useState(currentUser?.avatar || null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef(null);

  const initials = (currentUser?.name || 'PN').slice(0, 2).toUpperCase();
  const hasChanges =
    profileName.trim() !== (currentUser?.name || '') ||
    profileAvatar !== (currentUser?.avatar || null);

  const memberSince = currentUser?.created_at
    ? new Date(currentUser.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setProfileError('Sélectionner un fichier image.'); return; }
    if (file.size > 2 * 1024 * 1024) { setProfileError("L'image doit faire moins de 2 Mo."); return; }
    setProfileError('');
    const reader = new FileReader();
    reader.onload = (ev) => setProfileAvatar(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleSaveProfile() {
    const trimmed = profileName.trim();
    if (!trimmed) { setProfileError('Le nom ne peut pas être vide.'); return; }
    if (trimmed.length > 100) { setProfileError('Le nom est trop long.'); return; }
    setProfileError('');
    setSaving(true);
    try {
      await onProfileSave?.({ name: trimmed, avatar: profileAvatar });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setProfileError('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await onDeleteAccount?.();
    } catch {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <div className="sp-root">

      {/* ── Page header ── */}
      <div className="sp-page-header">
        <button className="sp-back-btn" onClick={onClose} aria-label="Retour">
          <LuChevronLeft size={16} />
          Notes
        </button>
        <h1 className="sp-page-title">Paramètres</h1>
      </div>

      {/* ── Two-column body ── */}
      <div className="sp-body">

        {/* ── Left nav ── */}
        <nav className="sp-nav" aria-label="Sections des paramètres">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`sp-nav-item${activeTab === id ? ' sp-nav-item--active' : ''}`}
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <Icon size={15} className="sp-nav-item__icon" />
              {label}
            </button>
          ))}
        </nav>

        {/* ── Right content ── */}
        <div className="sp-content">

          {/* ════════════════ PROFIL ════════════════ */}
          {activeTab === 'profil' && (
            <div className="sp-section-stack">

              {/* Single combined profile card */}
              <div className="sp-card">
                <div className="sp-card__header">
                  <span className="sp-card__title">Mon profil</span>
                </div>
                <div className="sp-card__body sp-card__body--form">

                  {/* Avatar + identity */}
                  <div className="sp-profile-identity">
                    <div className="sp-avatar-wrap">
                      <div className="sp-avatar">
                        {profileAvatar
                          ? <img src={profileAvatar} alt="Avatar" className="sp-avatar__img" />
                          : <span className="sp-avatar__initials">{initials}</span>
                        }
                      </div>
                      <button
                        className="sp-avatar-camera"
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
                        className="sp-hidden-file"
                        onChange={handleFileChange}
                      />
                    </div>
                    <div className="sp-profile-meta">
                      <p className="sp-profile-meta__name">{currentUser?.name || 'Utilisateur'}</p>
                      {memberSince && (
                        <p className="sp-profile-meta__sub">Membre depuis {memberSince}</p>
                      )}
                    </div>
                  </div>

                  {/* Name field */}
                  <div className="sp-field">
                    <label className="sp-label" htmlFor="sp-name">Nom complet</label>
                    <input
                      id="sp-name"
                      className="sp-input"
                      type="text"
                      value={profileName}
                      onChange={e => { setProfileName(e.target.value); setProfileError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
                      placeholder="Votre nom"
                      maxLength={100}
                    />
                  </div>

                  {/* Avatar actions (only when avatar is set) */}
                  {profileAvatar && (
                    <div className="sp-field">
                      <label className="sp-label">Photo de profil</label>
                      <div className="sp-avatar-actions">
                        <button className="sp-link-btn" onClick={() => fileRef.current?.click()} type="button">
                          Changer la photo
                        </button>
                        <span className="sp-avatar-actions__sep">·</span>
                        <button className="sp-link-btn sp-link-btn--danger" onClick={() => setProfileAvatar(null)} type="button">
                          Supprimer
                        </button>
                      </div>
                    </div>
                  )}

                  {profileError && <p className="sp-error">{profileError}</p>}

                  <div className="sp-form-footer">
                    <button
                      className={`sp-save-btn${saved ? ' sp-save-btn--saved' : ''}`}
                      onClick={handleSaveProfile}
                      disabled={saving || !hasChanges}
                      type="button"
                    >
                      {saving
                        ? <><LuLoader size={14} className="sp-spinner" /> Enregistrement…</>
                        : saved
                        ? <><LuCheck size={14} /> Enregistré</>
                        : 'Enregistrer les modifications'
                      }
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="sp-card">
                <div className="sp-card__header">
                  <span className="sp-card__title">Mon espace</span>
                </div>
                <div className="sp-card__body">
                  <div className="sp-stats-grid">
                    <div className="sp-stat">
                      <div className="sp-stat__icon-wrap"><LuFileText size={16} /></div>
                      <span className="sp-stat__value">{notesCount}</span>
                      <span className="sp-stat__label">Notes</span>
                    </div>
                    <div className="sp-stat">
                      <div className="sp-stat__icon-wrap"><LuFolder size={16} /></div>
                      <span className="sp-stat__value">{foldersCount}</span>
                      <span className="sp-stat__label">Dossiers</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger zone — account deletion */}
              <div className="sp-card sp-card--danger">
                <div className="sp-card__header">
                  <span className="sp-card__title sp-card__title--danger">Zone de danger</span>
                </div>
                <div className="sp-card__body sp-card__body--rows">
                  <div className="sp-action-row">
                    <div className="sp-action-row__left">
                      <div className="sp-action-icon sp-action-icon--danger">
                        <LuTriangleAlert size={16} />
                      </div>
                      <div className="sp-action-text">
                        <span className="sp-action-text__label sp-action-text__label--danger">Supprimer mon compte</span>
                        <span className="sp-action-text__sub">
                          {deleteConfirm
                            ? 'Cette action est irréversible. Toutes vos notes seront perdues.'
                            : 'Supprime définitivement votre compte et toutes vos notes'
                          }
                        </span>
                      </div>
                    </div>
                    {!deleteConfirm ? (
                      <button
                        className="sp-row-btn sp-row-btn--danger"
                        onClick={() => setDeleteConfirm(true)}
                        type="button"
                      >
                        Supprimer
                      </button>
                    ) : (
                      <div className="sp-delete-actions">
                        <button
                          className="sp-row-btn sp-row-btn--danger-solid"
                          onClick={handleDeleteAccount}
                          disabled={deleting}
                          type="button"
                        >
                          {deleting ? 'Suppression…' : 'Confirmer'}
                        </button>
                        <button
                          className="sp-row-btn"
                          onClick={() => setDeleteConfirm(false)}
                          disabled={deleting}
                          type="button"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ════════════════ SÉCURITÉ ════════════════ */}
          {activeTab === 'securite' && (
            <div className="sp-section-stack">
              <div className="sp-card">
                <div className="sp-card__header">
                  <span className="sp-card__title">Authentification biométrique</span>
                </div>
                <div className="sp-card__body sp-card__body--rows">
                  <div className="sp-action-row">
                    <div className="sp-action-row__left">
                      <div className="sp-action-icon">
                        <LuScanFace size={16} />
                      </div>
                      <div className="sp-action-text">
                        <span className="sp-action-text__label">Reconnaissance faciale</span>
                        <span className="sp-action-text__sub">Enregistrer un nouveau visage via la caméra</span>
                      </div>
                    </div>
                    <button className="sp-row-btn" onClick={onAddFace} type="button">
                      Gérer
                    </button>
                  </div>
                </div>
              </div>

              <div className="sp-card">
                <div className="sp-card__header">
                  <span className="sp-card__title">Mot de passe</span>
                </div>
                <div className="sp-card__body sp-card__body--rows">
                  <div className="sp-action-row">
                    <div className="sp-action-row__left">
                      <div className="sp-action-icon">
                        <LuKeyRound size={16} />
                      </div>
                      <div className="sp-action-text">
                        <span className="sp-action-text__label">Changer le mot de passe</span>
                        <span className="sp-action-text__sub">Mettre à jour votre mot de passe de connexion</span>
                      </div>
                    </div>
                    <button className="sp-row-btn" onClick={onChangePassword} type="button">
                      Modifier
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ APPARENCE ════════════════ */}
          {activeTab === 'apparence' && (
            <div className="sp-section-stack">
              <div className="sp-card">
                <div className="sp-card__header">
                  <span className="sp-card__title">Thème</span>
                </div>
                <div className="sp-card__body sp-card__body--rows">
                  <div className="sp-action-row">
                    <div className="sp-action-row__left">
                      <div className="sp-action-icon">
                        {isDarkMode ? <LuMoon size={16} /> : <LuSun size={16} />}
                      </div>
                      <div className="sp-action-text">
                        <span className="sp-action-text__label">
                          Mode {isDarkMode ? 'sombre' : 'clair'}
                        </span>
                        <span className="sp-action-text__sub">
                          {isDarkMode
                            ? 'Interface en fond foncé, idéale pour la nuit'
                            : 'Interface en fond clair, idéale pour la journée'
                          }
                        </span>
                      </div>
                    </div>
                    <label className="sp-toggle" aria-label="Basculer le thème">
                      <input
                        type="checkbox"
                        className="sp-toggle__input"
                        checked={isDarkMode}
                        onChange={toggleTheme}
                      />
                      <span className="sp-toggle__track" />
                      <span className="sp-toggle__thumb" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
