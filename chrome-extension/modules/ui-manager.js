//  UI Manager - Centralized UI State Management
class UIManager {
    constructor() {
        this.sections = {
            auth: document.getElementById('auth-section'),
            nameInput: document.getElementById('name-input-section'),
            user: document.getElementById('user-section'),
            stats: document.getElementById('stats-section'),
            extensionControl: document.getElementById('extension-control-section')
        };
        
        this.elements = {
            status: document.getElementById('status'),
            userName: document.getElementById('user-name'),
            userEmail: document.getElementById('user-email'),
            enhancedCount: document.getElementById('enhanced-count'),
            nameInputField: document.getElementById('name-input-field'),
            startStopBtn: document.getElementById('start-stop-btn'),
            loginBtn: document.getElementById('login-btn'),
            loginText: document.getElementById('login-text'),
            loginLoading: document.getElementById('login-loading'),
            nameSubmitBtn: document.getElementById('name-submit-btn'),
            nameSubmitText: document.getElementById('name-submit-text'),
            nameSubmitLoading: document.getElementById('name-submit-loading')
        };
        
        this.statsRefreshInterval = null;
    }

    // Show login form
    showLoginForm() {
        this.clearStatsRefresh();
        this.stopTokenRefreshMonitoring();
        this.clearUserInfo();
        this.clearEnhancedCount();
        this.clearNameInput();
        this.hideAllSectionsExcept('auth');
        this.hideSection('extensionControl');
    }

    //  Show name input form
    showNameInputForm(userInfo) {
        this.hideSection('auth');
        this.hideSection('user');
        this.hideSection('stats');
        this.hideSection('extensionControl');
        this.showSection('nameInput');
        
        // Pre-fill name input
        if (this.elements.nameInputField && userInfo.name) {
            this.elements.nameInputField.value = userInfo.name;
            this.elements.nameInputField.focus();
            this.elements.nameInputField.select();
        }
    }

    //  Show user info
    showUserInfo(userInfo) {
        this.updateUserInfo(userInfo);
        this.hideSection('auth');
        this.hideSection('nameInput');
        this.showSection('user');
        this.showSection('stats');
        this.showSection('extensionControl');
        
        // Check extension state
        this.checkExtensionState();
        
        // Start stats refresh
        this.startStatsRefresh();
        
        // Start token monitoring
        this.startTokenRefreshMonitoring();
    }

    //  Update user info display
    updateUserInfo(userInfo) {
        if (this.elements.userName) {
            const displayName = userInfo.name || 'User';
            this.elements.userName.textContent = displayName;
        }
        
        if (this.elements.userEmail) {
            this.elements.userEmail.textContent = userInfo.email || '';
        }
    }

    //  Set loading state for login button
    setLoginLoading(loading) {
        if (this.elements.loginBtn && this.elements.loginText && this.elements.loginLoading) {
            if (loading) {
                this.elements.loginBtn.disabled = true;
                this.elements.loginText.classList.add('hidden');
                this.elements.loginLoading.classList.remove('hidden');
            } else {
                this.elements.loginBtn.disabled = false;
                this.elements.loginText.classList.remove('hidden');
                this.elements.loginLoading.classList.add('hidden');
            }
        }
    }

    //  Set loading state for name submit button
    setNameSubmitLoading(loading) {
        if (this.elements.nameSubmitBtn && this.elements.nameSubmitText && this.elements.nameSubmitLoading) {
            if (loading) {
                this.elements.nameSubmitBtn.disabled = true;
                this.elements.nameSubmitText.classList.add('hidden');
                this.elements.nameSubmitLoading.classList.remove('hidden');
            } else {
                this.elements.nameSubmitBtn.disabled = false;
                this.elements.nameSubmitText.classList.remove('hidden');
                this.elements.nameSubmitLoading.classList.add('hidden');
            }
        }
    }

    //  Show status message
    showStatus(message, type = 'info') {
        if (this.elements.status) {
            this.elements.status.textContent = message;
            this.elements.status.className = `status ${type}`;
            this.elements.status.classList.remove('hidden');
            
            // Auto-hide success messages
            if (type === 'success') {
                setTimeout(() => {
                    if (this.elements.status) {
                        this.elements.status.classList.add('hidden');
                    }
                }, 3000);
            }
        }
    }

    //  Update enhanced count display
    updateEnhancedCount(count) {
        if (this.elements.enhancedCount) {
            this.elements.enhancedCount.textContent = count.toString();
        } else {
        }
    }

    //  Check and update extension state
    checkExtensionState() {
        if (this.elements.startStopBtn) {
            chrome.storage.local.get(['extension_active'], (result) => {
                if (result.extension_active) {
                    this.elements.startStopBtn.textContent = 'Stop';
                    this.elements.startStopBtn.classList.add('stopped');
                } else {
                    this.elements.startStopBtn.textContent = 'Start';
                    this.elements.startStopBtn.classList.remove('stopped');
                }
                this.elements.startStopBtn.disabled = false;
            });
        }
    }

    //  Update start/stop button state
    updateStartStopButton(isActive) {
        if (this.elements.startStopBtn) {
            if (isActive) {
                this.elements.startStopBtn.textContent = 'Stop';
                this.elements.startStopBtn.classList.add('stopped');
            } else {
                this.elements.startStopBtn.textContent = 'Start';
                this.elements.startStopBtn.classList.remove('stopped');
            }
            this.elements.startStopBtn.disabled = false;
        }
    }

    //  Set start/stop button loading
    setStartStopLoading(loading, text = 'Starting...') {
        if (this.elements.startStopBtn) {
            if (loading) {
                this.elements.startStopBtn.disabled = true;
                this.elements.startStopBtn.textContent = text;
            } else {
                this.elements.startStopBtn.disabled = false;
            }
        }
    }

    //  Get name input value
    getNameInputValue() {
        return this.elements.nameInputField ? this.elements.nameInputField.value.trim() : '';
    }

    //  Clear name input
    clearNameInput() {
        if (this.elements.nameInputField) {
            this.elements.nameInputField.value = '';
        }
    }

    //  Clear user info
    clearUserInfo() {
        if (this.elements.userName) this.elements.userName.textContent = '';
        if (this.elements.userEmail) this.elements.userEmail.textContent = '';
    }

    //  Clear enhanced count
    clearEnhancedCount() {
        if (this.elements.enhancedCount) {
            this.elements.enhancedCount.textContent = '0';
        }
    }

    //  Show section
    showSection(sectionName) {
        const section = this.sections[sectionName];
        if (section) {
            section.classList.remove('hidden');
            section.classList.add('fade-in');
        }
    }

    //  Hide section
    hideSection(sectionName) {
        const section = this.sections[sectionName];
        if (section) {
            section.classList.add('hidden');
        }
    }

    //  Hide all sections except one
    hideAllSectionsExcept(exceptSection) {
        Object.keys(this.sections).forEach(sectionName => {
            if (sectionName !== exceptSection) {
                this.hideSection(sectionName);
            }
        });
    }

    //  Start stats refresh interval
    startStatsRefresh() {
        this.clearStatsRefresh();
        this.statsRefreshInterval = setInterval(() => {
            // Trigger count reload event
            window.dispatchEvent(new CustomEvent('reloadCount'));
        }, 30000); // Every 30 seconds
    }

    //  Clear stats refresh interval
    clearStatsRefresh() {
        if (this.statsRefreshInterval) {
            clearInterval(this.statsRefreshInterval);
            this.statsRefreshInterval = null;
        }
    }

    //  Start token refresh monitoring
    startTokenRefreshMonitoring() {
        // This would be handled by the AuthManager
        // Just a placeholder for UI coordination
    }

    //  Stop token refresh monitoring
    stopTokenRefreshMonitoring() {
        // This would be handled by the AuthManager
        // Just a placeholder for UI coordination
    }

    //  Validate name input
    validateNameInput() {
        const name = this.getNameInputValue();
        if (!name) {
            this.showStatus('Please enter your name', 'error');
            if (this.elements.nameInputField) {
                this.elements.nameInputField.focus();
            }
            return false;
        }
        return true;
    }

    //  Focus name input
    focusNameInput() {
        if (this.elements.nameInputField) {
            this.elements.nameInputField.focus();
            this.elements.nameInputField.select();
        }
    }

    //  Show error state
    showError(message) {
        this.showStatus(message, 'error');
    }

    //  Show success state
    showSuccess(message) {
        this.showStatus(message, 'success');
    }

    //  Show info state
    showInfo(message) {
        this.showStatus(message, 'info');
    }

    //  Clear status
    clearStatus() {
        if (this.elements.status) {
            this.elements.status.classList.add('hidden');
        }
    }

    //  Get all UI elements for event binding
    getElementsForBinding() {
        return {
            loginBtn: document.getElementById('login-btn'),
            logoutBtn: document.getElementById('logout-btn'),
            quitBtn: document.getElementById('quit-btn'),
            startStopBtn: document.getElementById('start-stop-btn'),
            nameSubmitBtn: document.getElementById('name-submit-btn'),
            nameInputField: document.getElementById('name-input-field')
        };
    }
} 