import React, { useState, useEffect, useRef } from 'react';
import NoteModal from '../components/NoteModal';
import FolderSidebar from '../components/FolderSidebar';
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import "../styles/components/note-card.css";
import "../styles/components/user-section.css";
import { MdDelete, MdAdd, MdSettings, MdOutlineLightMode, MdOutlineDarkMode, MdMenu } from "react-icons/md";
import { useAuth } from "../context/AuthContext";
import WebcamCapture from '../components/WebcamCapture';
import { useToastContext } from '../context/ToastContext';
import { ADD_FACE_URL, CONFIG } from '../config';
import ChangePasswordModal from '../components/ChangePasswordModal';
import DeleteNoteModal from '../components/DeleteNoteModal';
import { useTheme } from '../theme';

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
  const [showWebcam, setShowWebcam] = useState(false);
  const settingsRef = useRef(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToastContext();
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDeleteNoteModal, setShowDeleteNoteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedFolderName, setSelectedFolderName] = useState('');
  const [modalFolderId, setModalFolderId] = useState(null);
  const { isDarkMode, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [fade, setFade] = useState(false);

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
  
  // Charger les notes au montage, changement d'utilisateur ou de dossier
  useEffect(() => {
    if (currentUser?.user_id) {
      setFade(false);
      setTimeout(() => setFade(true), 10); // Déclenche l'animation
      loadUserNotes();
    }
  }, [currentUser, selectedFolderId]);

  async function loadUserNotes() {
    if (!currentUser?.user_id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const endpoint = selectedFolderId 
        ? `${API_URL}/folders/${selectedFolderId}/notes?user_id=${currentUser.user_id}`
        : `${API_URL}/notes?user_id=${currentUser.user_id}`;
      
      const response = await axios.get(endpoint);
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
    setModalFolderId(selectedFolderId);
    console.log('handleOpenModal - selectedFolderId:', selectedFolderId);
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
    console.log('handleSaveNote - modalFolderId:', modalFolderId, 'selectedFolderId:', selectedFolderId);
    if (!noteData.title.trim()) {
      alert('Le titre est obligatoire');
      return Promise.reject(new Error('Titre obligatoire'));
    }

    setLoading(true);

    try {
      if (editingNote) {
        // Mise à jour d'une note existante
        // Utiliser le folder_id de la note d'origine
        const folderIdToSave = editingNote.folder_id; // Utilise l'ID du dossier d'origine

        console.log('handleSaveNote - Envoi PUT avec folder_id:', folderIdToSave);

        await axios.put(`${API_URL}/notes/${editingNote.note_id}`, {
          user_id: currentUser.user_id,
          title: noteData.title,
          content: noteData.content,
          folder_id: folderIdToSave
        });
      } else {
        // Création d'une nouvelle note
        // Utiliser le folder_id sélectionné actuellement
        await axios.post(`${API_URL}/notes`, {
          user_id: currentUser.user_id,
          title: noteData.title,
          content: noteData.content,
          folder_id: modalFolderId || null
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

  useEffect(() => {
    document.body.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Quand on sélectionne un dossier, on met à jour le nom aussi
  function handleFolderSelect(folderId) {
    setSelectedFolderId(folderId);
    if (!folderId) {
      setSelectedFolderName('');
      return;
    }
    // Chercher le nom du dossier dans la liste des dossiers du sidebar
    // On va utiliser une requête API pour récupérer le nom du dossier
    axios.get(`${API_URL}/folders?user_id=${currentUser.user_id}`)
      .then(res => {
        const folder = res.data.folders.find(f => f.folder_id === folderId);
        setSelectedFolderName(folder ? folder.name : '');
      });
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg)'
    }}>
      <FolderSidebar
        currentUser={currentUser}
        onFolderSelect={handleFolderSelect}
        selectedFolderId={selectedFolderId}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      />
      
      <div style={{
        flex: 1,
        padding: '30px',
        overflowY: 'auto',
        width: '100%',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '15px',
          borderBottom: '1px solid var(--bg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {isMobile && (
              <button
                onClick={() => setIsOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px'
                }}
              >
                <MdMenu size={24} />
              </button>
            )}
            <h2 style={{ margin: 0, fontWeight: 'bold' }}>{currentUser?.name || 'Administrateur'}</h2>
          </div>
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            <button
              style={{
                background: "var(--accent)",
                color: "var(--card)",
                border: "none",
                borderRadius: 8,
                padding: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => toggleTheme()}
            >
              {isDarkMode ? (
                <MdOutlineLightMode size="1.5em" />
              ) : (
                <MdOutlineDarkMode size="1.5em" />
              )}
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <MdSettings size={24} />
              </button>
              {showSettings && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--bg)',
                  borderRadius: '8px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  minWidth: '150px',
                  zIndex: '100'
                }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text)',
                      textAlign: 'left',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      ':hover': {
                        backgroundColor: 'var(--bg)'
                      }
                    }}
                  >
                    Déconnexion
                  </button>
                  <button
                    onClick={() => handleAddFace()}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text)',
                      textAlign: 'left',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      ':hover': {
                        backgroundColor: 'var(--bg)'
                      }
                    }}
                  >
                    Ajouter un visage
                  </button>
                  <button
                    onClick={handleChangePassword}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text)',
                      textAlign: 'left',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      ':hover': {
                        backgroundColor: 'var(--bg)'
                      }
                    }}
                  >
                    Changer le mot de passe
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: 0, fontWeight: 'bold', color: 'var(--text)'}}>
              {selectedFolderId ? selectedFolderName : 'Toutes les notes'}
            </h3>
            <button 
              onClick={() => handleOpenModal()}
              style={{
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                padding: '8px 20px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <MdAdd size={20} />
              Ajouter une note
            </button>
          </div>
          {loading && <p style={{ textAlign: 'center', color: 'var(--text)' }}>Chargement...</p>}
          
          <div style={{ margin: '15px 0', opacity: fade ? 1 : 0, transition: 'opacity 0.4s' }}>
            {!loading && notes.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text)' }}>Aucune note pour le moment.</p>
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
                cursor: 'pointer',
                position: 'relative'
              }} onClick={() => handleOpenModal(note)}>
                <div style={{ fontWeight: 'bold', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  {note.title}
                  {note.folder_id && note.folder_name && (
                    <span style={{
                      background: 'var(--accent)',
                      color: '#fff',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      padding: '2px 10px',
                      marginLeft: 8,
                      letterSpacing: 0.2,
                      display: 'inline-block',
                      verticalAlign: 'middle',
                    }}>
                      {note.folder_name}
                    </span>
                  )}
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
        </div>
      </div>

      {/* Utilisation du composant NoteModal */}
      {showModal && (
        <NoteModal 
          note={editingNote}
          onClose={handleCloseModal}
          onSave={handleSaveNote}
          currentUser={currentUser}
          currentFolderId={modalFolderId}
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