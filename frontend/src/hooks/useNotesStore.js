/**
 * useNotesStore — centralized state management for notes and folders.
 *
 * Returns a state object plus action functions. Designed to be called
 * once at the Notes page level and passed down via props (or lifted into
 * a context if needed later).
 */

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToastContext } from '../context/ToastContext';
import { handleApiError } from '../utils/errorHandler';

/**
 * @typedef {Object} Folder
 * @property {string} folder_id
 * @property {string} name
 * @property {string|null} parent_id
 */

/**
 * @typedef {Object} Note
 * @property {string} note_id
 * @property {string} title
 * @property {string} content
 * @property {string|null} folder_id
 * @property {string|null} folder_name
 * @property {string} updated_at
 */

/**
 * @typedef {Object} NotesState
 * @property {Folder[]} folders
 * @property {Note[]} notes
 * @property {string|null} activeNoteId
 * @property {string|null} activeFolderId
 * @property {{ notes: boolean, folders: boolean, saving: boolean }} loading
 * @property {string|null} error
 */

export function useNotesStore() {
  const { authFetch } = useAuth();
  const toast = useToastContext();

  /** @type {[NotesState, Function]} */
  const [state, setState] = useState({
    folders: [],
    notes: [],
    allNotes: [],   // always the complete list across all folders, used for counts
    activeNoteId: null,
    activeFolderId: null,
    loading: { notes: false, folders: false, saving: false },
    error: null,
  });

  // Track in-flight save requests so we can debounce
  const saveTimerRef = useRef(null);

  // ─── helpers ──────────────────────────────────────────────────────────────

  function setLoading(key, value) {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [key]: value },
    }));
  }

  function setError(message) {
    setState(prev => ({ ...prev, error: message }));
  }

  // ─── folders ──────────────────────────────────────────────────────────────

  const loadFolders = useCallback(async () => {
    setLoading('folders', true);
    try {
      const res = await authFetch.get('/folders');
      setState(prev => ({
        ...prev,
        folders: res.data.folders || [],
        loading: { ...prev.loading, folders: false },
      }));
    } catch (err) {
      handleApiError(err, toast);
      setLoading('folders', false);
    }
  }, [authFetch, toast]);

  const createFolder = useCallback(async (name, icon = null) => {
    if (!name.trim()) {
      toast.error('Le nom du dossier est requis');
      return null;
    }
    try {
      const res = await authFetch.post('/folders', { name: name.trim(), icon: icon || null });
      if (res.data.status === 'success') {
        toast.success('Dossier créé');
        await loadFolders();
        return res.data;
      }
    } catch (err) {
      handleApiError(err, toast);
    }
    return null;
  }, [authFetch, toast, loadFolders]);

  const renameFolder = useCallback(async (folderId, newName) => {
    if (!newName.trim()) {
      toast.error('Le nom du dossier est requis');
      return false;
    }
    try {
      const res = await authFetch.put(`/folders/${folderId}`, { name: newName.trim() });
      if (res.data.status === 'success') {
        toast.success('Dossier renommé');
        await loadFolders();
        return true;
      }
    } catch (err) {
      handleApiError(err, toast);
    }
    return false;
  }, [authFetch, toast, loadFolders]);

  const deleteFolder = useCallback(async (folderId) => {
    try {
      const res = await authFetch.delete(`/folders/${folderId}`);
      if (res.data.status === 'success') {
        toast.success('Dossier supprimé');
        // If the deleted folder was active, reset to all notes
        setState(prev => ({
          ...prev,
          activeFolderId: prev.activeFolderId === folderId ? null : prev.activeFolderId,
          folders: prev.folders.filter(f => f.folder_id !== folderId),
          notes: prev.notes.filter(n => n.folder_id !== folderId),
          allNotes: prev.allNotes.filter(n => n.folder_id !== folderId),
        }));
        return true;
      }
    } catch (err) {
      handleApiError(err, toast);
    }
    return false;
  }, [authFetch, toast]);

  // ─── notes ────────────────────────────────────────────────────────────────

  const loadNotes = useCallback(async (folderId = null) => {
    setLoading('notes', true);
    setError(null);
    try {
      const endpoint = folderId ? `/folders/${folderId}/notes` : '/notes';
      const res = await authFetch.get(endpoint);
      const loaded = res.data.notes || [];
      setState(prev => ({
        ...prev,
        notes: loaded,
        // allNotes is only updated when loading the full list (no folder filter)
        ...(folderId == null ? { allNotes: loaded } : {}),
        loading: { ...prev.loading, notes: false },
      }));
    } catch (err) {
      handleApiError(err, toast);
      setError('Failed to load notes');
      setLoading('notes', false);
    }
  }, [authFetch, toast]);

  const createNote = useCallback(async (title, content = '', folderId = null) => {
    try {
      const res = await authFetch.post('/notes', {
        title: title || 'Untitled',
        content,
        folder_id: folderId || null,
      });
      if (res.data.status === 'success') {
        const newNote = {
          note_id: res.data.note_id,
          title: title || 'Untitled',
          content,
          folder_id: folderId || null,
          folder_name: null,
          updated_at: new Date().toISOString(),
        };
        setState(prev => ({
          ...prev,
          notes: [newNote, ...prev.notes],
          allNotes: [newNote, ...prev.allNotes],
          activeNoteId: res.data.note_id,
        }));
        return res.data.note_id;
      }
    } catch (err) {
      handleApiError(err, toast);
    }
    return null;
  }, [authFetch, toast]);

  /**
   * updateNote — immediate or debounced.
   * Pass debounced=true for keystroke saves, false for on-blur saves.
   */
  const updateNote = useCallback(async (noteId, { title, content, folder_id }, { debounced = false } = {}) => {
    // Optimistic UI update (both views)
    const updateFn = n => n.note_id === noteId
      ? { ...n, title, content, updated_at: new Date().toISOString() }
      : n;
    setState(prev => ({
      ...prev,
      notes: prev.notes.map(updateFn),
      allNotes: prev.allNotes.map(updateFn),
    }));

    const doSave = async () => {
      setLoading('saving', true);
      try {
        const payload = { title, content };
        if (folder_id !== undefined) payload.folder_id = folder_id;
        await authFetch.put(`/notes/${noteId}`, payload);
      } catch (err) {
        handleApiError(err, toast);
      } finally {
        setLoading('saving', false);
      }
    };

    if (debounced) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(doSave, 500);
    } else {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      await doSave();
    }
  }, [authFetch, toast]);

  const deleteNote = useCallback(async (noteId) => {
    try {
      await authFetch.delete(`/notes/${noteId}`);
      setState(prev => ({
        ...prev,
        notes: prev.notes.filter(n => n.note_id !== noteId),
        allNotes: prev.allNotes.filter(n => n.note_id !== noteId),
        activeNoteId: prev.activeNoteId === noteId ? null : prev.activeNoteId,
      }));
      toast.success('Note supprimée');
      return true;
    } catch (err) {
      handleApiError(err, toast);
    }
    return false;
  }, [authFetch, toast]);

  // ─── selection ────────────────────────────────────────────────────────────

  const setActiveNote = useCallback((noteId) => {
    setState(prev => ({ ...prev, activeNoteId: noteId }));
  }, []);

  const setActiveFolder = useCallback((folderId) => {
    setState(prev => ({ ...prev, activeFolderId: folderId, activeNoteId: null }));
  }, []);

  // ─── derived helpers ──────────────────────────────────────────────────────

  const activeNote = state.notes.find(n => n.note_id === state.activeNoteId) || null;
  const activeFolder = state.folders.find(f => f.folder_id === state.activeFolderId) || null;

  return {
    // State
    ...state,
    activeNote,
    activeFolder,
    allNotes: state.allNotes,

    // Actions
    loadFolders,
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    renameFolder,
    deleteFolder,
    setActiveNote,
    setActiveFolder,
  };
}
