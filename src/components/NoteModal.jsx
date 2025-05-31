import React, { useState, useRef, useEffect } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "../styles/components/quill-editor.css";
import axios from 'axios';

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  transition: "background 0.3s"
};

const modalContainerStyle = {
  background: "var(--card)",
  color: "var(--text)",
  borderRadius: 16,
  width: "95%",
  maxWidth: "700px",
  minHeight: 400,
  maxHeight: "95vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
  overflow: "hidden",
  animation: "fadeInModal 0.3s"
};

const titleBarStyle = {
  background: "var(--card)",
  color: "var(--text)",
  padding: "18px 24px 8px 24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
};

const closeButtonStyle = {
  background: "none",
  border: "none",
  color: "var(--text)",
  fontSize: 24,
  cursor: "pointer",
  lineHeight: 1,
  padding: 0,
};

const titleInputContainerStyle = {
  padding: "8px 24px 8px 24px",
  borderBottom: "1px solid var(--bg)",
  background: "var(--bg)",
};

const titleLabelStyle = {
  marginRight: 10,
  fontWeight: "bold",
  fontSize: 15,
  color: "var(--text)",
};

const titleInputStyle = {
  width: "calc(100% - 60px)",
  padding: "8px 12px",
  borderRadius: 4,
  fontSize: 14,
  background: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--bg)"
};

const editorZoneStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  padding: "0 24px 16px 24px",
  overflow: "hidden",
  margin: "5px 0",
};

const quillStyle = {
  flex: 1,
  border: "1px solid var(--bg)",
  borderRadius: 4,
  overflow: "auto",
  minHeight: "200px",
  maxHeight: "350px",
  margin: "5px 0",
  background: "var(--card)",
  color: "var(--text)",
};

const statusBarStyle = {
  padding: "8px 24px",
  borderTop: "1px solid var(--bg)",
  fontSize: 12,
  color: "var(--text-muted)",
  display: "flex",
  justifyContent: "space-between",
  background: "var(--bg)",
};

const buttonBarStyle = {
  padding: "16px 24px",
  display: "flex",
  justifyContent: "flex-end",
  borderTop: "1px solid var(--bg)",
  background: "var(--bg)",
  gap: 16,
};

const cancelButtonStyle = {
  color: "var(--text)",
  background: "var(--bg)",
  border: "1px solid var(--bg)",
  borderRadius: 8,
  padding: "10px 22px",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 500,
  transition: "background 0.15s, color 0.15s, border 0.15s",
};

const saveButtonStyle = {
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 22px",
  marginLeft: 10,
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: 15,
  boxShadow: "0 2px 8px rgba(var(--accent-rgb),0.08)",
  transition: "background 0.15s"
};

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

const API_URL = 'http://localhost:5000';

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
    // Validation du titre
    if (!title.trim()) {
      alert("Le titre est obligatoire");
      console.log("Erreur : titre vide");
      return;
    }
    
    setLoading(true);
    try {
      // Préparation des données de la note
      const noteData = {
        ...(note ? note : {}),
        title: title.trim(),
        content,
        user_id: currentUser?.user_id,
        folder_id: selectedFolderId,
      };
            
      // Appel de la fonction de sauvegarde
      const result = onSave(noteData);
      
      // Gestion des résultats asynchrones (Promise)
      if (result && typeof result.then === "function") {
        result
          .then(() => {
            console.log("onSave terminé sans erreur (async)");
            onClose();
          })
          .catch((error) => {
            console.error("Erreur capturée dans handleSave (async):", error);
            alert("Erreur lors de l'enregistrement de la note : " + error?.message);
          });
      } 
      // Gestion des résultats synchrones
      else {
        console.log("onSave terminé sans erreur (sync)");
        onClose();
      }
    } catch (error) {
      // Gestion des erreurs synchrones
      console.error("Erreur capturée dans handleSave :", error);
      alert("Erreur lors de l'enregistrement de la note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContainerStyle}>
        {/* Barre de titre */}
        <div style={titleBarStyle}>
          <div style={{ fontWeight: "bold", fontSize: 16 }}>
            {note && note.title ? `Modifier: ${note.title}` : "Nouvelle note"}
          </div>
          <button
            onClick={onClose}
            style={closeButtonStyle}
            title="Fermer"
            aria-label="Fermer"
          >
            &times;
          </button>
        </div>
        {/* Zone de titre */}
        <div style={titleInputContainerStyle}>
          <label style={titleLabelStyle}>Titre:</label>
          <input
            ref={titleInputRef}
            type="text"
            placeholder="Titre de la note"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={titleInputStyle}
          />
        </div>
        {/* Zone d'édition séparée */}
        <div style={editorZoneStyle}>
          <ReactQuill
            value={content}
            onChange={setContent}
            modules={modules}
            style={quillStyle}
            placeholder="Commencez à écrire votre note..."
          />
        </div>
        {/* Barre d'état */}
        <div style={statusBarStyle}>
          <span>Caractères: {charCount}</span>
          <span>Dernière modification: {lastModified.toLocaleString()}</span>
        </div>
        {/* Barre de boutons */}
        <div style={buttonBarStyle}>
          <button style={cancelButtonStyle} onClick={onClose}>
            Annuler
          </button>
          <button style={saveButtonStyle} onClick={handleSave}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeInModal {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

const toolbarContainerStyle = {
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: "4px 4px 0 0",
  padding: "8px 8px 0 8px",
  marginBottom: 0,
};

const editorContainerStyle = {
  background: "#fff",
  border: "1px solid #ddd",
  borderTop: "none",
  borderRadius: "0 0 4px 4px",
  minHeight: "220px",
  marginBottom: "5px",
  color: "#111", // texte noir
  padding: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column"
};