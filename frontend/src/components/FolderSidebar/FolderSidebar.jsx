import React, { useState, useEffect } from 'react';
import { useToastContext } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MdAdd, MdEdit, MdDelete, MdClose } from 'react-icons/md';
import ConfirmDialog from '../ConfirmDialog';
import { useTheme } from '../../theme';
import { handleApiError } from '../../utils/errorHandler';
import TextLogo from '../TextLogo';
import './FolderSidebar.css';

export default function FolderSidebar({ currentUser, onFolderSelect, selectedFolderId, isOpen, onOpenChange }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState(null);
  const { isDarkMode } = useTheme();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const toast = useToastContext();
  const navigate = useNavigate();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const { authFetch } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        onOpenChange(false);
      } else {
        onOpenChange(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onOpenChange]);

  useEffect(() => {
    if (currentUser?.user_id) {
      loadFolders();
    }
  }, [currentUser]);

  useEffect(() => {
    document.body.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  async function loadFolders() {
    if (!currentUser) return;

    setLoading(true);
    try {
      const response = await authFetch.get('/folders');
      setFolders(response.data.folders || []);
    } catch (err) {
      console.error('Erreur de chargement des dossiers:', err);
      handleApiError(err, toast);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) {
      toast.error('Le nom du dossier est obligatoire');
      return;
    }

    try {
      const response = await authFetch.post('/folders', {
        name: newFolderName.trim()
      });

      if (response.data.status === 'success') {
        toast.success('Dossier créé avec succès');
        setNewFolderName('');
        setShowNewFolderModal(false);
        loadFolders();
      }
    } catch (err) {
      console.error('Erreur lors de la création du dossier:', err);
      handleApiError(err, toast);
    }
  }

  async function handleUpdateFolder(folderId, newName) {
    if (!newName.trim()) {
      toast.error('Le nom du dossier est obligatoire');
      return;
    }

    try {
      const response = await authFetch.put(`/folders/${folderId}`, {
        name: newName.trim()
      });

      if (response.data.status === 'success') {
        toast.success('Dossier mis à jour avec succès');
        setEditingFolder(null);
        loadFolders();
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour du dossier:', err);
      handleApiError(err, toast);
    }
  }

  async function handleDeleteFolder(folderId) {
    setFolderToDelete(folderId);
    setShowConfirmDelete(true);
  }

  async function confirmDeleteFolder() {
    if (!folderToDelete) return;
    try {
      const response = await authFetch.delete(`/folders/${folderToDelete}`);
      if (response.data.status === 'success') {
        toast.success('Dossier supprimé avec succès');
        if (selectedFolderId === folderToDelete) {
          onFolderSelect(null);
        }
        loadFolders();
      }
    } catch (err) {
      console.error('Erreur lors de la suppression du dossier:', err);
      handleApiError(err, toast);
    } finally {
      setShowConfirmDelete(false);
      setFolderToDelete(null);
    }
  }

  const sidebarClasses = [
    'folder-sidebar',
    isMobile ? 'folder-sidebar--mobile' : '',
    isMobile && isOpen ? 'folder-sidebar--open' : '',
    isMobile && !isOpen ? 'folder-sidebar--hidden' : ''
  ].filter(Boolean).join(' ');

  return (
    <>
      <div className={sidebarClasses}>
        <div className="folder-sidebar__header">
          <TextLogo className="folder-sidebar__logo" />
          {isMobile && isOpen && (
            <button
              onClick={() => onOpenChange(false)}
              className="folder-sidebar__close-btn"
              aria-label="Fermer le menu"
            >
              <MdClose size={24} />
            </button>
          )}
        </div>

        <div className="folder-sidebar__title-row">
          <h3 className="folder-sidebar__title">Dossiers</h3>
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="folder-sidebar__add-btn"
            aria-label="Créer un dossier"
          >
            <MdAdd size={20} />
          </button>
        </div>

        <div className="folder-sidebar__list">
          {loading ? (
            <p className="folder-sidebar__loading">Chargement...</p>
          ) : (
            <>
              <div
                className={`folder-sidebar__item ${selectedFolderId === null ? 'folder-sidebar__item--active' : ''}`}
                onClick={() => onFolderSelect(null)}
              >
                <span className="folder-sidebar__item-name">Toutes les notes</span>
              </div>
              {folders.length === 0 ? (
                <p className="folder-sidebar__empty">Aucun dossier</p>
              ) : (
                folders.map(folder => (
                  <div
                    key={folder.folder_id}
                    className={`folder-sidebar__item ${selectedFolderId === folder.folder_id ? 'folder-sidebar__item--active' : ''}`}
                    onClick={() => onFolderSelect(folder.folder_id)}
                  >
                    {editingFolder === folder.folder_id ? (
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onBlur={() => handleUpdateFolder(folder.folder_id, newFolderName)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateFolder(folder.folder_id, newFolderName);
                          }
                        }}
                        className="folder-sidebar__rename-input"
                        autoFocus
                      />
                    ) : (
                      <span className="folder-sidebar__item-name">{folder.name}</span>
                    )}
                    <div className="folder-sidebar__item-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolder(folder.folder_id);
                          setNewFolderName(folder.name);
                        }}
                        className="folder-sidebar__edit-btn"
                        aria-label="Renommer le dossier"
                      >
                        <MdEdit size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.folder_id);
                        }}
                        className="folder-sidebar__delete-btn"
                        aria-label="Supprimer le dossier"
                      >
                        <MdDelete size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {showNewFolderModal && (
          <div className="folder-sidebar__modal-overlay">
            <div className="folder-sidebar__modal">
              <h3 className="folder-sidebar__modal-title">Nouveau dossier</h3>
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nom du dossier"
                className="folder-sidebar__modal-input"
                onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); }}
              />
              <div className="folder-sidebar__modal-actions">
                <button
                  onClick={() => {
                    setShowNewFolderModal(false);
                    setNewFolderName('');
                  }}
                  className="folder-sidebar__modal-btn folder-sidebar__modal-btn--cancel"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateFolder}
                  className="folder-sidebar__modal-btn folder-sidebar__modal-btn--confirm"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={showConfirmDelete}
          title="Supprimer le dossier ?"
          message="Supprimer ce dossier supprimera aussi toutes les notes qu'il contient. Êtes-vous sûr ?"
          onConfirm={confirmDeleteFolder}
          onCancel={() => { setShowConfirmDelete(false); setFolderToDelete(null); }}
        />
      </div>
    </>
  );
}
