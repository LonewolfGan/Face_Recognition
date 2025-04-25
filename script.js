// Variables to track camera state and stream
let cameraActive = false;
let videoStream = null;
let currentUser = null;

// Get DOM elements references
const videoElement = document.getElementById('videoPreview');
const addBtn = document.getElementById('addFace');
const askBtn = document.getElementById('askAccess');
const errorElement = document.getElementById('errorMsg');
const userSection = document.getElementById('userSection');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const notesList = document.getElementById('notesList');
const addNoteBtn = document.getElementById('addNoteBtn');

// API endpoints
const API_URL = 'http://localhost:5000';
const REGISTER_ENDPOINT = '/register';
const LOGIN_ENDPOINT = '/login';
const NOTES_ENDPOINT = '/notes';

// Check browser compatibility for camera access
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showError("Votre navigateur ne supporte pas l'accès à la caméra");
    if (addBtn) addBtn.disabled = true;
    if (askBtn) askBtn.disabled = true;
}

/**
 * Access camera and start video stream
 * @returns {Promise<MediaStream>} - Promise that resolves with the video stream
 */
async function accessCamera() {
    try {
        if (!cameraActive) {
            videoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }, // Use back camera if available
                audio: false // No audio needed
            }); 
            videoElement.srcObject = videoStream;
            cameraActive = true;   
            return videoStream;
        }
    } catch (error) {
        handleCameraError(error);
        return null; // Exit function if there's an error accessing the camera
    }
}

/**
 * Stop camera and release resources
 */
async function stopCamera() {
    if (cameraActive) {
        // Stop all tracks in the video stream
        videoStream.getTracks().forEach(track => track.stop());
        // Reset video stream and camera state
        videoElement.srcObject = null;
        videoStream = null;
        cameraActive = false;
    }
}


/**
 * Capture image from video stream
 * @returns {Promise<string>} - Promise that resolves with the captured image data as a base64 string
 */
async function captureImageForSave() {
    if (!cameraActive || !videoStream) {
        showError('Activez la caméra');
        throw new Error('Camera must be active to capture image');
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
    images = [];
    for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;  
        canvas.height = videoElement.videoHeight;
        //TODO ajouter après une gestion d'erreur si un visage n'est pas detecté
        const context = canvas.getContext('2d');
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        images.push(imageData);
    }
    return images;
}

async function captureImage() {
    if (!cameraActive || !videoStream) {
        showError('Activez la caméra');
        throw new Error('Camera must be active to capture image');
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;  
    canvas.height = videoElement.videoHeight;
    //TODO ajouter après une gestion d'erreur si un visage n'est pas detecté
    const context = canvas.getContext('2d');
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg');

    return imageData;
}

/**
 * Adds a new face to the database by capturing an image and sending it to the server
 * Handles camera activation, image capture, and database addition process
 */
async function addFaceToDatabase() {
    try {
        const name = prompt("Entrez votre nom:");
        if (!name) {
            showError('Nom requis pour l\'enregistrement');
            return;
        }
        
        // Add password prompt
        const password = prompt("Entrez un mot de passe:");
        if (!password) {
            showError('Mot de passe requis pour l\'enregistrement');
            return;
        }
        
        // Confirm password
        const confirmPassword = prompt("Confirmez votre mot de passe:");
        if (password !== confirmPassword) {
            showError('Les mots de passe ne correspondent pas');
            return;
        }
        
        await accessCamera();
        const imagesData = await captureImageForSave();
        stopCamera();
        console.log('Envoi de l\'image au serveur pour ajouter à la base de donnée...')
        const result = await fetch(`${API_URL}${REGISTER_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                name: name,
                password: password,
                images: imagesData 
            }),
        });        
        console.log('Statut de la réponse:', result.status);
        console.log("StatutText de la reponse", result.statusText);


        if (!result.ok) {
            throw new Error(`Erreur serveur: ${result.status} ${result.statusText}`);
        }

        const response = await result.json();
        // Verify response has expected properties
        if (response && response.status === 'success') {
            // Use message if available, otherwise use a default
            alert(response.message || 'Visage ajouté avec succès!');
        } else if (response && response.message) {
            // Show error message if available
            alert(`Erreur: ${response.message}`);
        } 
        
    } catch (error) {
        console.error('Failed to add face:', error);
        showError('Échec de l\'ajout du visage');
    }
}


function loginWithPassword(password) {
    fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
             // Stocker les informations de l'utilisateur
             currentUser = data.user;
            
             // Afficher la section utilisateur
             showUserSection();
             
             // Charger les notes de l'utilisateur
             loadUserNotes();
        } else {
            alert(data.message || "Password login failed.");
        }
    })
    .catch(error => {
        alert("Erreur lors de la connexion par mot de passe : " + error);
    });
}


/**
 * Verify face access by capturing and sending image for recognition
 * Handles camera activation, image capture, and recognition process
 * Displays appropriate alerts based on recognition results
 */
async function verifyFaceAccess() {
    try {
        await accessCamera();
        const imageData = await captureImage();
        stopCamera();
        
        // Utiliser le nouvel endpoint d'API pour la connexion
        const response = await fetch(`${API_URL}${LOGIN_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ image: imageData }),
        });
        
        const result = await response.json();
        console.log('Résultat de la reconnaissance:', result);
        
        if (result.status === 'success') {
            // Stocker les informations de l'utilisateur
            currentUser = result.user;
            
            // Afficher la section utilisateur
            showUserSection();
            
            // Charger les notes de l'utilisateur
            loadUserNotes();
        } else if(result.status ==='face_failed'){
            const password = prompt(result.message || "Face not recognized. Please enter your password:");
            if (password) {
                loginWithPassword(password);
            }
        } else {
            alert('Accès refusé: ' + result.message);
        }   
            
        
    } catch (error) {
        console.error('Failed to verify face:', error);
        showError('Échec de la vérification du visage');
    }
}



/**
 * Affiche la section utilisateur et masque les contrôles de caméra
 */
function showUserSection() {
    // Mettre à jour le nom d'utilisateur
    userName.textContent = currentUser.name;
    
    // Afficher la section utilisateur
    userSection.classList.remove('hidden');
    
    // Masquer les contrôles de caméra (optionnel)
    document.querySelector('.camera-container').style.display = 'none';
    document.querySelector('.controls').style.display = 'none';
}

/**
 * Masque la section utilisateur et affiche les contrôles de caméra
 */
function hideUserSection() {
    // Masquer la section utilisateur
    userSection.classList.add('hidden');
    
    // Afficher les contrôles de caméra
    document.querySelector('.camera-container').style.display = 'block';
    document.querySelector('.controls').style.display = 'block';
    
    // Réinitialiser l'utilisateur courant
    currentUser = null;
}


async function deleteNote(noteId) {
    try {
        const response = await fetch(`${API_URL}${NOTES_ENDPOINT}/${noteId}?user_id=${currentUser.user_id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.status === 'success') {
            loadUserNotes();
        } else {
            showError('Erreur lors de la suppression de la note');
        }
    } catch (error) {
        console.error('Failed to delete note:', error);
        showError('Échec de la suppression de la note');
    }
}


/**
 * Ouvre un éditeur de notes avancé avec Quill.js pour créer ou modifier une note.
 * @param {Object} [note] - Si fourni, la note à modifier. Sinon, création.
 */
function openNoteModal(note = null) {
    // Création du fond du modal
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '1000';

    // Contenu du modal - style moderne
    const editor = document.createElement('div');
    editor.style.background = '#fff';
    editor.style.padding = '0';
    editor.style.borderRadius = '8px';
    editor.style.minWidth = '700px';
    editor.style.maxWidth = '90vw';
    editor.style.minHeight = '500px';
    editor.style.maxHeight = '90vh';
    editor.style.display = 'flex';
    editor.style.flexDirection = 'column';
    editor.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    editor.style.overflow = 'hidden';

    // Barre de titre
    const titleBar = document.createElement('div');
    titleBar.style.background = '#4CAF50';
    titleBar.style.color = 'white';
    titleBar.style.padding = '12px 16px';
    titleBar.style.display = 'flex';
    titleBar.style.justifyContent = 'space-between';
    titleBar.style.alignItems = 'center';
    titleBar.style.borderTopLeftRadius = '8px';
    titleBar.style.borderTopRightRadius = '8px';

    console.log('Note object:', note);
    const titleText = document.createElement('div');
    titleText.textContent = note && note.title ? `Modifier: ${note.title}` : 'Nouvelle note';
    titleText.style.fontWeight = 'bold';
    titleText.style.fontSize = '16px';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.title = 'Fermer';
    
    titleBar.appendChild(titleText);
    titleBar.appendChild(closeBtn);

    // Zone de titre
    const titleContainer = document.createElement('div');
    titleContainer.style.padding = '16px';
    titleContainer.style.borderBottom = '1px solid #eee';

    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Titre:';
    titleLabel.style.marginRight = '10px';
    titleLabel.style.fontWeight = 'bold';
    
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.placeholder = 'Titre de la note';
    titleInput.value = note ? note.title : '';
    titleInput.style.width = 'calc(100% - 60px)';
    titleInput.style.padding = '8px 12px';
    titleInput.style.border = '1px solid #ddd';
    titleInput.style.borderRadius = '4px';
    titleInput.style.fontSize = '14px';
    
    titleContainer.appendChild(titleLabel);
    titleContainer.appendChild(titleInput);

    // Zone d'édition avec Quill
    const editorContainer = document.createElement('div');
    editorContainer.style.flex = '1';
    editorContainer.style.display = 'flex';
    editorContainer.style.flexDirection = 'column';
    editorContainer.style.padding = '0 16px 16px 16px';
    editorContainer.style.overflow = 'hidden';
    editorContainer.style.margin = '5px 0px';
    
    // Conteneur pour l'éditeur Quill
    const quillContainer = document.createElement('div');
    quillContainer.id = 'quill-editor';
    quillContainer.style.flex = '1';
    quillContainer.style.border = '1px solid #ddd';
    quillContainer.style.borderRadius = '4px';
    quillContainer.style.overflow = 'hidden';
    quillContainer.style.height = '300px';
    quillContainer.style.margin = '5px 0px';
    
    editorContainer.appendChild(quillContainer);

    // Barre d'état
    const statusBar = document.createElement('div');
    statusBar.style.padding = '8px 16px';
    statusBar.style.borderTop = '1px solid #eee';
    statusBar.style.fontSize = '12px';
    statusBar.style.color = '#666';
    statusBar.style.display = 'flex';
    statusBar.style.justifyContent = 'space-between';
    
    const charCount = document.createElement('span');
    charCount.textContent = 'Caractères: 0';
    
    const lastModified = document.createElement('span');
    lastModified.textContent = `Dernière modification: ${new Date().toLocaleString()}`;
    
    statusBar.appendChild(charCount);
    statusBar.appendChild(lastModified);

    // Barre de boutons
    const buttonBar = document.createElement('div');
    buttonBar.style.padding = '12px 16px';
    buttonBar.style.display = 'flex';
    buttonBar.style.justifyContent = 'flex-end';
    buttonBar.style.borderTop = '1px solid #eee';
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = note ? 'Enregistrer' : 'Créer';
    saveBtn.style.background = '#4CAF50';
    saveBtn.style.color = 'white';
    saveBtn.style.border = 'none';
    saveBtn.style.borderRadius = '4px';
    saveBtn.style.padding = '8px 20px';
    saveBtn.style.marginLeft = '10px';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.fontWeight = 'bold';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Annuler';
    cancelBtn.style.background = '#f5f5f5';
    cancelBtn.style.border = '1px solid #ddd';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.padding = '8px 20px';
    cancelBtn.style.cursor = 'pointer';
    
    buttonBar.appendChild(cancelBtn);
    buttonBar.appendChild(saveBtn);

    // Assemblage de l'éditeur
    editor.appendChild(titleBar);
    editor.appendChild(titleContainer);
    editor.appendChild(editorContainer);
    editor.appendChild(statusBar);
    editor.appendChild(buttonBar);
    modal.appendChild(editor);
    document.body.appendChild(modal);

    // Initialiser Quill après avoir ajouté l'élément au DOM
    const quill = new Quill('#quill-editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'header': 1 }, { 'header': 2 }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'script': 'sub' }, { 'script': 'super' }],
                [{ 'indent': '-1' }, { 'indent': '+1' }],
                [{ 'direction': 'rtl' }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'font': [] }],
                [{ 'align': [] }],
                ['clean']
            ]
        },
        placeholder: 'Commencez à écrire votre note...'
    });
    
    // Définir le contenu initial
    if (note && note.content) {
        quill.clipboard.dangerouslyPasteHTML(note.content);
    }
    
    // Mettre à jour le compteur de caractères
    function updateCharCount() {
        const text = quill.getText() || '';
        charCount.textContent = `Caractères: ${text.length - 1}`; // -1 pour ignorer le saut de ligne final
        lastModified.textContent = `Dernière modification: ${new Date().toLocaleString()}`;
    }
    
    quill.on('text-change', updateCharCount);
    updateCharCount();

    // Gestion des événements
    closeBtn.onclick = () => document.body.removeChild(modal);
    cancelBtn.onclick = () => document.body.removeChild(modal);
    
    saveBtn.onclick = async () => {
        const title = titleInput.value.trim();
        const content = quill.root.innerHTML;
        
        if (!title) {
            alert('Le titre est obligatoire');
            return;
        }
        
        try {
            if (note) {
                // Modification
                const response = await fetch(`${API_URL}${NOTES_ENDPOINT}/${note.note_id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: currentUser.user_id,
                        title: title,
                        content: content
                    })
                });
                
                const result = await response.json();
                if (result.status === 'success') {
                    document.body.removeChild(modal);
                    loadUserNotes();
                } else {
                    alert('Erreur lors de la mise à jour de la note');
                }
            } else {
                // Création
                const response = await fetch(`${API_URL}${NOTES_ENDPOINT}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: currentUser.user_id,
                        title: title,
                        content: content
                    })
                });
                
                const result = await response.json();
                if (result.status === 'success') {
                    document.body.removeChild(modal);
                    loadUserNotes();
                } else {
                    alert('Erreur lors de la création de la note');
                }
            }
        } catch (error) {
            alert('Erreur lors de l\'enregistrement de la note');
        }
    };

    // Raccourcis clavier
    const keydownHandler = function(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', keydownHandler);
        } else if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveBtn.click();
        }
    };
    
    document.addEventListener('keydown', keydownHandler);

    // Focus initial
    titleInput.focus();
    titleInput.style.outline = '2px solid black';
}



async function loadUserNotes() {
    try {
        const response = await fetch(`${API_URL}${NOTES_ENDPOINT}?user_id=${currentUser.user_id}`);
        const data = await response.json();
        
        // Vider la liste des notes
        notesList.innerHTML = '';
        
        if (data.status === 'success') {
            if (data.notes && data.notes.length > 0) {
                // Afficher chaque note
                data.notes.forEach(note => {
                    const noteElement = document.createElement('div');
                    noteElement.className = 'note-item';
                    noteElement.style.display = 'flex';
                    noteElement.style.justifyContent = 'space-between';
                    noteElement.style.alignItems = 'center';
                    noteElement.style.backgroundColor = '#f9f9f9';
                    noteElement.style.borderLeft = '4px solid #4CAF50';
                    noteElement.style.padding = '15px';
                    noteElement.style.marginBottom = '10px';
                    noteElement.style.borderRadius = '4px';

                    noteElement.innerHTML = `
                        <div class="note-title" style="cursor: pointer; flex: 1; margin-right: 15px;">${note.title}</div>
                        <button class="delete-note-btn" style="background: none; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; position: relative; flex-shrink: 0;" title="Supprimer cette note">🗑️</button>
                    `;
                    // Ouvre le modal pour modifier la note
                    noteElement.querySelector('.note-title').addEventListener('click', function(e) {
                        openNoteModal(note);
                    });
                    // Gestion suppression
                    noteElement.querySelector('.delete-note-btn').addEventListener('click', function(e) {
                        e.stopPropagation(); // Empêche le clic sur la note d'afficher le modal
                        if (confirm('Voulez-vous vraiment supprimer cette note ?')) {
                            deleteNote(note.note_id);
                        }
                    });
                    notesList.appendChild(noteElement);
                });
            } else {
                // Aucune note
                notesList.innerHTML = '<p>Aucune note trouvée.</p>';
            }
        } else {
            showError('Erreur lors du chargement des notes');
        }
    } catch (error) {
        console.error('Failed to load notes:', error);
        showError('Échec du chargement des notes');
    }
}


/**
 * Handle camera-related errors
 * Displays appropriate error messages based on error type
 */
function handleCameraError(error) {
    console.error('Erreur caméra:', error);
    let message = 'Erreur inconnue';
    
    // Check specific error types
    if (error.name === 'NotAllowedError') {
        message = 'Accès à la caméra refusé. Veuillez autoriser dans les paramètres';
    } else if (error.name === 'NotFoundError') {
        message = 'Aucun périphérique caméra détecté';
    }
    
    showError(message);
    cameraActive = false;
}

function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add click event listeners
    if (addBtn) addBtn.addEventListener('click', addFaceToDatabase);
    if (askBtn) askBtn.addEventListener('click', verifyFaceAccess);
    if (logoutBtn) logoutBtn.addEventListener('click', hideUserSection);
    if (addNoteBtn) addNoteBtn.addEventListener('click', () => openNoteModal());
});