import React, { useRef } from 'react';
import { LuSearch, LuPlus, LuUser, LuX } from 'react-icons/lu';
import './TopBar.css';

/**
 * TopBar — persistent header bar for the Notes page.
 *
 * Contains:
 *  - Search input (filters notes)
 *  - New Note button
 *  - Avatar button (opens profile modal)
 */
export default function TopBar({
  searchQuery,
  onSearchChange,
  onNewNote,
  onAvatarClick,
  currentUser,
  loading,
}) {
  const inputRef = useRef(null);

  const initials = currentUser?.name
    ? currentUser.name.slice(0, 2).toUpperCase()
    : null;

  function handleClear() {
    onSearchChange('');
    inputRef.current?.focus();
  }

  return (
    <header className="topbar">
      {/* Search */}
      <div className="topbar__search">
        <LuSearch size={15} className="topbar__search-icon" />
        <input
          ref={inputRef}
          className="topbar__search-input"
          type="text"
          placeholder="Search notes…"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          aria-label="Search notes"
        />
        {searchQuery && (
          <button
            className="topbar__search-clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <LuX size={13} />
          </button>
        )}
      </div>

      <div className="topbar__actions">
        {/* New Note */}
        <button
          className="topbar__new-btn"
          onClick={onNewNote}
          disabled={loading}
          aria-label="New note"
        >
          <LuPlus size={16} />
          <span className="topbar__new-btn-text">New Note</span>
        </button>

        {/* Avatar */}
        <button
          className="topbar__avatar"
          onClick={onAvatarClick}
          aria-label="Open profile"
          title={currentUser?.name || 'Profile'}
        >
          {currentUser?.avatar ? (
            <img
              src={currentUser.avatar}
              alt="Profile"
              className="topbar__avatar-img"
            />
          ) : (
            <LuUser size={17} />
          )}
        </button>
      </div>
    </header>
  );
}
