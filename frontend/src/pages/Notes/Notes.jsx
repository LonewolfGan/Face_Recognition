/**
 * Notes — Main dashboard page (complete rewrite).
 *
 * Layout:
 *   <Sidebar>  |  <Topbar>
 *              |  <NoteEditor> or <NoteGrid>
 *
 * No Quill, no NoteModal, no FolderSidebar, no DeleteNoteModal.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  LuPlus,
  LuSearch,
  LuUser,
  LuMenu,
  LuFileText,
  LuChevronRight,
  LuSettings,
} from 'react-icons/lu';

import { useAuth } from '../../context/AuthContext';
import { useToastContext } from '../../context/ToastContext';
import { useTheme } from '../../theme';
import { useNotesStore } from '../../hooks/useNotesStore';
import { ADD_FACE_URL, CONFIG } from '../../config';
import { handleApiError } from '../../utils/errorHandler';

import WebcamCapture from '../../components/WebcamCapture';
import ChangePasswordModal from '../../components/ChangePasswordModal';

import Sidebar from './Sidebar';
import NoteEditor from './NoteEditor';
import SettingsPanel from './SettingsPanel';
import './Notes.css';

/* ─── Time-based greeting ────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/* ─── Note row (Notion-style list item) ─────────────────────────────────── */
function NoteCard({ note, onClick, folderName }) {
  const date = note.updated_at
    ? new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';

  const folder = folderName || note.folder_name || '';

  return (
    <button
      className="note-card"
      onClick={onClick}
      aria-label={`Open note: ${note.title || 'Untitled'}`}
    >
      <div className="note-card__header">
        <LuFileText size={14} className="note-card__icon" />
        <span className="note-card__title">{note.title || 'Untitled'}</span>
      </div>
      <div className="note-card__footer">
        <span className="note-card__folder-badge">{folder}</span>
        {date && <span className="note-card__date">{date}</span>}
      </div>
    </button>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────── */
export default function Notes() {
  const navigate = useNavigate();
  const { currentUser, authFetch, logout } = useAuth();
  const toast = useToastContext();
  const { isDarkMode, toggleTheme } = useTheme();

  // Sidebar open state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

  // Modals
  const [showWebcam, setShowWebcam] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Notes store
  const store = useNotesStore();

  // ─── Auth guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) navigate('/login');
  }, [currentUser, navigate]);

  // ─── Dark mode sync ──────────────────────────────────────────────────────
  useEffect(() => {
    document.body.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // ─── Responsive ─────────────────────────────────────────────────────────
  useEffect(() => {
    function onResize() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
      else setSidebarOpen(false);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ─── Initial data load ───────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    store.loadFolders();
    store.loadNotes(store.activeFolderId);
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload notes when folder filter changes
  useEffect(() => {
    if (!currentUser) return;
    store.loadNotes(store.activeFolderId);
  }, [store.activeFolderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Actions ────────────────────────────────────────────────────────────
  async function handleNewNote() {
    const noteId = await store.createNote('', '', store.activeFolderId);
    if (noteId) store.setActiveNote(noteId);
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  async function handleCaptures(images) {
    if (!images || images.length === 0) {
      toast.error('No images captured.');
      return;
    }
    setShowWebcam(false);
    try {
      const { data: faceData } = await authFetch.get('/get_face_id');
      const face_id = faceData.face_id;
      const response = await axios.post(ADD_FACE_URL, {
        face_id,
        images,
        name: currentUser.name,
      }, { headers: { 'Content-Type': 'application/json' } });

      if (response.data.status === 'success') {
        toast.success('Face added successfully');
      } else {
        toast.error(response.data.message || 'Error adding face');
      }
    } catch (err) {
      console.error('Face add error:', err);
      handleApiError(err, toast);
    }
  }

  async function handleChangePassword(newPassword) {
    try {
      const res = await authFetch.post('/change_password', { password: newPassword });
      if (res.data.status === 'success') {
        toast.success('Password changed successfully');
        setShowChangePassword(false);
      } else {
        toast.error(res.data.message || 'Error changing password');
      }
    } catch (err) {
      handleApiError(err, toast);
    }
  }

  // ─── Derived ────────────────────────────────────────────────────────────
  const activeNote = store.activeNote;
  const folderName = store.activeFolder?.name || null;
  const breadcrumb = folderName || 'All Notes';

  // ─── Render ─────────────────────────────────────────────────────────────
  if (!currentUser) return null;

  return (
    <div className={`notes-page ${isDarkMode ? 'notes-page--dark' : 'notes-page--light'}`}>
      {/* ── Sidebar ── */}
      <Sidebar
        folders={store.folders}
        notes={store.notes}
        activeFolderId={store.activeFolderId}
        isOpen={sidebarOpen}
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)}
        onFolderSelect={(id) => {
          store.setActiveFolder(id);
          if (isMobile) setSidebarOpen(false);
        }}
        onCreateFolder={store.createFolder}
        onRenameFolder={store.renameFolder}
        onDeleteFolder={store.deleteFolder}
        onLogout={handleLogout}
        onAddFace={() => setShowWebcam(true)}
        onChangePassword={() => setShowChangePassword(true)}
        currentUser={currentUser}
      />

      {/* ── Main area ── */}
      <div className="notes-main">
        {/* Topbar */}
        <header className="notes-topbar">
          <div className="notes-topbar__left">
            {/* Hamburger for mobile */}
            {isMobile && (
              <button
                className="notes-topbar__icon-btn"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <LuMenu size={20} />
              </button>
            )}

            {/* Breadcrumb */}
            <nav className="notes-topbar__breadcrumb" aria-label="Breadcrumb">
              <span className="notes-topbar__breadcrumb-root">Notes</span>
              <LuChevronRight size={14} className="notes-topbar__breadcrumb-sep" />
              <span className="notes-topbar__breadcrumb-current">
                {activeNote ? (activeNote.title || 'Untitled') : breadcrumb}
              </span>
            </nav>
          </div>

          <div className="notes-topbar__right">
            {/* Search — icon only */}
            <button
              className="notes-topbar__icon-btn"
              aria-label="Search notes"
              title="Search (coming soon)"
            >
              <LuSearch size={18} />
            </button>

            {/* Settings */}
            <button
              className="notes-topbar__icon-btn"
              aria-label="Paramètres"
              title="Paramètres"
              onClick={() => {
                setShowSettingsPanel(v => !v);
                store.setActiveNote(null);
              }}
            >
              <LuSettings size={18} />
            </button>

            {/* Avatar */}
            <div className="notes-topbar__avatar" title={currentUser?.name || ''}>
              {currentUser?.name
                ? currentUser.name.slice(0, 2).toUpperCase()
                : <LuUser size={15} />
              }
            </div>

            {/* New Note */}
            <button
              className="notes-topbar__new-btn"
              onClick={handleNewNote}
              disabled={store.loading.notes}
            >
              <LuPlus size={16} />
              New Note
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="notes-content">
          {showSettingsPanel ? (
            /* ── Settings panel ── */
            <SettingsPanel
              currentUser={currentUser}
              onLogout={handleLogout}
              onAddFace={() => { setShowSettingsPanel(false); setShowWebcam(true); }}
              onChangePassword={() => { setShowSettingsPanel(false); setShowChangePassword(true); }}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              onClose={() => setShowSettingsPanel(false)}
            />
          ) : activeNote ? (
            /* ── Editor view ── */
            <NoteEditor
              note={activeNote}
              onUpdate={store.updateNote}
              onDelete={async (id) => {
                await store.deleteNote(id);
              }}
              onBack={() => store.setActiveNote(null)}
              saving={store.loading.saving}
            />
          ) : (
            /* ── Notes list view ── */
            <div className="notes-grid-view">
              {/* Greeting header */}
              <div className="notes-greeting">
                <h1 className="notes-greeting__text">
                  {getGreeting()}, {currentUser?.name?.split(' ')[0] || 'there'} 👋
                </h1>
              </div>

              {store.loading.notes && (
                <p className="notes-grid__loading">Loading…</p>
              )}

              {!store.loading.notes && store.notes.length === 0 && (
                <div className="notes-grid__empty">
                  <LuFileText size={36} className="notes-grid__empty-icon" />
                  <p className="notes-grid__empty-title">No notes yet</p>
                  <p className="notes-grid__empty-sub">
                    Start writing — your first note is one click away.
                  </p>
                  <button
                    className="notes-grid__empty-btn"
                    onClick={handleNewNote}
                    disabled={store.loading.notes}
                  >
                    <LuPlus size={16} />
                    Create a note
                  </button>
                </div>
              )}

              {!store.loading.notes && store.notes.length > 0 && (
                <>
                  <div className="notes-list-header">
                    <span className="notes-list-header__title">
                      {store.activeFolder ? store.activeFolder.name : 'All Notes'} · {store.notes.length}
                    </span>
                  </div>
                  <div className="notes-list-cols">
                    <span className="notes-list-col-label">Title</span>
                    <span className="notes-list-col-label">Folder</span>
                    <span className="notes-list-col-label" style={{ textAlign: 'right' }}>Last edited</span>
                  </div>
                  <div className="notes-list">
                    {store.notes.map(note => (
                      <NoteCard
                        key={note.note_id}
                        note={note}
                        folderName={
                          note.folder_id
                            ? (store.folders.find(f => f.folder_id === note.folder_id)?.name || note.folder_name)
                            : null
                        }
                        onClick={() => store.setActiveNote(note.note_id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Webcam overlay ── */}
      {showWebcam && (
        <div className="notes-overlay">
          <div className="notes-overlay__content">
            <WebcamCapture
              onCapture={handleCaptures}
              onError={(msg) => { toast.error(msg); setShowWebcam(false); }}
              onCancel={() => setShowWebcam(false)}
              guidanceText="Look at the camera to add your face"
              autoStart
            />
          </div>
        </div>
      )}

      {/* ── Change password modal ── */}
      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onChangePassword={handleChangePassword}
          loading={store.loading.saving}
        />
      )}
    </div>
  );
}
