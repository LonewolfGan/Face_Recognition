import React, { useState, useRef, useEffect } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "../../styles/components/quill-editor.css";
import axios from 'axios';
import { API_URL } from '../../config';
import './NoteModal.css';

const toolbarOptions = [
  ["bold", "italic", "underline", "strike"],
  ["blockquote", "code-block"],
  [{ header: 1 }, { header: 2 }],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ script: "sub" }, { script: "super" }],
  [{ indent: "-1" }, { indent: "+1" }],
  [{ direction: "rtl" }],
  [{ size: ["small", false, "large", "huge"] }],
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ color: [] }, { background: [] }],
  [{ font: [] }],
  [{ align: [] }],
  ["clean"],
];

const modules = { toolbar: toolbarOptions };

export default function NoteModal({ note, onClose, onSave, currentUser, currentFolderId }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [charCount, setCharCount] = useState(0);
  const [lastModified, setLastModified] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(note?.folder_id || currentFolderId || null);
  const titleInputRef = useRef(null);

  useEffect(() => {
    setCharCount((content.replace(/<[^>]*>/g, "") || "").length);
    setLastModified(new Date());
    loadFolders();
  }, [content]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line
  }, []);

  async function loadFolders() {
    try {
      const response = await axios.get(`${API_URL}/folders?user_id=${currentUser.user_id}`);
      setFolders(response.data.folders || []);
    } catch (err) {
      console.error('Erreur de chargement des dossiers:', err);
    }
  }

  const handleSave = () => {
    if (!title.trim()) {
      alert("Le titre est obligatoire");
      return;
    }

    setLoading(true);
    try {
      const noteData = {
        ...(note ? note : {}),
        title: title.trim(),
        content,
        user_id: currentUser?.user_id,
        folder_id: selectedFolderId,
      };

      const result = onSave(noteData);

      if (result && typeof result.then === "function") {
        result
          .then(() => {
            onClose();
          })
          .catch((error) => {
            console.error("Erreur capturée dans handleSave (async):", error);
            alert("Erreur lors de l'enregistrement de la note : " + error?.message);
          });
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Erreur capturée dans handleSave :", error);
      alert("Erreur lors de l'enregistrement de la note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="note-modal-overlay">
      <div className="note-modal-container">
        {/* Barre de titre */}
        <div className="note-modal-titlebar">
          <div className="note-modal-titlebar-text">
            {note && note.title ? `Modifier: ${note.title}` : "Nouvelle note"}
          </div>
          <button
            onClick={onClose}
            className="note-modal-close-btn"
            title="Fermer"
            aria-label="Fermer"
          >
            &times;
          </button>
        </div>

        {/* Zone de titre */}
        <div className="note-modal-title-input-container">
          <label className="note-modal-title-label">Titre:</label>
          <input
            ref={titleInputRef}
            type="text"
            placeholder="Titre de la note"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="note-modal-title-input"
          />
        </div>

        {/* Sélection de dossier */}
        <div className="note-modal-folder-container">
          <label className="note-modal-folder-label">Dossier:</label>
          <select
            value={selectedFolderId || ''}
            onChange={e => setSelectedFolderId(e.target.value || null)}
            className="note-modal-folder-select"
          >
            <option value="">Aucun dossier</option>
            {folders.map(folder => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        {/* Zone d'édition */}
        <div className="note-modal-editor-zone">
          <ReactQuill
            value={content}
            onChange={setContent}
            modules={modules}
            className="note-modal-quill"
            placeholder="Commencez à écrire votre note..."
          />
        </div>

        {/* Barre d'état */}
        <div className="note-modal-statusbar">
          <span>Caractères: {charCount}</span>
          <span>Dernière modification: {lastModified.toLocaleString()}</span>
        </div>

        {/* Barre de boutons */}
        <div className="note-modal-buttonbar">
          <button className="note-modal-cancel-btn" onClick={onClose}>
            Annuler
          </button>
          <button
            className="note-modal-save-btn"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
