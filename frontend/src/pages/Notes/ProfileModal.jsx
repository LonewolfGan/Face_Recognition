import React, { useEffect, useRef } from 'react';
import {
  LuX,
  LuUser,
  LuScanFace,
  LuKeyRound,
  LuLogOut,
  LuSun,
  LuMoon,
  LuChevronRight,
} from 'react-icons/lu';
import './ProfileModal.css';

/**
 * ProfileModal — overlay modal triggered by the avatar in the TopBar.
 *
 * Shows profile info + settings actions (add face, change password,
 * theme toggle, log out).
 */
export default function ProfileModal({
  currentUser,
  isDarkMode,
  toggleTheme,
  onAddFace,
  onChangePassword,
  onLogout,
  onClose,
}) {
  const modalRef = useRef(null);

  const initials = currentUser?.name
    ? currentUser.name.slice(0, 2).toUpperCase()
    : null;

  /* Close on Escape */
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  /* Trap focus / close on outside click */
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="profile-modal-backdrop" onClick={handleBackdropClick} aria-modal="true" role="dialog">
      <div className="profile-modal" ref={modalRef}>

        {/* Close button */}
        <button className="profile-modal__close" onClick={onClose} aria-label="Close">
          <LuX size={16} />
        </button>

        {/* ── Profile header ── */}
        <div className="profile-modal__profile">
          <div className="profile-modal__avatar">
            {initials ? initials : <LuUser size={22} />}
          </div>
          <div className="profile-modal__info">
            <p className="profile-modal__name">{currentUser?.name || 'User'}</p>
            <span className="profile-modal__label">PrivyNote account</span>
          </div>
        </div>

        <div className="profile-modal__divider" />

        {/* ── Security ── */}
        <div className="profile-modal__section-heading">Security</div>

        <button className="profile-modal__row" onClick={() => { onAddFace(); onClose(); }}>
          <span className="profile-modal__row-icon">
            <LuScanFace size={16} />
          </span>
          <span className="profile-modal__row-label">Add face</span>
          <LuChevronRight size={14} className="profile-modal__row-chevron" />
        </button>

        <button className="profile-modal__row" onClick={() => { onChangePassword(); onClose(); }}>
          <span className="profile-modal__row-icon">
            <LuKeyRound size={16} />
          </span>
          <span className="profile-modal__row-label">Change password</span>
          <LuChevronRight size={14} className="profile-modal__row-chevron" />
        </button>

        <div className="profile-modal__divider" />

        {/* ── Appearance ── */}
        <div className="profile-modal__section-heading">Appearance</div>

        <div className="profile-modal__row profile-modal__row--static">
          <span className="profile-modal__row-icon">
            {isDarkMode ? <LuMoon size={16} /> : <LuSun size={16} />}
          </span>
          <span className="profile-modal__row-label">
            {isDarkMode ? 'Dark mode' : 'Light mode'}
          </span>
          <label className="profile-modal__toggle" aria-label="Toggle theme">
            <input
              type="checkbox"
              className="profile-modal__toggle-input"
              checked={isDarkMode}
              onChange={toggleTheme}
            />
            <span className="profile-modal__toggle-track" />
            <span className="profile-modal__toggle-thumb" />
          </label>
        </div>

        <div className="profile-modal__divider" />

        {/* ── Log out ── */}
        <button className="profile-modal__row profile-modal__row--danger" onClick={() => { onLogout(); onClose(); }}>
          <span className="profile-modal__row-icon profile-modal__row-icon--danger">
            <LuLogOut size={16} />
          </span>
          <span className="profile-modal__row-label profile-modal__row-label--danger">Log out</span>
          <LuChevronRight size={14} className="profile-modal__row-chevron" />
        </button>

      </div>
    </div>
  );
}
