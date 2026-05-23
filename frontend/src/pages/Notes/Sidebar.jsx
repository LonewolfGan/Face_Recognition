/**
 * Sidebar — Premium dark sidebar for the Notes dashboard.
 *
 * Sections:
 *  - Logo / brand
 *  - Workspace: "All Notes" with count
 *  - Folders: list with inline rename, hover edit/delete
 *  - Divider
 *  - Bottom: theme toggle, settings dropdown (logout, add face, change pw), avatar
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LuFileText,
  LuFolder,
  LuFolderOpen,
  LuPlus,
  LuSettings,
  LuLogOut,
  LuSun,
  LuMoon,
  LuTrash2,
  LuPencil,
  LuScanFace,
  LuUser,
  LuKeyRound,
  LuX,
} from 'react-icons/lu';
import * as LuIcons from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../theme';
import CreateFolderModal from './CreateFolderModal';
import './Sidebar.css';

function FolderIcon({ iconName, isOpen, size = 16 }) {
  if (iconName) {
    const Comp = LuIcons[iconName];
    if (Comp) return <Comp size={size} />;
  }
  return isOpen ? <LuFolderOpen size={size} /> : <LuFolder size={size} />;
}

/**
 * @param {Object} props
 * @param {import('../../hooks/useNotesStore').Folder[]} props.folders
 * @param {import('../../hooks/useNotesStore').Note[]} props.notes  — needed for count badges
 * @param {string|null} props.activeFolderId
 * @param {boolean} props.isOpen
 * @param {boolean} props.isMobile
 * @param {() => void} props.onClose
 * @param {(id: string|null) => void} props.onFolderSelect
 * @param {(name: string) => void} props.onCreateFolder
 * @param {(id: string, name: string) => void} props.onRenameFolder
 * @param {(id: string) => void} props.onDeleteFolder
 * @param {() => void} props.onLogout
 * @param {() => void} props.onAddFace
 * @param {() => void} props.onChangePassword
 * @param {object|null} props.currentUser
 */
export default function Sidebar({
  folders,
  notes,
  activeFolderId,
  isOpen,
  isMobile,
  onClose,
  onFolderSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onLogout,
  onAddFace,
  onChangePassword,
  currentUser,
}) {
  const { isDarkMode, toggleTheme } = useTheme();

  // Settings dropdown
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  // Create folder modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Rename state: { id, value }
  const [renaming, setRenaming] = useState(null);

  // Close settings on outside click
  useEffect(() => {
    function onOutside(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  // Count notes per folder
  function folderNoteCount(folderId) {
    return notes.filter(n => n.folder_id === folderId).length;
  }

  function handleRenameSubmit(id) {
    if (renaming?.value?.trim()) {
      onRenameFolder(id, renaming.value.trim());
    }
    setRenaming(null);
  }

  function handleFolderClick(folderId) {
    onFolderSelect(folderId);
    if (isMobile) onClose();
  }

  const userInitials = currentUser?.name
    ? currentUser.name.slice(0, 2).toUpperCase()
    : 'PN';

  // Animation variants for mobile slide-in
  const sidebarVariants = {
    hidden: { x: '-100%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
    exit: { x: '-100%', opacity: 0, transition: { duration: 0.18 } },
  };

  const sidebarContent = (
    <aside className={`sidebar ${isDarkMode ? 'sidebar--dark' : 'sidebar--light'}`}>
      {/* ── Header ── */}
      <div className="sidebar__header">
        <Link to="/" className="sidebar__brand" style={{ textDecoration: 'none' }}>
          <img
            src={isDarkMode ? '/logodark.png' : '/logolight.png'}
            alt=""
            aria-hidden="true"
            style={{ height: 22, width: 22, objectFit: 'contain', flexShrink: 0 }}
          />
          <span className="sidebar__brand-name">PrivyNote</span>
        </Link>
        {isMobile && (
          <button
            className="sidebar__close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <LuX size={18} />
          </button>
        )}
      </div>

      {/* ── Workspace section ── */}
      <div className="sidebar__section">
        <span className="sidebar__section-label">Workspace</span>
        <button
          className={`sidebar__item ${activeFolderId === null ? 'sidebar__item--active' : ''}`}
          onClick={() => handleFolderClick(null)}
        >
          <LuFileText size={16} className="sidebar__item-icon" />
          <span className="sidebar__item-name">All Notes</span>
          <span className="sidebar__item-count">{notes.length}</span>
        </button>
      </div>

      {/* ── Folders section ── */}
      <div className="sidebar__section sidebar__section--folders">
        <span className="sidebar__section-label">Folders</span>

        <ul className="sidebar__folder-list" role="list">
          {folders.map(folder => {
            const isActive = activeFolderId === folder.folder_id;
            const isRenaming = renaming?.id === folder.folder_id;
            const count = folderNoteCount(folder.folder_id);

            return (
              <li key={folder.folder_id} className="sidebar__folder-item-wrapper">
                <button
                  className={`sidebar__item sidebar__item--folder ${isActive ? 'sidebar__item--active' : ''}`}
                  onClick={() => !isRenaming && handleFolderClick(folder.folder_id)}
                >
                  <span className="sidebar__item-icon">
                    <FolderIcon iconName={folder.icon} isOpen={isActive} size={16} />
                  </span>

                  {isRenaming ? (
                    <input
                      className="sidebar__rename-input"
                      value={renaming.value}
                      onChange={e => setRenaming({ id: folder.folder_id, value: e.target.value })}
                      onBlur={() => handleRenameSubmit(folder.folder_id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameSubmit(folder.folder_id);
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                      onClick={e => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span className="sidebar__item-name">{folder.name}</span>
                  )}

                  {!isRenaming && (
                    <span className="sidebar__item-count">{count}</span>
                  )}
                </button>

                {/* Hover actions — shown via CSS :hover on wrapper */}
                {!isRenaming && (
                  <div className="sidebar__folder-actions">
                    <button
                      className="sidebar__folder-action-btn"
                      onClick={e => {
                        e.stopPropagation();
                        setRenaming({ id: folder.folder_id, value: folder.name });
                      }}
                      aria-label={`Rename ${folder.name}`}
                      title="Rename"
                    >
                      <LuPencil size={13} />
                    </button>
                    <button
                      className="sidebar__folder-action-btn sidebar__folder-action-btn--delete"
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteFolder(folder.folder_id);
                      }}
                      aria-label={`Delete ${folder.name}`}
                      title="Delete"
                    >
                      <LuTrash2 size={13} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* New folder button */}
        <button
          className="sidebar__new-folder-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <LuPlus size={15} />
          New folder
        </button>
      </div>

      {/* ── Spacer ── */}
      <div className="sidebar__spacer" />

      {/* ── Bottom row ── */}
      <div className="sidebar__bottom">
        <div className="sidebar__bottom-row">
          {/* Theme toggle */}
          <button
            className="sidebar__icon-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <LuSun size={17} /> : <LuMoon size={17} />}
          </button>

          {/* Settings */}
          <div ref={settingsRef} className="sidebar__settings-wrapper">
            <button
              className="sidebar__icon-btn"
              onClick={() => setShowSettings(v => !v)}
              aria-label="Settings"
              title="Settings"
            >
              <LuSettings size={17} />
            </button>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  className="sidebar__settings-menu"
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.14 }}
                >
                  <button
                    className="sidebar__settings-item"
                    onClick={() => { setShowSettings(false); onAddFace(); }}
                  >
                    <LuScanFace size={15} />
                    Add face
                  </button>
                  <button
                    className="sidebar__settings-item"
                    onClick={() => { setShowSettings(false); onChangePassword(); }}
                  >
                    <LuKeyRound size={15} />
                    Change password
                  </button>
                  <div className="sidebar__settings-divider" />
                  <button
                    className="sidebar__settings-item sidebar__settings-item--danger"
                    onClick={() => { setShowSettings(false); onLogout(); }}
                  >
                    <LuLogOut size={15} />
                    Log out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User avatar */}
          <div className="sidebar__avatar" title={currentUser?.name || ''} aria-label="User">
            {currentUser?.name
              ? <span>{userInitials}</span>
              : <LuUser size={15} />
            }
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Sidebar content */}
      {isMobile ? (
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                className="sidebar__backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={onClose}
              />
              <motion.div
                variants={sidebarVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                style={{ position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 200 }}
              >
                {sidebarContent}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      ) : (
        isOpen ? sidebarContent : null
      )}

      {/* Create folder modal — rendered outside sidebar so it escapes overflow:hidden */}
      {showCreateModal && (
        <CreateFolderModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (name, icon) => {
            await onCreateFolder(name, icon);
            setShowCreateModal(false);
          }}
        />
      )}
    </>
  );
}

