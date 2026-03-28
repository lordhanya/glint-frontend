const API_URL = 'https://glint-backend-7d4a.onrender.com/chat';

const elements = {
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('overlay'),
    menuToggle: document.getElementById('menuToggle'),
    newChatBtn: document.getElementById('newChatBtn'),
    clearChatBtn: document.getElementById('clearChatBtn'),
    historyList: document.getElementById('historyList'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    messagesContainer: document.getElementById('messagesContainer'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    chatContainer: document.getElementById('chatContainer'),
    suggestionCards: document.querySelectorAll('.suggestion-card')
};

let isLoading = false;
let chatHistory = [];

const userAvatar = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const aiAvatar = `<img src="G.png" alt="Glint" style="width:20px;height:20px;object-fit:contain;border-radius:4px;" />`;

const copyIcon = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
    <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
</svg>`;

function init() {
    setupEventListeners();
    autoResizeTextarea();
    showPrototypeAlert();
}

function showPrototypeAlert() {
    Swal.fire({
        title: 'Welcome to Glint AI',
        html: `
            <div style="text-align: left; font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                <p style="margin-bottom: 12px;">This is a <strong style="color: #A855F7;">prototype version</strong> powered by Gemini 2.5 Flash.</p>
                <p style="margin-bottom: 8px;">You may experience:</p>
                <ul style="margin-left: 20px; margin-bottom: 8px;">
                    <li>Slow response times occasionally</li>
                    <li>Unexpected errors during high traffic</li>
                    <li>Occasional connectivity issues</li>
                </ul>
                <p style="margin-top: 12px;">Thank you for testing! 🚀</p>
            </div>
        `,
        icon: 'info',
        iconColor: '#A855F7',
        background: '#161616',
        color: '#fafafa',
        confirmButtonText: 'Got it!',
        confirmButtonColor: '#A855F7',
        allowOutsideClick: false,
        backdrop: `rgba(0,0,0,0.8)`,
        customClass: {
            popup: 'prototype-alert-popup',
            title: 'prototype-alert-title'
        }
    });
}

function setupEventListeners() {
    elements.menuToggle.addEventListener('click', toggleSidebar);
    elements.overlay.addEventListener('click', toggleSidebar);
    elements.newChatBtn.addEventListener('click', startNewChat);
    elements.clearChatBtn.addEventListener('click', clearChat);
    elements.sendBtn.addEventListener('click', handleSendMessage);
    
    elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    elements.messageInput.addEventListener('input', () => {
        autoResizeTextarea();
        elements.sendBtn.disabled = !elements.messageInput.value.trim() || isLoading;
    });

    elements.suggestionCards.forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.dataset.prompt;
            elements.messageInput.value = prompt;
            elements.sendBtn.disabled = false;
            handleSendMessage();
        });
    });
}

function autoResizeTextarea() {
    elements.messageInput.style.height = 'auto';
    elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 150) + 'px';
}

function toggleSidebar() {
    elements.sidebar.classList.toggle('open');
    elements.overlay.classList.toggle('active');
}

function startNewChat() {
    elements.welcomeScreen.style.display = 'flex';
    elements.messagesContainer.classList.remove('active');
    elements.messageInput.value = '';
    elements.sendBtn.disabled = true;
    chatHistory = [];
    toggleSidebar();
}

function clearChat() {
    elements.messagesContainer.innerHTML = '';
    elements.messagesContainer.classList.remove('active');
    elements.welcomeScreen.style.display = 'flex';
    chatHistory = [];
    toggleSidebar();
}

async function handleSendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message || isLoading) return;

    isLoading = true;
    elements.sendBtn.disabled = true;
    elements.messageInput.disabled = true;

    if (chatHistory.length === 0) {
        elements.welcomeScreen.style.display = 'none';
        elements.messagesContainer.classList.add('active');
    }

    addMessage(message, 'user');
    chatHistory.push({ role: 'user', content: message });
    
    elements.messageInput.value = '';
    autoResizeTextarea();

    const typingIndicator = showTypingIndicator();

    try {
        const response = await sendToAPI(message);
        removeTypingIndicator(typingIndicator);
        
        if (response.reply) {
            const formattedReply = formatMessage(response.reply);
            addMessage(formattedReply, 'ai');
            chatHistory.push({ role: 'ai', content: response.reply });
        } else {
            throw new Error('Empty response from server');
        }
    } catch (error) {
        removeTypingIndicator(typingIndicator);
        showError('Failed to get response. Please check if the backend is running on port 5000.');
        console.error('API Error:', error);
    } finally {
        isLoading = false;
        elements.messageInput.disabled = false;
        elements.sendBtn.disabled = false;
        elements.messageInput.focus();
    }
}

async function sendToAPI(message) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.reply || `HTTP error ${response.status}`);
    }

    return response.json();
}

function addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const avatarHtml = type === 'user' ? userAvatar : aiAvatar;
    
    let actionsHtml = '';
    if (type === 'ai') {
        actionsHtml = `
            <div class="message-actions">
                <button class="message-action-btn copy-btn" title="Copy" data-content="${escapeHtml(content)}">
                    ${copyIcon}
                </button>
            </div>
        `;
    }

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatarHtml}</div>
        <div class="message-content">
            ${content}
            ${actionsHtml}
        </div>
    `;

    if (type === 'ai') {
        const copyBtn = messageDiv.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => copyToClipboard(content, copyBtn));
    }

    elements.messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">${aiAvatar}</div>
        <div class="typing-indicator">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span class="typing-text">Glint is thinking...</span>
        </div>
    `;

    elements.messagesContainer.appendChild(typingDiv);
    scrollToBottom();
    return typingDiv;
}

function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
    }
}

function formatMessage(text) {
    let formatted = escapeHtml(text);
    
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
    });

    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalIcon = button.innerHTML;
        button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17L4 12" stroke="#22C55E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        button.title = 'Copied!';
        
        setTimeout(() => {
            button.innerHTML = originalIcon;
            button.title = 'Copy';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

function scrollToBottom() {
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
}

function showError(message) {
    const existingToast = document.querySelector('.error-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

init();
