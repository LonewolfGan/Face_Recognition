import React, { useState, useRef, useEffect } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "../styles/components/quill-editor.css";

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalContainerStyle = {
  background: "var(--card)",
  borderRadius: 12,
  width: "95%",
  maxWidth: "700px",
  minHeight: 500,
  maxHeight: "95vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  overflow: "hidden",
};

const titleBarStyle = {
  background: "var(--card)",
  color: "var(--text)",
  padding: "8px 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderTopLeftRadius: 12,
  borderTopRightRadius: 12,
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
  padding: "8px 16px",
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
};

const editorZoneStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  padding: "0 16px 16px 16px",
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
  padding: "8px 16px",
  borderTop: "1px solid var(--bg)",
  fontSize: 12,
  color: "var(--text-muted)",
  display: "flex",
  justifyContent: "space-between",
  background: "var(--bg)",
};

const buttonBarStyle = {
  padding: "12px 16px",
  display: "flex",
  justifyContent: "flex-end",
  borderTop: "1px solid var(--bg)",
  background: "var(--bg)",
  gap: 10,
};

const cancelButtonStyle = {
  color: "var(--text)",
  background: "var(--bg)",
  border: "1px solid var(--text-muted)",
  borderRadius: 4,
  padding: "8px 20px",
  cursor: "pointer",
  fontSize: 15,
  transition: "background 0.15s",
};

const saveButtonStyle = {
  background: "var(--accent)",
  color: "var(--text-light)",
  border: "none",
  borderRadius: 4,
  padding: "8px 20px",
  marginLeft: 10,
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: 15,
  boxShadow: "0 2px 8px rgba(var(--accent-rgb),0.08)",
  transition: "background 0.15s",
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

export default function NoteModal({ note, onClose, onSave, currentUser }) {
  const [title, setTitle] = useState(note ? note.title : "");
  const [content, setContent] = useState(note ? note.content : "");
  const [charCount, setCharCount] = useState(0);
  const [lastModified, setLastModified] = useState(new Date());
  const titleInputRef = useRef(null);

  useEffect(() => {
    setCharCount((content.replace(/<[^>]*>/g, "") || "").length);
    setLastModified(new Date());
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

  const handleSave = () => {    
    // Validation du titre
    if (!title.trim()) {
      alert("Le titre est obligatoire");
      console.log("Erreur : titre vide");
      return;
    }
    
    try {
      // Préparation des données de la note
      const noteData = {
        ...(note ? note : {}),
        title: title.trim(),
        content,
        user_id: currentUser?.user_id,
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
            {note ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </div>
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