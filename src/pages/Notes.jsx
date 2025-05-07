import React, { useState, useEffect, useRef } from 'react';
import NoteModal from '../components/NoteModal';
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import "../styles/components/note-card.css";
import "../styles/components/user-section.css";
import { MdDelete } from "react-icons/md";
import { useAuth } from "../context/AuthContext";

// Configuration de l'API
const API_URL = 'http://localhost:5000';
const NOTES_ENDPOINT = "/notes";


export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null); // Référence pour le menu déroulant
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const navigate = useNavigate(); // Hook pour la navigation
  
  // Gestionnaire pour fermer le menu quand on clique ailleurs
  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    }
    
    // Ajouter l'écouteur d'événement
    document.addEventListener("mousedown", handleClickOutside);
    
    // Nettoyer l'écouteur d'événement
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [settingsRef]);
  
  // Fonction de déconnexion
  const { logout } = useAuth();
  
  function handleLogout() {
    // Utiliser la fonction logout du contexte
    logout();
    
    // Redirection vers la page de connexion
    navigate("/login");
  }
  
  // Fonctions pour gérer les actions du menu paramètres
  function handleAddFace() {
    alert("Fonctionnalité d'ajout de visage à implémenter");
    setShowSettings(false);
  }

  function handleChangePassword() {
    alert("Fonctionnalité de changement de mot de passe à implémenter");
    setShowSettings(false);
  }

  // Récupérer l'utilisateur depuis le contexte d'authentification
  const { currentUser } = useAuth();
  
  useEffect(() => {
    // Rediriger vers la page de connexion si aucun utilisateur n'est trouvé
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);
  
  // Charger les notes au montage ou changement d'utilisateur
  useEffect(() => {
    if (currentUser?.user_id) {
      loadUserNotes();
    }
  }, [currentUser]);

  async function loadUserNotes() {
    if (!currentUser?.user_id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API_URL}/notes?user_id=${currentUser.user_id}`);
      setNotes(response.data.notes || []);
    } catch (err) {
      console.error('Erreur de chargement des notes:', err);
      setError('Impossible de charger les notes: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  function handleOpenModal(note = null) {
    setEditingNote(note);
    setNoteTitle(note ? note.title : '');
    setNoteContent(note ? note.content : '');
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
  }

  async function handleSaveNote(noteData) {
    console.log("handleSaveNote appelé avec :", noteData);
    if (!noteData.title.trim()) {
      alert('Le titre est obligatoire');
      return Promise.reject(new Error('Titre obligatoire'));
    }

    setLoading(true);

    try {
      if (editingNote) {
        // Mise à jour d'une note existante
        await axios.put(`${API_URL}/notes/${editingNote.note_id}`, {
          user_id: currentUser.user_id,
          title: noteData.title,
          content: noteData.content
        });
      } else {
        // Création d'une nouvelle note
        await axios.post(`${API_URL}/notes`, {
          user_id: currentUser.user_id,
          title: noteData.title,
          content: noteData.content
        });
      }
      
      // Recharger les notes après la sauvegarde
      await loadUserNotes();
      handleCloseModal();
      return Promise.resolve(); // Retourne une Promise résolue
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la note:', err);
      alert('Erreur lors de la sauvegarde: ' + (err.response?.data?.message || err.message));
      return Promise.reject(err); // Retourne une Promise rejetée
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteNote(noteId) {
    if (!window.confirm('Voulez-vous vraiment supprimer cette note ?')) {
      return;
    }
    
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/notes/${noteId}?user_id=${currentUser.user_id}`);
      // Mettre à jour l'état local après la suppression
      setNotes(prevNotes => prevNotes.filter(n => n.note_id !== noteId));
    } catch (err) {
      console.error('Erreur lors de la suppression de la note:', err);
      alert('Erreur lors de la suppression: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'var(--bg)'
    }}>
      <div style={{
        backgroundColor: 'var(--card)',
        borderRadius: '10px',
        padding: '30px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '15px',
          borderBottom: '1px solid var(--bg)'
        }}>
          <h2 style={{ margin: 0, fontWeight: 'bold' }}>{currentUser?.name || 'Administrateur'}</h2>
          <div className="settings-dropdown" ref={settingsRef}>
            <button 
              className="settings-button"
              onClick={() => setShowSettings(!showSettings)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            {showSettings && (
              <div className="settings-menu">
                <button onClick={handleLogout} className="settings-item">
                  <span>Déconnexion</span>
                </button>
                <button onClick={() => handleAddFace()} className="settings-item">
                  <span>Ajouter un visage</span>
                </button>
                <button onClick={() => handleChangePassword()} className="settings-item">
                  <span>Changer mot de passe</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '20px', fontWeight: 'bold'}}>Mes Notes</h3>
          {loading && <p style={{ textAlign: 'center' }}>Chargement...</p>}
          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
          
          <div style={{ margin: '15px 0' }}>
            {!loading && notes.length === 0 && (
              <p style={{ textAlign: 'center', color: '#666' }}>Aucune note pour le moment.</p>
            )}
            
            {notes.map(note => (
              <div key={note.note_id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: "space-between",
                backgroundColor: 'var(--bg)',
                borderLeft: '4px solid #6366f1',
                padding: '15px',
                marginBottom: '10px',
                borderRadius: '4px',
                cursor: 'pointer'
              }} onClick={() => handleOpenModal(note)}>
                <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>
                  {note.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 16 }}>
                      <button
                        title="Supprimer la note"
                        onClick={(event) => { 
                          event.stopPropagation();
                          handleDeleteNote(note.note_id)}}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 4,
                          color: "#e53935",
                          display: "flex",
                          alignItems: "center"
                        }}
                      >
                        <MdDelete size={24} />
                      </button>
                    </div>
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <button 
              onClick={() => handleOpenModal()}
              style={{
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                padding: '10px 25px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Ajouter une note
            </button>
          </div>
        </div>
      </div>

      {/* Utilisation du composant NoteModal */}
      {showModal && (
        <NoteModal 
          note={editingNote}
          onClose={handleCloseModal}
          onSave={handleSaveNote}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}