document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const mainEditor = document.getElementById('main-editor');
    const documentTitle = document.getElementById('document-title');
    const contextInput = document.getElementById('context-input');
    const charactersInput = document.getElementById('characters-input');
    const saveStatus = document.getElementById('save-status');
    const downloadBtn = document.getElementById('download-txt');
    const clearBtn = document.getElementById('clear-editor');
    
    // Accordion Logic
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            item.classList.toggle('active');
        });
    });

    // Sidebar Toggle
    toggleSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    // Desktop Sidebar Toggle
    const desktopToggleBtn = document.getElementById('desktop-toggle-sidebar');
    if (desktopToggleBtn) {
        desktopToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
    });

    // Theme Logic
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    themeToggleBtn.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme');
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        if (theme === 'dark') {
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    }

    // Auto-save logic
    let saveTimeout;
    
    function showSaved() {
        saveStatus.innerHTML = '<i class="fa-solid fa-check"></i> Salvo';
        saveStatus.style.opacity = '0.7';
    }

    function showSaving() {
        saveStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
        saveStatus.style.opacity = '1';
    }

    function triggerAutoSave() {
        showSaving();
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            localStorage.setItem('novela_title', documentTitle.value);
            localStorage.setItem('novela_content', mainEditor.value);
            localStorage.setItem('novela_context', contextInput.value);
            localStorage.setItem('novela_characters', charactersInput.value);
            showSaved();
        }, 1000);
    }

    // Load Data
    if (localStorage.getItem('novela_title')) {
        documentTitle.value = localStorage.getItem('novela_title');
    }
    if (localStorage.getItem('novela_content')) {
        mainEditor.value = localStorage.getItem('novela_content');
    }
    if (localStorage.getItem('novela_context')) {
        contextInput.value = localStorage.getItem('novela_context');
    }
    if (localStorage.getItem('novela_characters')) {
        charactersInput.value = localStorage.getItem('novela_characters');
    }

    // Event Listeners for inputs
    [mainEditor, documentTitle, contextInput, charactersInput].forEach(el => {
        el.addEventListener('input', triggerAutoSave);
    });

    // Clear Button
    clearBtn.addEventListener('click', () => {
        if(confirm('Tem certeza que deseja apagar todo o texto? Esta ação não pode ser desfeita.')) {
            mainEditor.value = '';
            triggerAutoSave();
        }
    });

    // Download Button
    downloadBtn.addEventListener('click', () => {
        const title = documentTitle.value || 'novela';
        const content = mainEditor.value;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Voice Recognition (Speech-to-Text)
    const voiceBtn = document.getElementById('voice-btn');
    let recognition = null;
    let isListening = false;
    let cursorPosition = 0;
    let interimLength = 0;

    // Check browser support for Speech Recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'pt-BR';
        recognition.maxAlternatives = 1;

        // Throttle para atualizações interim (evita sobrecarga do DOM)
        let interimUpdatePending = false;
        let pendingInterimText = '';

        recognition.onstart = () => {
            isListening = true;
            // Capturar a posição atual do cursor quando começa a ouvir
            cursorPosition = mainEditor.selectionStart;
            interimLength = 0;
            voiceBtn.classList.add('active');
            voiceBtn.innerHTML = '<i class="fa-solid fa-microphone-lines"></i>';
            voiceBtn.title = 'Parar Ditado';
            saveStatus.innerHTML = '<i class="fa-solid fa-microphone-lines"></i> Ouvindo...';
            saveStatus.style.opacity = '1';
            saveStatus.style.color = '#e74c3c';
        };

        recognition.onend = () => {
            isListening = false;
            pendingInterimText = '';
            interimUpdatePending = false;
            
            // Limpar qualquer texto interim restante
            if (interimLength > 0) {
                const value = mainEditor.value;
                mainEditor.value = value.substring(0, cursorPosition) + value.substring(cursorPosition + interimLength);
                interimLength = 0;
            }
            voiceBtn.classList.remove('active');
            voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
            voiceBtn.title = 'Ditado por Voz';
            showSaved();
        };

        // Função otimizada para atualizar texto interim usando requestAnimationFrame
        function updateInterimText() {
            if (!pendingInterimText) {
                interimUpdatePending = false;
                return;
            }
            
            const value = mainEditor.value;
            
            // Remover texto interim anterior
            if (interimLength > 0) {
                mainEditor.value = value.substring(0, cursorPosition) + value.substring(cursorPosition + interimLength);
            }
            
            // Inserir novo texto interim
            let textToInsert = pendingInterimText;
            if (cursorPosition > 0 && !/\s$/.test(mainEditor.value.substring(0, cursorPosition))) {
                textToInsert = ' ' + textToInsert;
            }
            
            const currentVal = mainEditor.value;
            mainEditor.value = currentVal.substring(0, cursorPosition) + textToInsert + currentVal.substring(cursorPosition);
            interimLength = textToInsert.length;
            
            // Mover cursor
            const newPos = cursorPosition + interimLength;
            mainEditor.setSelectionRange(newPos, newPos);
            
            interimUpdatePending = false;
        }

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Inserir texto final imediatamente (mais rápido)
            if (finalTranscript) {
                const value = mainEditor.value;
                // Remover texto interim se existir
                const baseValue = interimLength > 0 
                    ? value.substring(0, cursorPosition) + value.substring(cursorPosition + interimLength)
                    : value;
                
                let textToInsert = finalTranscript;
                if (cursorPosition > 0 && !/\s$/.test(baseValue.substring(0, cursorPosition))) {
                    textToInsert = ' ' + textToInsert;
                }
                
                mainEditor.value = baseValue.substring(0, cursorPosition) + textToInsert + baseValue.substring(cursorPosition);
                cursorPosition += textToInsert.length;
                interimLength = 0;
                pendingInterimText = '';
                triggerAutoSave();
            }

            // Agendar atualização interim via requestAnimationFrame (mais fluido)
            if (interimTranscript) {
                pendingInterimText = interimTranscript;
                if (!interimUpdatePending) {
                    interimUpdatePending = true;
                    requestAnimationFrame(updateInterimText);
                }
            }
        };

        recognition.onerror = (event) => {
            console.error('Erro no reconhecimento de voz:', event.error);
            saveStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Erro no microfone';
            saveStatus.style.color = '#e74c3c';
            isListening = false;
            interimLength = 0;
            voiceBtn.classList.remove('active');
            voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
        };

        voiceBtn.addEventListener('click', () => {
            if (isListening) {
                recognition.stop();
            } else {
                mainEditor.focus();
                recognition.start();
            }
        });
    } else {
        voiceBtn.style.display = 'none';
        console.log('Reconhecimento de voz não suportado neste navegador');
    }

    // ==================== API INTEGRATION - CLOUD SYNC ====================
    
    // Auth Modal Elements
    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authSubmit = document.getElementById('auth-submit');
    const authToggle = document.getElementById('auth-toggle');
    const authToggleText = document.getElementById('auth-toggle-text');
    const authError = document.getElementById('auth-error');
    const authEmail = document.getElementById('auth-email');
    const loginTrigger = document.getElementById('login-trigger');
    const userBadge = document.getElementById('user-badge');
    const usernameDisplay = document.getElementById('username-display');
    const logoutBtn = document.getElementById('logout-btn');
    const cloudDocsSection = document.getElementById('cloud-docs-section');
    const documentsList = document.getElementById('documents-list');
    const newDocumentBtn = document.getElementById('new-document');
    const cloudSaveStatus = document.getElementById('cloud-save-status');
    
    let isRegistering = false;
    let currentDocumentId = null;
    let userDocuments = [];
    
    // Check if user is already logged in
    checkAuth();
    
    // Auth Modal Toggle
    if (loginTrigger) {
        loginTrigger.addEventListener('click', () => {
            authModal.classList.remove('hidden');
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            api.logout();
            location.reload();
        });
    }
    
    // Close modal when clicking outside
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal && !api.isAuthenticated()) {
            authModal.classList.add('hidden');
        }
    });
    
    // Toggle between login and register
    authToggle.addEventListener('click', () => {
        isRegistering = !isRegistering;
        if (isRegistering) {
            authTitle.textContent = 'Cadastrar';
            authSubmit.textContent = 'Criar Conta';
            authToggleText.innerHTML = 'Já tem conta? <a id="auth-toggle">Entrar</a>';
            authEmail.classList.remove('hidden');
            authEmail.required = true;
        } else {
            authTitle.textContent = 'Entrar';
            authSubmit.textContent = 'Entrar';
            authToggleText.innerHTML = 'Não tem conta? <a id="auth-toggle">Cadastre-se</a>';
            authEmail.classList.add('hidden');
            authEmail.required = false;
        }
        // Re-attach event listener
        document.getElementById('auth-toggle').addEventListener('click', arguments.callee);
        authError.textContent = '';
    });
    
    // Auth Form Submit
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.textContent = '';
        
        const username = document.getElementById('auth-username').value;
        const password = document.getElementById('auth-password').value;
        const email = document.getElementById('auth-email').value;
        
        try {
            if (isRegistering) {
                await api.register(username, email, password);
                // Auto login after register
                await api.login(username, password);
            } else {
                await api.login(username, password);
            }
            
            authModal.classList.add('hidden');
            await onLoginSuccess();
        } catch (error) {
            authError.textContent = error.message;
        }
    });
    
    async function checkAuth() {
        if (api.isAuthenticated()) {
            const user = await api.getCurrentUser();
            if (user) {
                await onLoginSuccess();
            } else {
                // Token invalid
                api.logout();
            }
        }
    }
    
    async function onLoginSuccess() {
        const user = await api.getCurrentUser();
        if (!user) return;
        
        // Update UI
        loginTrigger.classList.add('hidden');
        userBadge.classList.remove('hidden');
        usernameDisplay.textContent = user.username;
        downloadBtn.classList.remove('hidden');
        clearBtn.classList.remove('hidden');
        cloudDocsSection.style.display = 'block';
        
        // Load user's documents
        await loadDocuments();
        
        // Start cloud auto-save
        startCloudAutoSave();
    }
    
    async function loadDocuments() {
        try {
            userDocuments = await api.getDocuments();
            renderDocumentsList();
        } catch (error) {
            console.error('Erro ao carregar documentos:', error);
        }
    }
    
    function renderDocumentsList() {
        documentsList.innerHTML = '';
        
        if (userDocuments.length === 0) {
            documentsList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Nenhum documento ainda</p>';
            return;
        }
        
        userDocuments.forEach(doc => {
            const item = document.createElement('div');
            item.className = 'document-item' + (doc.id === currentDocumentId ? ' active' : '');
            item.innerHTML = `
                <div class="document-item-info">
                    <h4>${escapeHtml(doc.title)}</h4>
                    <span>${new Date(doc.updated_at).toLocaleDateString()}</span>
                </div>
                <div class="document-item-actions">
                    <button class="btn-small" title="Carregar"><i class="fa-solid fa-folder-open"></i></button>
                    <button class="btn-small delete-doc" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            
            // Load document on click
            item.querySelector('.btn-small:not(.delete-doc)').addEventListener('click', () => {
                loadDocument(doc);
            });
            
            // Delete document
            item.querySelector('.delete-doc').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Excluir este documento permanentemente?')) {
                    try {
                        await api.deleteDocument(doc.id);
                        if (currentDocumentId === doc.id) {
                            currentDocumentId = null;
                            clearEditor();
                        }
                        await loadDocuments();
                    } catch (error) {
                        alert('Erro ao excluir: ' + error.message);
                    }
                }
            });
            
            documentsList.appendChild(item);
        });
    }
    
    function loadDocument(doc) {
        currentDocumentId = doc.id;
        documentTitle.value = doc.title;
        mainEditor.value = doc.content;
        if (contextInput) contextInput.value = doc.context || '';
        if (charactersInput) charactersInput.value = doc.characters || '';
        
        // Update active state in list
        renderDocumentsList();
        
        // Save to localStorage as backup
        triggerAutoSave();
    }
    
    function clearEditor() {
        documentTitle.value = '';
        mainEditor.value = '';
        if (contextInput) contextInput.value = '';
        if (charactersInput) charactersInput.value = '';
    }
    
    // New Document Button
    if (newDocumentBtn) {
        newDocumentBtn.addEventListener('click', () => {
            currentDocumentId = null;
            clearEditor();
            renderDocumentsList();
            mainEditor.focus();
        });
    }
    
    // Cloud Auto-save
    let cloudSaveTimeout;
    let isSavingToCloud = false;
    
    function startCloudAutoSave() {
        // Add cloud save to input events
        [mainEditor, documentTitle, contextInput, charactersInput].forEach(el => {
            if (el) {
                el.addEventListener('input', triggerCloudAutoSave);
            }
        });
    }
    
    function triggerCloudAutoSave() {
        if (!api.isAuthenticated() || isSavingToCloud) return;
        
        clearTimeout(cloudSaveTimeout);
        cloudSaveTimeout = setTimeout(saveToCloud, 2000);
    }
    
    async function saveToCloud() {
        if (!api.isAuthenticated()) return;
        
        isSavingToCloud = true;
        showCloudSaving();
        
        try {
            const document = {
                title: documentTitle.value || 'Sem título',
                content: mainEditor.value,
                context: contextInput ? contextInput.value : '',
                characters: charactersInput ? charactersInput.value : ''
            };
            
            if (currentDocumentId) {
                // Update existing
                await api.updateDocument(currentDocumentId, document);
            } else {
                // Create new
                const result = await api.createDocument(document);
                currentDocumentId = result.id;
                await loadDocuments(); // Refresh list
            }
            
            showCloudSaved();
        } catch (error) {
            console.error('Erro ao salvar na nuvem:', error);
            showCloudError();
        } finally {
            isSavingToCloud = false;
        }
    }
    
    function showCloudSaving() {
        if (cloudSaveStatus) {
            cloudSaveStatus.classList.remove('hidden');
            cloudSaveStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <small>Salvando...</small>';
        }
    }
    
    function showCloudSaved() {
        if (cloudSaveStatus) {
            cloudSaveStatus.classList.remove('hidden');
            cloudSaveStatus.innerHTML = '<i class="fa-solid fa-cloud"></i> <small>Salvo na nuvem</small>';
            setTimeout(() => {
                cloudSaveStatus.classList.add('hidden');
            }, 3000);
        }
    }
    
    function showCloudError() {
        if (cloudSaveStatus) {
            cloudSaveStatus.classList.remove('hidden');
            cloudSaveStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <small>Erro ao salvar</small>';
            cloudSaveStatus.style.color = 'var(--danger)';
        }
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Expose saveToCloud for manual save
    window.saveToCloud = saveToCloud;
});
