/**
 * Notes — Main dashboard page.
 *
 * Layout:
 *   <Sidebar (retractable)>  |  <TopBar> / <NoteGrid grouped by folder> or <NoteEditor>
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  LuPlus,
  LuFileText,
  LuFolder,
  LuBookOpen,
} from 'react-icons/lu';

import { useAuth } from '../../context/AuthContext';
import { useToastContext } from '../../context/ToastContext';
import { useTheme } from '../../theme';
import { useNotesStore } from '../../hooks/useNotesStore';
import { ADD_FACE_URL } from '../../config';
import { handleApiError } from '../../utils/errorHandler';

import WebcamCapture from '../../components/WebcamCapture';
import ChangePasswordModal from '../../components/ChangePasswordModal';

import Sidebar from './Sidebar';
import NoteEditor from './NoteEditor';
import SettingsPanel from './SettingsPanel';
import TopBar from './TopBar';
import ProfileModal from './ProfileModal';
import './Notes.css';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/* Group notes by folder for All Notes view */
function groupNotesByFolder(notes, folders) {
  const groups = {};
  const noFolder = [];

  notes.forEach(note => {
    if (!note.folder_id) {
      noFolder.push(note);
    } else {
      if (!groups[note.folder_id]) groups[note.folder_id] = [];
      groups[note.folder_id].push(note);
    }
  });

  const result = [];
  folders.forEach(folder => {
    const folderNotes = groups[folder.folder_id];
    if (folderNotes?.length > 0) {
      result.push({ folder, notes: folderNotes });
    }
  });
  if (noFolder.length > 0) {
    result.push({ folder: null, notes: noFolder });
  }
  return result;
}

/* ─── Note box card ──────────────────────────────────────────────────────── */
function NoteBox({ note, onClick, showFolder, folderName }) {
  const preview = stripHtml(note.content || '').slice(0, 110);
  const date = note.updated_at
    ? new Date(note.updated_at).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })
    : '';

  return (
    <button
      className="note-box"
      onClick={onClick}
      aria-label={`Ouvrir la note : ${note.title || 'Sans titre'}`}
    >
      <div className="note-box__title">{note.title || 'Sans titre'}</div>
      {preview && <p className="note-box__preview">{preview}</p>}
      <div className="note-box__footer">
        {showFolder && folderName && (
          <span className="note-box__folder-badge">{folderName}</span>
        )}
        {date && <span className="note-box__date">{date}</span>}
      </div>
    </button>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────── */
export default function Notes() {
  const navigate = useNavigate();
  const { currentUser, authFetch, logout, updateUser } = useAuth();
  const toast = useToastContext();
  const { isDarkMode, toggleTheme } = useTheme();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

  const [showWebcam, setShowWebcam] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const store = useNotesStore();

  useEffect(() => {
    if (!currentUser) navigate('/login');
  }, [currentUser, navigate]);

  useEffect(() => {
    document.body.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

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

  useEffect(() => {
    if (!currentUser) return;
    store.loadFolders();
    store.loadNotes(store.activeFolderId);
  }, [currentUser]); // eslint-disable-line

  useEffect(() => {
    if (!currentUser) return;
    store.loadNotes(store.activeFolderId);
  }, [store.activeFolderId]); // eslint-disable-line

  async function handleNewNote() {
    const noteId = await store.createNote('', '', store.activeFolderId);
    if (noteId) store.setActiveNote(noteId);
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  async function handleDeleteAccount() {
    try {
      await authFetch.delete('/account');
      logout();
      navigate('/login');
    } catch (err) {
      handleApiError(err, toast);
      throw err;
    }
  }

  async function handleCaptures(images) {
    if (!images || images.length === 0) { toast.error('Aucune image capturée.'); return; }
    setShowWebcam(false);
    try {
      const { data: faceData } = await authFetch.get('/get_face_id');
      const face_id = faceData.face_id;
      const response = await axios.post(ADD_FACE_URL, {
        face_id, images, name: currentUser.name,
      }, { headers: { 'Content-Type': 'application/json' } });
      if (response.data.status === 'success') toast.success('Visage ajouté avec succès');
      else toast.error(response.data.message || 'Erreur lors de l\'ajout du visage');
    } catch (err) {
      console.error('Face add error:', err);
      handleApiError(err, toast);
    }
  }

  async function handleProfileSave({ name, avatar }) {
    const res = await authFetch.patch('/profile', { name, avatar });
    if (res.data.status === 'success') {
      updateUser({ name: res.data.user.name, avatar: res.data.user.avatar });
      toast.success('Profil mis à jour');
    }
  }

  async function handleChangePassword(newPassword) {
    try {
      const res = await authFetch.post('/change_password', { password: newPassword });
      if (res.data.status === 'success') {
        toast.success('Mot de passe modifié avec succès');
        setShowChangePassword(false);
      } else {
        toast.error(res.data.message || 'Erreur lors du changement de mot de passe');
      }
    } catch (err) { handleApiError(err, toast); }
  }

  /* ── Filter notes by search query ── */
  const filteredNotes = searchQuery.trim()
    ? store.notes.filter(n => {
        const q = searchQuery.toLowerCase();
        return (
          (n.title || '').toLowerCase().includes(q) ||
          stripHtml(n.content || '').toLowerCase().includes(q)
        );
      })
    : store.notes;

  const activeNote = store.activeNote;

  if (!currentUser) return null;

  /* ── Grouped notes for "All Notes" view ── */
  const noteGroups = store.activeFolderId === null
    ? groupNotesByFolder(filteredNotes, store.folders)
    : null;

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
        onOpenSettings={() => { setShowSettingsPanel(true); store.setActiveNote(null); }}
        currentUser={currentUser}
      />

      {/* ── Main area ── */}
      <div className="notes-main">

        {/* TopBar — always visible */}
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={q => { setSearchQuery(q); store.setActiveNote(null); setShowSettingsPanel(false); }}
          onNewNote={handleNewNote}
          onAvatarClick={() => setShowProfileModal(true)}
          currentUser={currentUser}
          loading={store.loading.notes}
        />

        <main className="notes-content">
          {showSettingsPanel ? (
            <SettingsPanel
              currentUser={currentUser}
              onLogout={handleLogout}
              onAddFace={() => { setShowSettingsPanel(false); setShowWebcam(true); }}
              onChangePassword={() => { setShowSettingsPanel(false); setShowChangePassword(true); }}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              onClose={() => setShowSettingsPanel(false)}
              notesCount={store.notes.length}
              foldersCount={store.folders.length}
              onProfileSave={handleProfileSave}
              onDeleteAccount={handleDeleteAccount}
            />
          ) : activeNote ? (
            <NoteEditor
              note={activeNote}
              onUpdate={store.updateNote}
              onDelete={async (id) => { await store.deleteNote(id); }}
              onBack={() => store.setActiveNote(null)}
              saving={store.loading.saving}
            />
          ) : (
            <div className="notes-grid-view">

              {/* Greeting */}
              <div className="notes-greeting">
                <span className="notes-greeting__date">
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <h1 className="notes-greeting__text">
                  {getGreeting()}, {currentUser?.name?.split(' ')[0] || ''}
                </h1>

                {/* Stats */}
                <div className="notes-stats">
                  <div className="notes-stat-pill">
                    <LuFileText size={14} className="notes-stat-pill__icon" />
                    <span className="notes-stat-pill__count">{store.notes.length}</span>
                    <span className="notes-stat-pill__label">Notes</span>
                  </div>
                  <div className="notes-stat-pill">
                    <LuFolder size={14} className="notes-stat-pill__icon" />
                    <span className="notes-stat-pill__count">{store.folders.length}</span>
                    <span className="notes-stat-pill__label">Dossiers</span>
                  </div>
                  <div className="notes-stat-pill">
                    <LuBookOpen size={14} className="notes-stat-pill__icon" />
                    <span className="notes-stat-pill__label">
                      {store.activeFolder ? store.activeFolder.name : 'Toutes les notes'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Search results label */}
              {searchQuery.trim() && (
                <p className="notes-search-label">
                  {filteredNotes.length === 0
                    ? `Aucune note ne correspond à "${searchQuery}"`
                    : `${filteredNotes.length} résultat${filteredNotes.length !== 1 ? 's' : ''} pour "${searchQuery}"`}
                </p>
              )}

              {/* Loading */}
              {store.loading.notes && (
                <p className="notes-grid__loading">Chargement…</p>
              )}

              {/* Empty state */}
              {!store.loading.notes && filteredNotes.length === 0 && !searchQuery.trim() && (
                <div className="notes-empty">
                  <LuFileText size={32} className="notes-empty__icon" aria-hidden="true" />
                  <div className="notes-empty__body">
                    <h2 className="notes-empty__title">Aucune note pour l'instant</h2>
                    <p className="notes-empty__sub">
                      Créez votre première note et commencez à capturer vos idées.
                    </p>
                    <button
                      className="notes-empty__cta"
                      onClick={handleNewNote}
                      disabled={store.loading.notes}
                    >
                      <LuPlus size={16} />
                      Nouvelle note
                    </button>
                  </div>
                </div>
              )}

              {/* Notes — grouped by folder (All Notes) or flat grid (folder view) */}
              {!store.loading.notes && filteredNotes.length > 0 && (
                <>
                  {/* ALL NOTES: grouped by folder */}
                  {noteGroups !== null ? (
                    noteGroups.map(({ folder, notes: groupNotes }) => (
                      <div key={folder ? folder.folder_id : '__none__'} className="notes-folder-group">
                        <div className="notes-folder-group__header">
                          <LuFolder size={15} className="notes-folder-group__icon" />
                          <span className="notes-folder-group__name">
                            {folder ? folder.name : 'Sans dossier'}
                          </span>
                          <span className="notes-folder-group__count">{groupNotes.length}</span>
                        </div>
                        <div className="notes-cards-grid">
                          {groupNotes.map(note => (
                            <NoteBox
                              key={note.note_id}
                              note={note}
                              showFolder={false}
                              onClick={() => store.setActiveNote(note.note_id)}
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    /* FOLDER VIEW: flat grid */
                    <div className="notes-cards-grid">
                      {filteredNotes.map(note => (
                        <NoteBox
                          key={note.note_id}
                          note={note}
                          showFolder={false}
                          onClick={() => store.setActiveNote(note.note_id)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Profile modal ── */}
      {showProfileModal && (
        <ProfileModal
          currentUser={currentUser}
          onSave={handleProfileSave}
          onClose={() => setShowProfileModal(false)}
          notesCount={store.notes.length}
          foldersCount={store.folders.length}
          onOpenSettings={() => { setShowSettingsPanel(true); store.setActiveNote(null); }}
        />
      )}

      {/* Webcam overlay */}
      {showWebcam && (
        <div className="notes-overlay">
          <div className="notes-overlay__content">
            <WebcamCapture
              onCapture={handleCaptures}
              onError={(msg) => { toast.error(msg); setShowWebcam(false); }}
              onCancel={() => setShowWebcam(false)}
              guidanceText="Regardez la caméra pour ajouter votre visage"
              autoStart
            />
          </div>
        </div>
      )}

      {/* Change password modal */}
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
