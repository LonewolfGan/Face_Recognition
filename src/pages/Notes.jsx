import React, { useState, useEffect, useRef } from 'react';
import NoteModal from '../components/NoteModal';
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import "../styles/components/note-card.css";
import "../styles/components/user-section.css";
import { MdDelete } from "react-icons/md";
import { useAuth } from "../context/AuthContext";
import WebcamCapture from '../components/WebcamCapture';
import { useToastContext } from '../context/ToastContext';
import { ADD_FACE_URL, CONFIG } from '../config';
import ChangePasswordModal from '../components/ChangePasswordModal';
import DeleteNoteModal from '../components/DeleteNoteModal'; // Importer le nouveau composant modal

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
  const [showWebcam, setShowWebcam] = useState(false); // État pour le composant WebcamCapture
  const settingsRef = useRef(null); // Référence pour le menu déroulant
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const navigate = useNavigate(); // Hook pour la navigation
  const { currentUser } = useAuth(); // Récupérer l'utilisateur depuis le contexte d'authentification
  const toast = useToastContext(); // Utiliser le contexte de toast pour les notifications
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false); // État pour la modal de changement de mot de passe
  const [showDeleteNoteModal, setShowDeleteNoteModal] = useState(false); // État pour la modal de suppression de note
  const [noteToDelete, setNoteToDelete] = useState(null); // Note à supprimer

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
  
  // Fonction appelée lorsque les captures sont terminées
  const handleCaptures = async (images) => {
    if (!images || images.length === 0) {
      toast.error("Aucune image capturée.");
      return;
    }

    // Fermer le modal immédiatement
    setShowWebcam(false);

    try {
      const { data: faceData } = await axios.get(`${API_URL}/get_face_id?user_id=${currentUser.user_id}`);
      const face_id = faceData.face_id;
      console.log("Face ID:", face_id);
      console.log("Envoi des images au serveur...", images.length);
      
      const response = await axios.post(ADD_FACE_URL, {
        face_id: face_id,
        images: images,
        name: currentUser.name 
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log("Réponse du serveur:", response.data);

      if (response.data.status === 'success') {
        toast.success('Visage ajouté avec succès!');
      } else {
        toast.error(response.data.message || "Erreur lors de l'ajout du visage");
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du visage:', error);
      toast.error("Erreur lors de l'ajout du visage: " + (error.response?.data?.message || error.message));
    }
  };

  // Fonction appelée en cas d'erreur avec la webcam
  const handleWebcamError = (errorMsg) => {
    toast.error(errorMsg);
    setShowWebcam(false);
  };

  // Fonctions pour gérer les actions du menu paramètres
  function handleAddFace() {
    setShowSettings(false);
    setShowWebcam(true);
  }

  function handleChangePassword() {
    // Afficher la modal de changement de mot de passe au lieu de prompt()
    setShowSettings(false);
    setShowChangePasswordModal(true);
  }

  // Fonction pour fermer la modal de changement de mot de passe
  function handleCloseChangePasswordModal() {
    setShowChangePasswordModal(false);
  }

  async function changePassword(newPassword) {
    try {
      const response = await axios.post(`${API_URL}/change_password`, {
        user_id: currentUser.user_id,
        password: newPassword
      });
      
      if (response.data.status === 'success') {
        toast.success('Mot de passe changé avec succès!');
        setShowChangePasswordModal(false);
      } else {
        toast.error(response.data.message || 'Erreur lors du changement de mot de passe');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion au serveur');
    }
  }

  // Récupérer l'utilisateur depuis le contexte d'authentification
// currentUser is already declared above, so we remove this duplicate declaration
  
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
      toast.error('Impossible de charger les notes: ' + (err.response?.data?.message || err.message));
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
    // Au lieu d'utiliser window.confirm, on stocke la note à supprimer et on affiche le modal
    const noteToDelete = notes.find(note => note.note_id === noteId);
    if (noteToDelete) {
      setNoteToDelete(noteToDelete);
      setShowDeleteNoteModal(true);
    }
  }

  // Fonction pour confirmer la suppression via le modal
  async function confirmDeleteNote() {
    if (!noteToDelete) return;
    
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/notes/${noteToDelete.note_id}?user_id=${currentUser.user_id}`);
      // Mettre à jour l'état local après la suppression
      setNotes(prevNotes => prevNotes.filter(n => n.note_id !== noteToDelete.note_id));
      toast.success('Note supprimée avec succès!');
    } catch (err) {
      console.error('Erreur lors de la suppression de la note:', err);
      toast.error('Erreur lors de la suppression: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
      setShowDeleteNoteModal(false);
      setNoteToDelete(null);
    }
  }

  // Fonction pour fermer le modal de suppression
  function handleCloseDeleteModal() {
    setShowDeleteNoteModal(false);
    setNoteToDelete(null);
  }

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      setShowWebcam(false);
    };
  }, []);

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
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            {showSettings && (
              <div className="settings-menu">
                <button onClick={handleLogout} className="settings-item">
                  <span>Déconnexion</span>
                </button>
                <button onClick={() => handleAddFace()} className="settings-item">
                  Ajouter un visage
                </button>
                <button onClick={handleChangePassword} className="settings-item">
                  Changer le mot de passe
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '20px', fontWeight: 'bold'}}>Mes Notes</h3>
          {loading && <p style={{ textAlign: 'center' }}>Chargement...</p>}
          
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
      
      {/* Composant WebcamCapture pour l'ajout de visage */}
      {showWebcam && (
        <div className="webcam-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            borderRadius: '10px',
            padding: '20px',
            width: '100%',
            maxWidth: '500px',
            position: 'relative',
            zIndex: 10000
          }}>
            {showWebcam && (
              <WebcamCapture
                onCapture={handleCaptures}
                onError={handleWebcamError}
                onCancel={() => setShowWebcam(false)}
                guidanceText="Regardez la caméra pour ajouter votre visage"
                autoStart={true}
              />
            )}
          </div>
        </div>
      )}

      {/* Utilisation du composant ChangePasswordModal */}
      {showChangePasswordModal && (
        <ChangePasswordModal
          onClose={handleCloseChangePasswordModal}
          onChangePassword={changePassword}
          loading={loading} // Passer l'état de chargement si nécessaire
        />
      )}

      {/* Utilisation du composant DeleteNoteModal */}
      {showDeleteNoteModal && noteToDelete && (
        <DeleteNoteModal
          onClose={handleCloseDeleteModal}
          onDelete={confirmDeleteNote}
          noteTitle={noteToDelete.title}
          loading={loading}
        />
      )}
    </div>
  );
}