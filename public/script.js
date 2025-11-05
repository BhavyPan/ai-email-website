class AIEmailDashboard {
    constructor() {
        this.accessToken = null;
        this.refreshToken = null;
        this.baseUrl = window.location.origin;
        this.emails = [];
        this.priorities = {};
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkUrlForTokens();
        this.checkExistingAuth();
    }

    bindEvents() {
        document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
        document.getElementById('refreshBtn').addEventListener('click', () => this.fetchEmails());
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        
        // AI Features
        document.getElementById('summaryBtn').addEventListener('click', () => this.generateSummary());
        document.getElementById('prioritizeBtn').addEventListener('click', () => this.prioritizeEmails());
        document.getElementById('composeBtn').addEventListener('click', () => this.showComposeSection());
        document.getElementById('generateBtn').addEventListener('click', () => this.generateEmail());
        document.getElementById('sendBtn').addEventListener('click', () => this.sendEmail());
        
        // Priority Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterEmails(e.target.dataset.priority));
        });
    }

    checkUrlForTokens() {
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');

        if (accessToken) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            
            localStorage.setItem('emailAccessToken', this.accessToken);
            if (refreshToken) {
                localStorage.setItem('emailRefreshToken', refreshToken);
            }
            
            window.history.replaceState({}, document.title, window.location.pathname);
            
            this.updateUI();
            this.fetchEmails();
        }
    }

    checkExistingAuth() {
        const savedToken = localStorage.getItem('emailAccessToken');
        if (savedToken) {
            this.accessToken = savedToken;
            this.refreshToken = localStorage.getItem('emailRefreshToken');
            this.updateUI();
            this.fetchEmails();
        }
    }

    async handleLogin() {
        try {
            const response = await fetch('/api/auth/url');
            const { authUrl } = await response.json();
            
            const width = 600;
            const height = 600;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;
            
            window.open(authUrl, 'Google Login', 
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
            
        } catch (error) {
            this.showError('Failed to start login process: ' + error.message);
        }
    }

    updateUI() {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'block';
        document.getElementById('summaryBtn').disabled = false;
        document.getElementById('prioritizeBtn').disabled = false;
    }

    handleLogout() {
        this.accessToken = null;
        this.refreshToken = null;
        this.emails = [];
        this.priorities = {};
        localStorage.removeItem('emailAccessToken');
        localStorage.removeItem('emailRefreshToken');
        
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('summaryBtn').disabled = true;
        document.getElementById('prioritizeBtn').disabled = true;
        document.getElementById('priorityFilters').style.display = 'none';
        
        this.showWelcomeMessage();
        this.resetStats();
        this.hideAISections();
    }

    hideAISections() {
        document.getElementById('summarySection').style.display = 'none';
        document.getElementById('composeSection').style.display = 'none';
    }

    async fetchEmails() {
        if (!this.accessToken) {
            this.showError('Please login first');
            return;
        }

        const container = document.getElementById('emailsContainer');
        container.innerHTML = '<div class="loading">📨 Fetching your emails...</div>';

        try {
            const response = await fetch(`/api/emails?access_token=${encodeURIComponent(this.accessToken)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const emails = await response.json();
            
            if (emails.error) {
                throw new Error(emails.details || emails.error);
            }

            this.emails = emails;
            this.displayEmails(emails);
            this.updateStats(emails);
            document.getElementById('priorityFilters').style.display = 'flex';
            
        } catch (error) {
            console.error('Fetch emails error:', error);
            this.showError('Failed to fetch emails: ' + error.message);
            
            if (error.message.includes('401') || error.message.includes('invalid_token')) {
                this.handleLogout();
            }
        }
    }

    displayEmails(emails) {
        const container = document.getElementById('emailsContainer');
        
        if (!emails || emails.length === 0) {
            container.innerHTML = '<div class="loading">No emails found in your inbox</div>';
            return;
        }

        const emailsHTML = emails.map((email, index) => this.createEmailHTML(email, index)).join('');
        container.innerHTML = emailsHTML;
    }

    createEmailHTML(email, index) {
        const from = email.from || 'Unknown Sender';
        const subject = email.subject || 'No Subject';
        const date = email.date ? new Date(email.date).toLocaleDateString() : 'Unknown date';
        
        const senderName = from.split('<')[0].trim() || from;
        const senderInitial = senderName.charAt(0).toUpperCase();

        const snippet = email.snippet || email.body?.substring(0, 150) || 'No preview available';
        
        const priority = this.priorities[index] || 'medium';
        const priorityClass = `priority-${priority}`;
        const priorityBadge = this.priorities[index] ? 
            `<span class="priority-badge ${priorityClass}">${priority.toUpperCase()}</span>` : '';

        return `
            <div class="email-item ${priorityClass}" data-index="${index}" data-priority="${priority}">
                <div class="email-avatar" title="${senderName}">${senderInitial}</div>
                <div class="email-content">
                    <div class="email-header">
                        <span class="email-sender">${senderName} ${priorityBadge}</span>
                        <span class="email-date">${date}</span>
                    </div>
                    <div class="email-subject">${subject}</div>
                    <div class="email-preview">${snippet}</div>
                </div>
            </div>
        `;
    }

    filterEmails(priority) {
        this.currentFilter = priority;
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.priority === priority);
        });
        
        document.querySelectorAll('.email-item').forEach(item => {
            if (priority === 'all' || item.dataset.priority === priority) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    updateStats(emails) {
        document.getElementById('totalEmails').textContent = emails.length;
        
        const highPriorityCount = Object.values(this.priorities).filter(p => p === 'high').length;
        document.getElementById('highPriority').textContent = highPriorityCount;
    }

    resetStats() {
        document.getElementById('totalEmails').textContent = '0';
        document.getElementById('highPriority').textContent = '0';
    }

    showWelcomeMessage() {
        const container = document.getElementById('emailsContainer');
        container.innerHTML = `
            <div class="welcome-message">
                <h3>Welcome to AI Email Assistant! 🤖</h3>
                <p>Login to access AI-powered email features:</p>
                <div class="features">
                    <div class="feature">📊 Smart Summaries</div>
                    <div class="feature">🎯 Priority Detection</div>
                    <div class="feature">✍️ AI Email Writing</div>
                    <div class="feature">📤 Easy Sending</div>
                </div>
            </div>
        `;
    }

    // AI Features
    async generateSummary() {
        if (!this.accessToken || this.emails.length === 0) {
            this.showError('Please login and fetch emails first');
            return;
        }

        const section = document.getElementById('summarySection');
        const content = document.getElementById('summaryContent');
        
        section.style.display = 'block';
        content.innerHTML = '<div class="loading-ai">Analyzing your emails...</div>';

        try {
            const response = await fetch('/api/summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ emails: this.emails.slice(0, 10) })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.details || data.error);
            }

            content.innerHTML = `<div class="ai-content">${data.summary}</div>`;
        } catch (error) {
            console.error('Summary error:', error);
            content.innerHTML = `<div class="error">Failed to generate summary: ${error.message}</div>`;
        }
    }

    async prioritizeEmails() {
        if (!this.accessToken || this.emails.length === 0) {
            this.showError('Please login and fetch emails first');
            return;
        }

        const container = document.getElementById('emailsContainer');
        container.innerHTML = '<div class="loading-ai">🤖 AI is prioritizing your emails...</div>';

        try {
            const response = await fetch('/api/prioritize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ emails: this.emails })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.details || data.error);
            }

            data.priorities.forEach(item => {
                this.priorities[item.index] = item.priority;
            });

            this.displayEmails(this.emails);
            this.updateStats(this.emails);
            
        } catch (error) {
            console.error('Prioritization error:', error);
            this.showError('Failed to prioritize emails: ' + error.message);
        }
    }

    showComposeSection() {
        if (!this.accessToken) {
            this.showError('Please login first');
            return;
        }

        document.getElementById('composeSection').style.display = 'block';
        document.getElementById('generatedEmail').style.display = 'none';
        document.getElementById('sendBtn').disabled = true;
        
        document.getElementById('toEmail').value = '';
        document.getElementById('emailSubject').value = '';
        document.getElementById('keyPoints').value = '';
        document.getElementById('toneSelect').value = 'professional';
    }

    async generateEmail() {
        const subject = document.getElementById('emailSubject').value.trim();
        const keyPoints = document.getElementById('keyPoints').value.trim();
        const tone = document.getElementById('toneSelect').value;

        if (!subject) {
            this.showError('Please enter a subject for the email');
            return;
        }

        const generateBtn = document.getElementById('generateBtn');
        const generatedEmail = document.getElementById('generatedEmail');
        
        generateBtn.disabled = true;
        generateBtn.textContent = '🤖 Generating...';
        generatedEmail.style.display = 'block';
        generatedEmail.innerHTML = '<div class="loading-ai">Creating your email...</div>';

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    subject, 
                    tone,
                    keyPoints: keyPoints || undefined
                })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.details || data.error);
            }

            generatedEmail.innerHTML = `<div class="ai-content">${data.email}</div>`;
            document.getElementById('sendBtn').disabled = false;
            
        } catch (error) {
            console.error('Generation error:', error);
            generatedEmail.innerHTML = `<div class="error">Failed to generate email: ${error.message}</div>`;
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = '🤖 Generate with AI';
        }
    }

    async sendEmail() {
        const to = document.getElementById('toEmail').value.trim();
        const subject = document.getElementById('emailSubject').value.trim();
        const generatedEmail = document.getElementById('generatedEmail').textContent;

        if (!to || !subject || !generatedEmail) {
            this.showError('Please fill all fields and generate an email first');
            return;
        }

        const sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = true;
        sendBtn.textContent = '📤 Sending...';

        try {
            const response = await fetch('/api/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    access_token: this.accessToken,
                    to,
                    subject,
                    body: generatedEmail
                })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.details || data.error);
            }

            alert('✅ Email sent successfully!');
            document.getElementById('composeSection').style.display = 'none';
            
        } catch (error) {
            console.error('Send error:', error);
            alert('❌ Failed to send email: ' + error.message);
        } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = '📤 Send Email';
        }
    }

    showError(message) {
        const container = document.getElementById('emailsContainer');
        container.innerHTML = `<div class="error">${message}</div>`;
    }
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    new AIEmailDashboard();
});