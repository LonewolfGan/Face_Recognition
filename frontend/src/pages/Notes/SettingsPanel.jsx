/**
 * SettingsPanel — full-width panel that replaces the notes content area.
 *
 * Sections:
 *   1. Profile   — avatar (initials), user name
 *   2. Security  — Add face, Change password
 *   3. Appearance — Dark / light mode pill toggle
 *   4. Account   — Log out (danger)
 */

import React from 'react';
import {
  LuChevronLeft,
  LuChevronRight,
  LuScanFace,
  LuKeyRound,
  LuLogOut,
  LuSun,
  LuMoon,
  LuUser,
} from 'react-icons/lu';
import './SettingsPanel.css';

/**
 * @param {Object}   props
 * @param {object|null}   props.currentUser
 * @param {() => void}    props.onLogout
 * @param {() => void}    props.onAddFace
 * @param {() => void}    props.onChangePassword
 * @param {boolean}       props.isDarkMode
 * @param {() => void}    props.toggleTheme
 * @param {() => void}    props.onClose       — back to notes view
 */
export default function SettingsPanel({
  currentUser,
  onLogout,
  onAddFace,
  onChangePassword,
  isDarkMode,
  toggleTheme,
  onClose,
}) {
  const initials = currentUser?.name
    ? currentUser.name.slice(0, 2).toUpperCase()
    : 'PN';

  return (
    <div className="settings-panel">
      {/* ── Header ── */}
      <div className="settings-panel__header">
        <button
          className="settings-panel__back-btn"
          onClick={onClose}
          aria-label="Retour aux notes"
        >
          <LuChevronLeft size={18} />
          Notes
        </button>
        <h1 className="settings-panel__title">Paramètres</h1>
      </div>

      {/* ── 1. Profile ── */}
      <section className="settings-section">
        <span className="settings-section__heading">Profil</span>
        <div className="settings-section__body">
          <div className="settings-profile">
            <div className="settings-profile__avatar" aria-hidden="true">
              {currentUser?.name ? initials : <LuUser size={22} />}
            </div>
            <div className="settings-profile__info">
              <p className="settings-profile__name">
                {currentUser?.name || 'Utilisateur'}
              </p>
              <span className="settings-profile__label">Compte PrivyNote</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Security ── */}
      <section className="settings-section">
        <span className="settings-section__heading">Sécurité</span>
        <div className="settings-section__body">
          {/* Add face */}
          <button
            className="settings-action-row"
            onClick={onAddFace}
            aria-label="Ajouter un visage"
          >
            <div className="settings-action-row__left">
              <span className="settings-action-row__icon">
                <LuScanFace size={18} />
              </span>
              <div className="settings-action-row__text">
                <span className="settings-action-row__label">Ajouter un visage</span>
                <span className="settings-action-row__sub">Enregistrer une nouvelle signature biométrique</span>
              </div>
            </div>
            <LuChevronRight size={16} className="settings-action-row__chevron" />
          </button>

          {/* Change password */}
          <button
            className="settings-action-row"
            onClick={onChangePassword}
            aria-label="Changer le mot de passe"
          >
            <div className="settings-action-row__left">
              <span className="settings-action-row__icon">
                <LuKeyRound size={18} />
              </span>
              <div className="settings-action-row__text">
                <span className="settings-action-row__label">Changer le mot de passe</span>
                <span className="settings-action-row__sub">Mettre à jour votre mot de passe</span>
              </div>
            </div>
            <LuChevronRight size={16} className="settings-action-row__chevron" />
          </button>
        </div>
      </section>

      {/* ── 3. Appearance ── */}
      <section className="settings-section">
        <span className="settings-section__heading">Apparence</span>
        <div className="settings-section__body">
          <div className="settings-theme-row">
            <div className="settings-theme-row__left">
              <span className="settings-theme-row__icon">
                {isDarkMode ? <LuMoon size={18} /> : <LuSun size={18} />}
              </span>
              <span className="settings-theme-row__label">
                Mode {isDarkMode ? 'sombre' : 'clair'}
              </span>
            </div>

            {/* Pill toggle */}
            <label className="settings-toggle" aria-label="Basculer le thème">
              <input
                type="checkbox"
                className="settings-toggle__input"
                checked={isDarkMode}
                onChange={toggleTheme}
              />
              <span className="settings-toggle__track" />
              <span className="settings-toggle__thumb" />
            </label>
          </div>
        </div>
      </section>

      {/* ── 4. Account ── */}
      <section className="settings-section">
        <span className="settings-section__heading">Compte</span>
        <div className="settings-section__body">
          <button
            className="settings-action-row"
            onClick={onLogout}
            aria-label="Se déconnecter"
          >
            <div className="settings-action-row__left">
              <span className="settings-action-row__icon settings-action-row__icon--danger">
                <LuLogOut size={18} />
              </span>
              <div className="settings-action-row__text">
                <span className="settings-action-row__label settings-action-row__label--danger">
                  Se déconnecter
                </span>
                <span className="settings-action-row__sub">Fermer votre session</span>
              </div>
            </div>
            <LuChevronRight size={16} className="settings-action-row__chevron" />
          </button>
        </div>
      </section>
    </div>
  );
}
