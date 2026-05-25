/**
 * NoteEditor — Notion-style inline note editor.
 *
 * - Large editable H1 title at the top
 * - Auto-growing textarea for content below
 * - Auto-save: debounced 500ms on keystroke, immediate on blur
 * - "Saving…" / "Saved" status indicator
 * - No toolbar, no Quill, no WYSIWYG rich text
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LuTrash2, LuChevronLeft } from 'react-icons/lu';
import './NoteEditor.css';

/**
 * @param {Object} props
 * @param {{ note_id: string, title: string, content: string }} props.note
 * @param {(noteId: string, fields: {title: string, content: string}, opts: object) => void} props.onUpdate
 * @param {(noteId: string) => void} props.onDelete
 * @param {() => void} props.onBack
 * @param {boolean} props.saving
 */
export default function NoteEditor({ note, onUpdate, onDelete, onBack, saving }) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const titleRef = useRef(null);
  const contentRef = useRef(null);
  const saveTimerRef = useRef(null);
  const savedTimerRef = useRef(null);
  const noteIdRef = useRef(note?.note_id);

  // Sync local state when note changes (switching between notes)
  useEffect(() => {
    if (note) {
      setTitle(note.title ?? '');
      setContent(note.content ?? '');
      noteIdRef.current = note.note_id;
      setSaveStatus('idle');
    }
  }, [note?.note_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reflect external saving prop
  useEffect(() => {
    if (saving) {
      setSaveStatus('saving');
    }
  }, [saving]);

  // Auto-resize textarea to fit content
  const resizeTextarea = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [content, resizeTextarea]);

  // Focus title on mount
  useEffect(() => {
    titleRef.current?.focus();
  }, [note?.note_id]); // eslint-disable-line react-hooks/exhaustive-deps

  function triggerSave(newTitle, newContent, debounced = true) {
    if (!noteIdRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

    setSaveStatus('saving');

    const doSave = () => {
      onUpdate(noteIdRef.current, { title: newTitle, content: newContent }, { debounced: false });
      setSaveStatus('saved');
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2500);
    };

    if (debounced) {
      saveTimerRef.current = setTimeout(doSave, 500);
    } else {
      doSave();
    }
  }

  function handleTitleFocus(e) {
    if (e.target.value === 'Untitled' || e.target.value === 'Sans titre') {
      e.target.select();
    }
  }

  function handleTitleChange(e) {
    const val = e.target.value;
    setTitle(val);
    triggerSave(val, content, true);
  }

  function handleTitleBlur() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    triggerSave(title, content, false);
  }

  function handleTitleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      contentRef.current?.focus();
    }
  }

  function handleContentChange(e) {
    const val = e.target.value;
    setContent(val);
    resizeTextarea();
    triggerSave(title, val, true);
  }

  function handleContentBlur() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    triggerSave(title, content, false);
  }

  function handleDeleteConfirm() {
    onDelete(noteIdRef.current);
    setShowDeleteConfirm(false);
  }

  if (!note) return null;

  return (
    <div className="note-editor">
      {/* Top bar */}
      <div className="note-editor__topbar">
        <button
          className="note-editor__back-btn"
          onClick={onBack}
          aria-label="Retour aux notes"
        >
          <LuChevronLeft size={18} />
          Notes
        </button>

        <div className="note-editor__topbar-right">
          {/* Save status indicator */}
          <span
            className={`note-editor__save-status note-editor__save-status--${saveStatus}`}
            aria-live="polite"
          >
            {saveStatus === 'saving' && 'Enregistrement…'}
            {saveStatus === 'saved' && (
              <>
                <span className="note-editor__saved-dot" />
                Enregistré
              </>
            )}
          </span>

          {/* Delete button */}
          {!showDeleteConfirm ? (
            <button
              className="note-editor__delete-btn"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Supprimer la note"
            >
              <LuTrash2 size={16} />
              Supprimer
            </button>
          ) : (
            <div className="note-editor__delete-confirm">
              <span className="note-editor__delete-confirm-text">Supprimer cette note ?</span>
              <button
                className="note-editor__delete-confirm-yes"
                onClick={handleDeleteConfirm}
              >
                Oui, supprimer
              </button>
              <button
                className="note-editor__delete-confirm-no"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor body */}
      <div className="note-editor__body">
        {/* Title */}
        <textarea
          ref={titleRef}
          className="note-editor__title"
          value={title}
          onChange={handleTitleChange}
          onFocus={handleTitleFocus}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          placeholder="Sans titre"
          rows={1}
          aria-label="Titre de la note"
        />

        {/* Date / meta */}
        {(note.updated_at || note.folder_name) && (
          <div className="note-editor__meta">
            {note.updated_at && (
              <span>
                {new Date(note.updated_at).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
            {note.folder_name && (
              <span> · {note.folder_name}</span>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="note-editor__divider" />

        {/* Content */}
        <textarea
          ref={contentRef}
          className="note-editor__content"
          value={content}
          onChange={handleContentChange}
          onBlur={handleContentBlur}
          placeholder="Commencez à écrire…"
          aria-label="Contenu de la note"
        />
      </div>
    </div>
  );
}
