import React, { useEffect, useRef, useState } from 'react';
import { LuX, LuUser, LuCamera, LuCheck, LuLoader } from 'react-icons/lu';
import './ProfileModal.css';

/**
 * ProfileModal — avatar-triggered profile editor.
 * Lets the user update their display name and avatar photo.
 */
export default function ProfileModal({
  currentUser,
  onClose,
  onSave,
}) {
  const [name, setName] = useState(currentUser?.name || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const fileRef = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleAvatarClick() {
    fileRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2 MB.');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleRemoveAvatar() {
    setAvatar(null);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Name cannot be empty.'); return; }
    if (trimmed.length > 100) { setError('Name is too long.'); return; }

    setError('');
    setSaving(true);
    try {
      await onSave({ name: trimmed, avatar });
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 900);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = name.trim() !== (currentUser?.name || '') || avatar !== (currentUser?.avatar || null);

  return (
    <div className="pm-backdrop" onClick={handleBackdrop} aria-modal="true" role="dialog">
      <div className="pm-modal">

        {/* Header */}
        <div className="pm-header">
          <h2 className="pm-title">Edit Profile</h2>
          <button className="pm-close" onClick={onClose} aria-label="Close">
            <LuX size={16} />
          </button>
        </div>

        {/* Avatar section */}
        <div className="pm-avatar-section">
          <div className="pm-avatar-wrap">
            <div className="pm-avatar">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="pm-avatar-img" />
              ) : (
                <LuUser size={32} />
              )}
            </div>
            <button
              className="pm-avatar-edit-btn"
              onClick={handleAvatarClick}
              aria-label="Change avatar"
              type="button"
            >
              <LuCamera size={13} />
            </button>
          </div>

          <div className="pm-avatar-actions">
            <button className="pm-avatar-upload-btn" onClick={handleAvatarClick} type="button">
              {avatar ? 'Change photo' : 'Upload photo'}
            </button>
            {avatar && (
              <button className="pm-avatar-remove-btn" onClick={handleRemoveAvatar} type="button">
                Remove
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="pm-file-input"
            onChange={handleFileChange}
          />
        </div>

        {/* Name field */}
        <div className="pm-field">
          <label className="pm-label" htmlFor="pm-name">Display name</label>
          <input
            ref={nameRef}
            id="pm-name"
            className="pm-input"
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            placeholder="Your name"
            maxLength={100}
          />
        </div>

        {/* Error */}
        {error && <p className="pm-error">{error}</p>}

        {/* Save button */}
        <button
          className={`pm-save-btn${saved ? ' pm-save-btn--saved' : ''}`}
          onClick={handleSave}
          disabled={saving || !hasChanges}
          type="button"
        >
          {saving ? (
            <LuLoader size={15} className="pm-spinner" />
          ) : saved ? (
            <><LuCheck size={15} /> Saved</>
          ) : (
            'Save changes'
          )}
        </button>

      </div>
    </div>
  );
}
