import React, { useRef } from 'react';
import { LuSearch, LuPlus, LuUser, LuX } from 'react-icons/lu';
import { cn } from '../../lib/utils';

export default function TopBar({
  searchQuery,
  onSearchChange,
  onNewNote,
  onAvatarClick,
  currentUser,
  loading,
}) {
  const inputRef = useRef(null);

  function handleClear() {
    onSearchChange('');
    inputRef.current?.focus();
  }

  return (
    <header className="flex items-center gap-3 px-5 h-14 shrink-0 border-b border-app bg-app z-10">

      {/* Search */}
      <div className="relative flex items-center flex-1 max-w-md">
        <LuSearch
          size={14}
          className="absolute left-3 text-muted pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="Rechercher des notes…"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          aria-label="Rechercher des notes"
          className={cn(
            'w-full h-9 pl-9 pr-9 bg-subtle border border-app rounded-lg',
            'font-mono text-sm text-fg placeholder:text-subtle',
            'outline-none transition-all duration-150',
            'focus:border-[rgba(122,53,242,0.4)] focus:ring-2 focus:ring-[rgba(122,53,242,0.10)]'
          )}
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            aria-label="Effacer la recherche"
            className="absolute right-2.5 flex items-center justify-center w-5 h-5 rounded text-muted hover:text-fg hover:bg-muted-app transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(122,53,242,0.4)]"
          >
            <LuX size={12} />
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5 ml-auto">
        <button
          onClick={onNewNote}
          disabled={loading}
          aria-label="Nouvelle note"
          className={cn(
            'flex items-center gap-1.5 h-9 px-4 rounded-lg',
            'bg-tech-violet text-white text-[13px] font-semibold font-heading',
            'hover:bg-violet-hover transition-colors duration-150',
            'cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(122,53,242,0.4)]',
            'max-sm:w-9 max-sm:px-0 max-sm:justify-center'
          )}
        >
          <LuPlus size={15} />
          <span className="sm:inline hidden">Nouvelle note</span>
        </button>

        <button
          onClick={onAvatarClick}
          aria-label="Ouvrir le profil"
          title={currentUser?.name || 'Profil'}
          className={cn(
            'w-9 h-9 rounded-full shrink-0 flex items-center justify-center',
            'bg-gradient-to-br from-tech-violet to-biometric-glow text-white',
            'hover:ring-2 hover:ring-[rgba(122,53,242,0.35)] hover:scale-105',
            'transition-all duration-150 overflow-hidden border-0 cursor-pointer'
          )}
        >
          {currentUser?.avatar ? (
            <img
              src={currentUser.avatar}
              alt="Photo de profil"
              className="w-full h-full object-cover"
            />
          ) : (
            <LuUser size={16} />
          )}
        </button>
      </div>
    </header>
  );
}
