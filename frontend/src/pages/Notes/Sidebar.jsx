/**
 * Sidebar — Retractable premium navigation panel.
 *
 * Features:
 *  - Collapsible (icon-only mode at 56px)
 *  - Folders with inline rename + delete
 *  - Bottom: Paramètres (gear) + Déconnexion (logout)
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
  LuX,
  LuChevronLeft,
  LuChevronRight,
  LuUser,
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
  onOpenSettings,
  currentUser,
}) {
  const { isDarkMode, toggleTheme } = useTheme();

  // Retractable state (desktop only)
  const [isCollapsed, setIsCollapsed] = useState(false);


  // Create folder modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Rename state
  const [renaming, setRenaming] = useState(null);


  // Don't collapse on mobile
  const collapsed = !isMobile && isCollapsed;

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

  const sidebarVariants = {
    hidden: { x: '-100%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
    exit: { x: '-100%', opacity: 0, transition: { duration: 0.18 } },
  };

  const themeClass = isDarkMode ? 'sidebar--dark' : 'sidebar--light';
  const collapseClass = collapsed ? 'sidebar--collapsed' : '';

  const sidebarContent = (
    <aside className={`sidebar ${themeClass} ${collapseClass}`}>

      {/* ── Header ── */}
      <div className="sidebar__header">
        {!collapsed && (
          <Link to="/" className="sidebar__brand">
            <img
              src={isDarkMode ? '/logodark.png' : '/logolight.png'}
              alt=""
              aria-hidden="true"
            />
            <span className="sidebar__brand-name">PrivyNote</span>
          </Link>
        )}

        {/* Toggle collapse button */}
        {!isMobile && (
          <button
            className="sidebar__collapse-btn"
            onClick={() => setIsCollapsed(v => !v)}
            aria-label={collapsed ? 'Déplier le panneau' : 'Replier le panneau'}
            title={collapsed ? 'Déplier' : 'Replier'}
          >
            {collapsed ? <LuChevronRight size={15} /> : <LuChevronLeft size={15} />}
          </button>
        )}

        {/* Mobile close */}
        {isMobile && (
          <button className="sidebar__close-btn" onClick={onClose} aria-label="Fermer le panneau">
            <LuX size={18} />
          </button>
        )}
      </div>

      {/* ── Workspace section ── */}
      <div className="sidebar__section">
        {!collapsed && <span className="sidebar__section-label">Espace de travail</span>}
        <button
          className={`sidebar__item ${activeFolderId === null ? 'sidebar__item--active' : ''}`}
          onClick={() => handleFolderClick(null)}
          title={collapsed ? 'Toutes les notes' : undefined}
        >
          <span className="sidebar__item-icon">
            <LuFileText size={16} />
          </span>
          {!collapsed && <span className="sidebar__item-name">Toutes les notes</span>}
          {!collapsed && <span className="sidebar__item-count">{notes.length}</span>}
        </button>
      </div>

      {/* ── Folders section ── */}
      <div className="sidebar__section sidebar__section--folders">
        {!collapsed && (
          <div className="sidebar__section-label">
            <span>Dossiers</span>
            <button
              className="sidebar__section-add"
              onClick={() => setShowCreateModal(true)}
              aria-label="Nouveau dossier"
              title="Nouveau dossier"
            >
              <LuPlus size={13} />
            </button>
          </div>
        )}

        <ul className="sidebar__folder-list" role="list">
          {folders.map(folder => {
            const isActive = activeFolderId === folder.folder_id;
            const isRenaming = renaming?.id === folder.folder_id;
            const count = folderNoteCount(folder.folder_id);

            return (
              <li key={folder.folder_id} className="sidebar__folder-item-wrapper">
                <button
                  className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
                  onClick={() => !isRenaming && handleFolderClick(folder.folder_id)}
                  title={collapsed ? folder.name : undefined}
                >
                  <span className="sidebar__item-icon">
                    <FolderIcon iconName={folder.icon} isOpen={isActive} size={16} />
                  </span>

                  {!collapsed && (
                    isRenaming ? (
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
                    )
                  )}

                  {!collapsed && !isRenaming && (
                    <span className="sidebar__item-count">{count}</span>
                  )}
                </button>

                {/* Hover edit/delete — only in expanded mode */}
                {!collapsed && !isRenaming && (
                  <div className="sidebar__folder-actions">
                    <button
                      className="sidebar__folder-action-btn"
                      onClick={e => {
                        e.stopPropagation();
                        setRenaming({ id: folder.folder_id, value: folder.name });
                      }}
                      aria-label={`Renommer ${folder.name}`}
                      title="Renommer"
                    >
                      <LuPencil size={13} />
                    </button>
                    <button
                      className="sidebar__folder-action-btn sidebar__folder-action-btn--delete"
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteFolder(folder.folder_id);
                      }}
                      aria-label={`Supprimer ${folder.name}`}
                      title="Supprimer"
                    >
                      <LuTrash2 size={13} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* New folder button — expanded: text, collapsed: just + icon */}
        {collapsed ? (
          <button
            className="sidebar__item"
            onClick={() => setShowCreateModal(true)}
            title="Nouveau dossier"
            aria-label="Nouveau dossier"
          >
            <span className="sidebar__item-icon"><LuPlus size={16} /></span>
          </button>
        ) : (
          <button
            className="sidebar__new-folder-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <LuPlus size={14} />
            Nouveau dossier
          </button>
        )}
      </div>

      {/* Spacer */}
      <div className="sidebar__spacer" />

      {/* ── Bottom: Paramètres + Déconnexion ── */}
      <div className="sidebar__bottom">
        {/* Theme toggle */}
        <button
          className="sidebar__bottom-btn"
          onClick={toggleTheme}
          title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
          aria-label={isDarkMode ? 'Mode clair' : 'Mode sombre'}
        >
          <span className="sidebar__item-icon">
            {isDarkMode ? <LuSun size={17} /> : <LuMoon size={17} />}
          </span>
          {!collapsed && <span>{isDarkMode ? 'Mode clair' : 'Mode sombre'}</span>}
        </button>

        {/* Paramètres */}
        <button
          className="sidebar__bottom-btn"
          onClick={onOpenSettings}
          title="Paramètres"
          aria-label="Paramètres"
        >
          <span className="sidebar__item-icon"><LuSettings size={17} /></span>
          {!collapsed && <span>Paramètres</span>}
        </button>

        {/* Déconnexion */}
        <button
          className="sidebar__bottom-btn sidebar__bottom-btn--danger"
          onClick={onLogout}
          title="Déconnexion"
          aria-label="Déconnexion"
        >
          <span className="sidebar__item-icon"><LuLogOut size={17} /></span>
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
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
