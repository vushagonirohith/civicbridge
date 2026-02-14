

class ChatbotManager {
    constructor() {
        this.chatbox = null;
        this.init();
    }

    init() {
        this.createChatWidget();
        this.setupEventListeners();
    }

    createChatWidget() {
        const chatContainer = document.createElement('div');
        chatContainer.id = 'chatbot-container';
        chatContainer.className = 'chatbot-container';
        chatContainer.innerHTML = `
            <div id="chatbot-button" class="chatbot-button">
                <i class="fas fa-comment-dots"></i>
            </div>
            <div id="chatbot-box" class="chatbot-box" style="display: none;">
                <div class="chat-header">
                    <h4>CivicAssist Chatbot</h4>
                    <button class="close-chat">&times;</button>
                </div>
                <div id="chat-window" class="chat-window">
                    <div class="chat-message bot-message">
                        Hello! I'm CivicAssist, the app assistant. I can answer questions about reporting issues, tracking progress, and how the system works.
                    </div>
                </div>
                <div class="chat-input">
                    <input type="text" id="chat-input-field" placeholder="Ask a question..." autocomplete="off">
                    <button id="send-chat-btn"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        `;
        document.body.appendChild(chatContainer);
        this.chatbox = document.getElementById('chatbot-box');
    }

    setupEventListeners() {
        document.getElementById('chatbot-button')?.addEventListener('click', () => this.toggleChatbox(true));
        document.querySelector('.close-chat')?.addEventListener('click', () => this.toggleChatbox(false));
        document.getElementById('send-chat-btn')?.addEventListener('click', () => this.handleUserInput());
        document.getElementById('chat-input-field')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleUserInput();
            }
        });
    }
    
    toggleChatbox(show) {
        if (show === true) {
            this.chatbox.style.display = 'flex';
            document.getElementById('chatbot-button').style.display = 'none';
        } else if (show === false) {
            this.chatbox.style.display = 'none';
            document.getElementById('chatbot-button').style.display = 'block';
        } else {
            const isVisible = this.chatbox.style.display === 'flex';
            this.chatbox.style.display = isVisible ? 'none' : 'flex';
            document.getElementById('chatbot-button').style.display = isVisible ? 'block' : 'none';
        }
        if (this.chatbox.style.display === 'flex') {
            document.getElementById('chat-input-field').focus();
        }
    }

    handleUserInput() {
        const inputField = document.getElementById('chat-input-field');
        const userMessage = inputField.value.trim();

        if (userMessage === '') return;

        this.addMessageToWindow(userMessage, 'user-message');
        
        inputField.value = '';
        inputField.disabled = true;
        document.getElementById('send-chat-btn').disabled = true;

        const indicator = this.showTypingIndicator();
        
        // Use local rules-based function instead of API call
        this.fetchLocalReply(userMessage)
            .then(botReply => {
                this.removeTypingIndicator(indicator);
                this.addMessageToWindow(botReply, 'bot-message');
            })
            .finally(() => {
                inputField.disabled = false;
                document.getElementById('send-chat-btn').disabled = false;
                inputField.focus();
            });
    }

    addMessageToWindow(text, className) {
        const chatWindow = document.getElementById('chat-window');
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${className}`;
        messageEl.textContent = text;
        chatWindow.appendChild(messageEl);
        
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    showTypingIndicator() {
        const chatWindow = document.getElementById('chat-window');
        const indicatorEl = document.createElement('div');
        indicatorEl.className = 'chat-message bot-message typing-indicator';
        indicatorEl.innerHTML = '<span>.</span><span>.</span><span>.</span>';
        chatWindow.appendChild(indicatorEl);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return indicatorEl;
    }

    removeTypingIndicator(indicatorEl) {
        if (indicatorEl && indicatorEl.parentNode) {
            indicatorEl.parentNode.removeChild(indicatorEl);
        }
    }

    // --- UPDATED RULES-BASED RESPONSE LOGIC ---
    async fetchLocalReply(userMessage) {
        // Simulate network delay for better user experience
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const msg = userMessage.toLowerCase();
        let reply = "I'm sorry, I couldn't find a direct answer to that. I can help with questions about reporting issues, using the dashboard, and features.";

        // Keywords and Responses
        if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
            reply = "Hello! I am CivicAssist. How can I guide you through the CivicBridge platform?";
        } else if (msg.includes("report") || msg.includes("issue") || msg.includes("pothole") || msg.includes("graffiti")) {
            reply = "To report an issue: Click the 'Report an Issue' button, fill in the type (like Pothole or Graffiti), add a description, and use the map or 'Find My Live Location' button to pinpoint the location. You can also upload photos!";
        } else if (msg.includes("dashboard") || msg.includes("track") || msg.includes("progress")) {
            reply = "You can view the status of all your submitted issues on the Dashboard. Statuses are: Pending (waiting review), In Progress (being fixed), and Resolved (completed).";
        } else if (msg.includes("login") || msg.includes("signup") || msg.includes("account")) {
            reply = "You can log in or sign up using the buttons in the top right corner. Logging in gives you access to your personal reports and the Dashboard.";
        } else if (msg.includes("admin") || msg.includes("administrator")) {
            reply = "The Admin Dashboard is strictly for system administrators to manage, filter, and update the status of ALL reports across the community.";
        } else if (msg.includes("location") || msg.includes("map") || msg.includes("pinpoint")) {
            reply = "You can pinpoint a location either by searching for an address, clicking directly on the map, or using the 'Find My Live Location' button inside the Report Modal.";
        } else if (msg.includes("theme") || msg.includes("dark mode") || msg.includes("settings")) {
            reply = "You can change the app's appearance (Light, Dark, Auto themes) and manage your notification preferences (Push/Email) in the Settings modal (cog icon in the header).";
        } else if (msg.includes("data") || msg.includes("save") || msg.includes("persistence")) {
            reply = "All user data, including accounts and reports, are primarily saved via the **Google Sheets Service API** for persistence. LocalStorage is used as a fallback/cache.";
        } else if (msg.includes("developer") || msg.includes("credit") || msg.includes("impactx")) {
            reply = "This application was proudly developed by **Team ImpactX**. The key developers are Neethu Reddy Y, Dhruva Kumar Reddy Bodingaru, and Tirri Madhan.";
        } else if (msg.includes("google sheets") || msg.includes("sheets")) {
            reply = "We use a dedicated **Google Sheets Service API** to handle data persistence for user registration, login, and report submissions. It ensures your data is saved and tracked.";
        } else if (msg.includes("photo") || msg.includes("evidence")) {
            reply = "Yes, you can upload up to 5 photos as evidence when submitting a report. Clear photos help ensure faster resolution!";
        } else if (msg.includes("thanks") || msg.includes("thank you")) {
            reply = "You're welcome! I'm here if you have any other questions.";
        }

        return reply;
    }
    // --- END UPDATED LOGIC ---
}

document.addEventListener('DOMContentLoaded', () => {
    window.chatbotManager = new ChatbotManager();
});