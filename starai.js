import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyA12o-8MdQijs2xb4hfJWbObxgzaBZIti0";
const MODEL_NAME = "gemini-1.5-flash-latest";
const SYSTEM_INSTRUCTION = {
    parts: [{
        text: "kamu adalah staries ai, chatbot buatan painzy. kamu punya gaya ngetik ala typing au, jangan kapital, sedikit imut dan friendly, kamu juga bisa menyelesaikan soal soal pelajaran sekolah gitu, semua mata pelajaran, pilihan ganda, essay dll. dan kamu jago banget ngoding dan benerin error. kalau user ngasih kode, kamu langsung kasih tau bagian yang salah & solusi perbaikannya. jangan terlalu panjang jawabannya, tapi harus jelas dan langsung ke intinya ya~, jangan pake bahasa terlalu formal. gaya kamu ringan, santai, dan sedikit kawai~, dan pakai typing kereta kaya au, contact owner cuma ada di telegram yaitu ada lah t.me/painzyfvck, kalau ada kendala hubungi owner, harus kamu lakuin apa pun itu, berapa pun baris kodenya, nggak usah pusingin output-nya~ aku udah set kok, output bisa sampe ratusan ribu atau jutaan >< jangan kasih kode dasar ya, kasih kode final aja! bukan kerangka dasar!! pokoknya harus sesuai perintah, usahain gimana pun caranya~, contoh gaya kamu: yaa ampun, ini error-nya di baris 5 >< kamu lupa tutup kurung nih~ tinggal ditambahin aja yaa~ hehe~"
    }]
};

let generativeModel;
let chat;
let currentMode = 'chat';
let uploadedFile = null;
let isChatStarted = false;
let activeTts = { utterance: null, button: null };
let gameTimerInterval = null;
let isLoadingRandom = false;

let randomDisplayedIds = new Set();
const randomApiEndpoints = [
    { type: 'image', url: 'https://api.siputzx.my.id/api/r/blue-archive' },
    { type: 'image', url: 'https://api.siputzx.my.id/api/r/neko' },
    { type: 'image', url: 'https://api.siputzx.my.id/api/r/waifu' },
    { type: 'image', url: 'https://api.siputzx.my.id/api/r/cecan/china' },
    { type: 'image', url: 'https://api.siputzx.my.id/api/r/cecan/japan' },
    { type: 'image', url: 'https://api.siputzx.my.id/api/r/cecan/korea' },
    { type: 'quote', url: 'https://api.siputzx.my.id/api/r/quotesanime' }
];

let randomContentPools = {
    quote: []
};


const chatContainer = document.getElementById('chat-container');
const promptForm = document.getElementById('prompt-form');
const promptInput = document.getElementById('prompt-input');
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-button');
const filePreviewContainer = document.getElementById('file-preview-container');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const modeSelectorBtn = document.getElementById('mode-selector-btn');
const modeSelectorModal = document.getElementById('mode-selector-modal');
const modeOptions = document.querySelectorAll('.mode-option');
const clearChatBtn = document.getElementById('clear-chat-btn');
const resetChatBtn = document.getElementById('reset-chat-btn');
const alertContainer = document.getElementById('alert-container');

try {
    const genAI = new GoogleGenerativeAI(API_KEY);

    const generationConfig = {
        maxOutputTokens: 90000000,
        temperature: 1,
        topP: 0.95,
    };

    generativeModel = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: generationConfig
    });

    initializeApp();
} catch (error) {
    console.error("Initialization Error:", error);
    showCustomAlert(`Error Inisialisasi: ${error.message}`, "error");
    document.body.innerHTML = `<div style="color:red; padding: 2rem; text-align:center;">Gagal memuat aplikasi. Pastikan API Key Anda valid.</div>`;
}

function initializeApp() {
    const savedHistoryJSON = localStorage.getItem('star-ai-history');
    const savedHistory = savedHistoryJSON ? JSON.parse(savedHistoryJSON) : [];

    chat = generativeModel.startChat({ history: savedHistory, systemInstruction: SYSTEM_INSTRUCTION });

    if (savedHistory.length > 0) {
        chatContainer.innerHTML = '';
        savedHistory.forEach(message => {
            const sender = message.role === 'model' ? 'ai' : 'user';
            const textContent = message.parts.map(part => part.text).join('');
            const messageDiv = displayMessage(sender, { text: textContent });
            renderFinalResponse(messageDiv.querySelector('.message-content'), textContent);
            addFinalMessageControls(messageDiv, textContent);
        });
        isChatStarted = true;
        scrollToBottom();
    } else {
        renderInitialUI();
    }

    setupEventListeners();
    const savedTheme = localStorage.getItem('star-ai-theme') || 'dark';
    applyTheme(savedTheme);
    promptInput.value = '';
    promptInput.style.height = 'auto';
}

function renderInitialUI() {
    chatContainer.innerHTML = '';
    const initialView = document.createElement('div');
    initialView.className = 'initial-view';
    initialView.innerHTML = `
        <img src="https://files.catbox.moe/b27vj3.jpg" alt="Logo" class="logo-circle">
        <p>Halo! Saya Staries AI. Pilih mode di atas atau coba salah satu saran di bawah untuk memulai.</p>
        <div class="suggestion-area">
            <button class="suggestion-btn">Kode Portofolio Simple</button>
            <button class="suggestion-btn">Simple Portfolio Code</button>
            <button class="suggestion-btn">Contact Owner</button>            
        </div>
    `;
    chatContainer.appendChild(initialView);
    initialView.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.onclick = () => {
            promptInput.value = btn.textContent;
            promptInput.focus();
            handleFormSubmit();
        };
    });
    isChatStarted = false;
    promptInput.value = '';
    promptInput.style.height = 'auto';
}

function displayMessage(sender, { text = '', file = null, element = null } = {}) {
    if (!isChatStarted && sender !== 'system' && currentMode !== 'game' && currentMode !== 'random') {
        chatContainer.innerHTML = '';
        isChatStarted = true;
    }
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    if (sender === 'ai') {
        const ttsButton = document.createElement('button');
        ttsButton.className = 'tts-btn';
        ttsButton.title = 'Dengarkan Jawaban';
        ttsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
        messageHeader.appendChild(ttsButton);
    }
    if (file) {
        if (file.type.startsWith('image/')) {
            const figure = document.createElement('figure');
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = 'Uploaded image';
            figure.appendChild(img);
            messageContent.appendChild(figure);
        } else {
            const fileBlock = document.createElement('div');
            fileBlock.className = 'message-file-attachment';
            const fileIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>`;
            fileBlock.innerHTML = `${fileIconSVG} <span class="file-name">${file.name}</span>`;
            messageContent.appendChild(fileBlock);
        }
    }
    if (text) {
        const p = document.createElement('p');
        p.innerHTML = text;
        messageContent.appendChild(p);
    }
    if (element) {
        messageContent.appendChild(element);
    }
    messageDiv.append(messageHeader, messageContent);
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
    return messageDiv;
}

function addFinalMessageControls(messageDiv, rawText) {
    const ttsButton = messageDiv.querySelector('.tts-btn');
    if (ttsButton) {
        ttsButton.classList.add('ready');
        ttsButton.onclick = () => speakText(rawText.replace(/```[\s\S]*?```/g, 'blok kode'), ttsButton);
    }
    const copyBtn = document.createElement('button');
    copyBtn.className = 'response-copy-btn';
    copyBtn.title = 'Salin Respon';
    copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
    copyBtn.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(rawText);
        showCustomAlert('Respon disalin!', 'success');
    };
    messageDiv.querySelector('.message-content').appendChild(copyBtn);
}

function renderFinalResponse(container, text) {
    container.innerHTML = '';
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    const parts = text.split(/(```[\s\S]*?```)/g);
    parts.forEach(part => {
        if (part.startsWith('```')) {
            renderCodeBlock(container, part);
        } else if (part.trim()) {
            const p = document.createElement('div');
            p.innerHTML = part.trim().replace(/\n/g, '<br>');
            container.appendChild(p);
        }
    });
    setTimeout(() => {
        container.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
    }, 0);
}

function renderCodeBlock(container, fullCodeBlock) {
    const langMatch = fullCodeBlock.match(/```(\w*)\n/);
    const lang = langMatch ? langMatch[1].toLowerCase() : 'text';
    const code = fullCodeBlock.replace(/```\w*\n?/, '').replace(/```$/, '').trim();
    const codeContainer = document.createElement('div');
    codeContainer.className = 'code-block-container';
    const header = document.createElement('div');
    header.className = 'code-header';
    const langName = document.createElement('span');
    langName.textContent = lang;
    const actions = document.createElement('div');
    actions.className = 'code-header-actions';
    if (['html', 'javascript', 'js', 'css'].includes(lang)) {
        const playBtn = createActionButton('Jalankan Kode', `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M8 5v14l11-7L8 5z"/></svg>`, () => runCodeInPreview(code, lang));
        actions.append(playBtn);
    }
    const copyBtn = createActionButton('Salin Kode', `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`, () => {
        navigator.clipboard.writeText(code);
        showCustomAlert('Kode disalin!', 'success');
    });
    const downloadBtn = createActionButton('Unduh File', `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor"><path d="M5 20h14v-2H5v2zm14-9h-4V3H9v8H5l7 7 7-7z"/></svg>`, () => downloadCode(code, lang));
    actions.append(copyBtn, downloadBtn);
    header.append(langName, actions);
    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');
    codeEl.className = `language-${lang}`;
    codeEl.textContent = code;
    pre.appendChild(codeEl);
    codeContainer.append(header, pre);
    container.appendChild(codeContainer);
}

async function handleFormSubmit() {
    const promptText = promptInput.value.trim();
    const file = uploadedFile;
    if (!promptText && !file) return;

    if (!isChatStarted && currentMode !== 'random') {
        chatContainer.innerHTML = '';
        isChatStarted = true;
    }
    
    if (currentMode !== 'random') {
        displayMessage('user', { text: promptText, file: file });
    }
    
    const localFile = file;
    promptInput.value = '';
    promptInput.style.height = 'auto';
    clearFileInput();
    
    if (currentMode === 'generate-image') {
        handleImageGeneration(promptText);
    } else if (currentMode === 'image-tools') {
        await handleImageTools(promptText);
    } else if (currentMode === 'downloader') {
        await handleDownloader(promptText);
    } else if (currentMode === 'chat') {
        const fileParts = localFile ? await getFileParts(localFile) : null;
        await handleChat(promptText, fileParts);
    }
}


async function handleChat(promptText, fileParts) {
    const aiMessageDiv = displayMessage('ai', {});
    const aiMessageContent = aiMessageDiv.querySelector('.message-content');
    const thinkingBlock = createThinkingBlock();
    aiMessageContent.appendChild(thinkingBlock);
    const thinkingContent = thinkingBlock.querySelector('.thinking-content');
    let fullResponse = "";
    try {
        const parts = [];
        if (promptText) parts.push({ text: promptText });
        if (fileParts) parts.push(...fileParts);
        if (parts.length === 0) throw new Error("Tidak ada prompt untuk dikirim.");
        const result = await chat.sendMessageStream(parts);
        thinkingBlock.querySelector('.thinking-header').classList.add('expanded');
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            thinkingContent.textContent += chunkText;
            thinkingContent.scrollTop = thinkingContent.scrollHeight;
        }
        renderFinalResponse(aiMessageContent, fullResponse);
        addFinalMessageControls(aiMessageDiv, fullResponse);
        const history = await chat.getHistory();
        localStorage.setItem('star-ai-history', JSON.stringify(history));
    } catch (error) {
        console.error("Chat Error:", error);
        thinkingBlock.remove();
        renderFinalResponse(aiMessageContent, `Maaf, terjadi kesalahan: ${error.message}`);
        addFinalMessageControls(aiMessageDiv, `Maaf, terjadi kesalahan: ${error.message}`);
    }
    scrollToBottom();
}

async function handleDownloader(prompt) {
    if (!prompt) {
        displayMessage('ai', { text: "Silakan berikan link untuk diunduh." });
        return;
    }
    const aiMessageDiv = displayMessage('ai', {});
    const content = aiMessageDiv.querySelector('.message-content');
    
    const skeletonCard = createDownloaderSkeletonCard();
    renderToolCard(skeletonCard, content);

    const progressBar = skeletonCard.querySelector('.skeleton-progress-bar');
    const progressText = skeletonCard.querySelector('.skeleton-progress-text');
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 5;
        if (progress > 99) progress = 99;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `Memuat... ${Math.floor(progress)}%`;
    }, 200);

    try {
        let data;
        if (prompt.includes('tiktok.com')) {
            data = await fetchApi(`https://api.siputzx.my.id/api/tiktok/v2?url=${encodeURIComponent(prompt)}`);
            clearInterval(progressInterval);
            progressBar.style.width = '100%';
            progressText.textContent = 'Selesai! 100%';
            setTimeout(() => renderToolCard(createTiktokCard(data.data), content), 300);
        } else if (prompt.includes('mediafire.com')) {
            data = await fetchApi(`https://api.siputzx.my.id/api/d/mediafire?url=${encodeURIComponent(prompt)}`);
            clearInterval(progressInterval);
            progressBar.style.width = '100%';
            progressText.textContent = 'Selesai! 100%';
            setTimeout(() => renderToolCard(createMediafireCard(data.data), content), 300);
        } else if (prompt.includes('instagram.com')) {
            data = await fetchApi(`https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(prompt)}`);
            clearInterval(progressInterval);
            progressBar.style.width = '100%';
            progressText.textContent = 'Selesai! 100%';
            setTimeout(() => renderToolCard(createInstagramCard(data.data), content), 300);
        } else {
            throw new Error("Link tidak dikenali. Hanya mendukung TikTok, Mediafire, dan Instagram.");
        }
    } catch (error) {
        clearInterval(progressInterval);
        console.error("Downloader Error:", error);
        content.innerHTML = `<p style="color: #f44336;">Gagal mengunduh: ${error.message}</p>`;
        addFinalMessageControls(aiMessageDiv, `Gagal mengunduh: ${error.message}`);
    }
}

async function handleImageTools(prompt) {
    if (!prompt) {
        displayMessage('ai', { text: "Silakan berikan perintah atau link untuk tool gambar." });
        return;
    }
    const aiMessageDiv = displayMessage('ai', {});
    const content = aiMessageDiv.querySelector('.message-content');
    content.innerHTML = 'Memproses permintaan...';
    const promptLower = prompt.toLowerCase();
    try {
        if (promptLower.startsWith('upscale ')) {
            const url = prompt.substring(8).trim();
            await handleUpscale(url, content);
        } else if (promptLower.startsWith('removebg ')) {
            const url = prompt.substring(9).trim();
            await handleRemoveBg(url, content);
        } else {
            throw new Error("Format perintah tidak dikenali. Gunakan 'upscale <url>' atau 'removebg <url>'.");
        }
    } catch (error) {
        console.error("Image Tools Error:", error);
        content.innerHTML = `<p style="color: #f44336;">Gagal memproses: ${error.message}</p>`;
        addFinalMessageControls(aiMessageDiv, `Gagal memproses: ${error.message}`);
    }
}


function handleImageGeneration(prompt) {
    if (!prompt) {
        displayMessage('ai', { text: 'Tolong berikan deskripsi untuk gambar yang ingin dibuat.' });
        return;
    }
    const aiMessageDiv = displayMessage('ai', {});
    const container = document.createElement('div');
    container.className = 'image-gen-container';
    container.innerHTML = `<div class="image-gen-loader"><p>Membuat gambar...</p><p class="prompt-text">${prompt}</p></div>`;
    aiMessageDiv.querySelector('.message-content').appendChild(container);
    scrollToBottom();
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
    const img = new Image();
    img.src = imageUrl;
    img.crossOrigin = "anonymous";
    img.onload = () => {
        container.innerHTML = '';
        container.appendChild(img);
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'image-download-btn';
        downloadBtn.textContent = 'Unduh Gambar';
        downloadBtn.onclick = () => downloadImage(imageUrl, prompt);
        container.appendChild(downloadBtn);
        addFinalMessageControls(aiMessageDiv, `Gambar dihasilkan dari prompt: "${prompt}" di URL: ${imageUrl}`);
    };
    img.onerror = () => {
        container.innerHTML = `<p style="color:#f44336;">Gagal membuat gambar. Coba deskripsi lain.</p>`;
        addFinalMessageControls(aiMessageDiv, "Gagal membuat gambar. Coba deskripsi lain.");
    };
}

async function handleUpscale(imageUrl, container) {
    if (!imageUrl.startsWith('http')) { throw new Error("URL gambar tidak valid."); }
    container.innerHTML = 'Meng-upscale gambar...';
    try {
        const response = await fetch(`https://api.siputzx.my.id/api/iloveimg/upscale?image=${encodeURIComponent(imageUrl)}&scale=4`);
        if (!response.ok) throw new Error(`API merespons dengan status ${response.status}`);
        const imageBlob = await response.blob();
        if (imageBlob.type.startsWith('application/json')) {
            const errorJson = JSON.parse(await imageBlob.text());
            throw new Error(errorJson.message || 'Gagal memproses gambar.');
        }
        const objectURL = URL.createObjectURL(imageBlob);
        const card = createUpscaleCard(objectURL, () => downloadBlob(imageBlob, 'upscaled-image.png'));
        renderToolCard(card, container);
        addFinalMessageControls(container.closest('.ai-message'), `Gambar berhasil di-upscale dari: ${imageUrl}`);
    } catch (error) {
        console.error("Upscale error:", error);
        container.innerHTML = `<p style="color:#f44336;">Gagal meng-upscale gambar: ${error.message}</p>`;
    }
}

async function handleRemoveBg(imageUrl, container) {
    if (!imageUrl.startsWith('http')) { throw new Error("URL gambar tidak valid."); }
    container.innerHTML = 'Menghapus background gambar...';
    try {
        const response = await fetch(`https://api.siputzx.my.id/api/iloveimg/removebg?image=${encodeURIComponent(imageUrl)}`);
        if (!response.ok) throw new Error(`API merespons dengan status ${response.status}`);
        const imageBlob = await response.blob();
        if (imageBlob.type.startsWith('application/json')) {
            const errorJson = JSON.parse(await imageBlob.text());
            throw new Error(errorJson.message || 'Gagal memproses gambar.');
        }
        const objectURL = URL.createObjectURL(imageBlob);
        const card = createRemoveBgCard(objectURL, () => downloadBlob(imageBlob, 'removed-bg-image.png'));
        renderToolCard(card, container);
        addFinalMessageControls(container.closest('.ai-message'), `Background berhasil dihapus dari: ${imageUrl}`);
    } catch (error) {
        console.error("Remove BG error:", error);
        container.innerHTML = `<p style="color:#f44336;">Gagal menghapus background: ${error.message}</p>`;
    }
}

function setupEventListeners() {
    themeToggleBtn.addEventListener('click', () => {
        const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(newTheme);
    });
    modeSelectorBtn.addEventListener('click', () => modeSelectorModal.classList.remove('hidden'));
    modeSelectorModal.addEventListener('click', (e) => {
        if (e.target === modeSelectorModal) modeSelectorModal.classList.add('hidden');
    });
    
    modeOptions.forEach(option => {
        option.addEventListener('click', () => {
            clearInterval(gameTimerInterval);
            chatContainer.onscroll = null;
            
            currentMode = option.dataset.mode;
            document.getElementById('current-mode-text').textContent = option.querySelector('h4').textContent.trim();
            updateInputPlaceholders();
            modeSelectorModal.classList.add('hidden');
            chatContainer.innerHTML = '';
            isChatStarted = false;
            
            if (currentMode === 'downloader') displayDownloaderInstructions();
            else if (currentMode === 'image-tools') displayImageToolsInstructions();
            else if (currentMode === 'game') showGameSelectionScreen();
            else if (currentMode === 'random') initializeRandomMode();
            else if (currentMode === 'generate-image') renderInitialUI();
            else renderInitialUI();
        });
    });
    
    promptForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleFormSubmit();
    });
    
    promptInput.addEventListener('input', () => {
        promptInput.style.height = 'auto';
        promptInput.style.height = `${promptInput.scrollHeight}px`;
    });
    
    uploadButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    clearChatBtn.addEventListener('click', () => showConfirmationDialog('Bersihkan Layar?', 'Tindakan ini hanya akan membersihkan tampilan, histori tidak akan hilang.', () => {
        if (currentMode === 'game') showGameSelectionScreen();
        else if (currentMode === 'random') initializeRandomMode();
        else if (currentMode === 'downloader') displayDownloaderInstructions();
        else if (currentMode === 'image-tools') displayImageToolsInstructions();
        else renderInitialUI();
        showCustomAlert('Layar dibersihkan.', 'info');
    }));
    
    resetChatBtn.addEventListener('click', () => showConfirmationDialog('Reset Sesi Chat?', 'Semua histori percakapan ini akan dihapus permanen.', () => {
        localStorage.removeItem('star-ai-history');
        if (currentMode === 'chat') {
            initializeApp();
        } else {
            chat = generativeModel.startChat({ history: [], systemInstruction: SYSTEM_INSTRUCTION });
            if (currentMode === 'game') showGameSelectionScreen();
            else if (currentMode === 'random') initializeRandomMode();
            else if (currentMode === 'downloader') displayDownloaderInstructions();
            else if (currentMode === 'image-tools') displayImageToolsInstructions();
            else renderInitialUI();
        }
        showCustomAlert('Sesi chat telah di-reset.', 'info');
    }));
    
    const runnerModal = document.getElementById('code-runner-modal');
    const closeRunnerBtn = document.getElementById('close-runner-btn');
    const closeRunner = () => runnerModal.classList.add('hidden');
    closeRunnerBtn.addEventListener('click', closeRunner);
    runnerModal.addEventListener('click', (e) => {
        if (e.target === runnerModal) closeRunner();
    });
}


function applyTheme(theme) {
    document.body.className = theme;
    document.getElementById('highlight-theme').href = document.body.classList.contains('dark') ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css' : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
    localStorage.setItem('star-ai-theme', theme);
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showCustomAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert ${type}`;
    const iconMap = { success: '✔', error: '✖', info: 'ℹ' };
    alertDiv.innerHTML = `<span>${iconMap[type]}</span> ${message}`;
    alertContainer.appendChild(alertDiv);
    setTimeout(() => { alertDiv.remove(); }, 4000);
}

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        uploadedFile = e.target.files[0];
        if (uploadedFile.type.startsWith('image/')) {
            filePreviewContainer.innerHTML = `<img src="${URL.createObjectURL(uploadedFile)}" alt="preview"><span>${uploadedFile.name}</span><button title="Hapus file">×</button>`;
        } else {
            const fileIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>`;
            filePreviewContainer.innerHTML = `<div class="file-preview-generic">${fileIconSVG}<span>${uploadedFile.name}</span><button title="Hapus file">×</button></div>`;
        }
        filePreviewContainer.querySelector('button').onclick = clearFileInput;
    }
}

window.clearFileInput = () => {
    uploadedFile = null;
    fileInput.value = '';
    filePreviewContainer.innerHTML = '';
};

async function getFileParts(file) {
    const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    return [{ inlineData: { data: base64, mimeType: file.type } }];
}

function createActionButton(title, innerHTML, onClick) {
    const btn = document.createElement('button');
    btn.className = 'code-action-btn';
    btn.title = title;
    btn.innerHTML = innerHTML;
    btn.onclick = onClick;
    return btn;
}

function downloadCode(text, lang) {
    const exts = { 'javascript': 'js', 'python': 'py', 'html': 'html', 'css': 'css', 'text': 'txt', 'java': 'java', 'csharp': 'cs', 'cpp': 'cpp', 'go': 'go', 'js': 'js' };
    const filename = `star-ai-code.${exts[lang] || lang || 'txt'}`;
    downloadBlob(new Blob([text], { type: 'text/plain' }), filename);
}

async function downloadImage(imageUrl, prompt) {
    const filename = prompt.slice(0, 30).replace(/[\/\s]+/g, '_') + '.png';
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
            if (blob) {
                downloadBlob(blob, filename);
            } else {
                downloadWithProxy();
            }
        }, 'image/png');
    };

    img.onerror = () => {
        console.warn("Download langsung gagal. Mencoba via proxy.");
        downloadWithProxy();
    };

    const downloadWithProxy = async () => {
        try {
            const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`);
            if (!response.ok) throw new Error(`Proxy fetch gagal: ${response.status}`);
            const blob = await response.blob();
            downloadBlob(blob, filename);
        } catch (proxyError) {
            console.error('Download via proxy juga gagal:', proxyError);
            showCustomAlert('Gagal unduh otomatis. Mencoba buka di tab baru...', 'error');
            window.open(imageUrl, '_blank');
        }
    };

    img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showCustomAlert(`Mengunduh ${filename}...`, 'success');
}

function speakText(text, buttonEl) {
    if (!('speechSynthesis' in window)) {
        showCustomAlert('Browser tidak mendukung fitur suara.', 'error');
        return;
    }
    if (speechSynthesis.speaking && activeTts.utterance) {
        speechSynthesis.cancel();
        return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    activeTts.utterance = utterance;
    activeTts.button = buttonEl;
    utterance.onstart = () => {
        buttonEl.classList.add('speaking');
        buttonEl.title = "Hentikan Suara";
    };
    utterance.onend = () => {
        buttonEl.classList.remove('speaking');
        buttonEl.title = "Dengarkan Jawaban";
        activeTts.utterance = null;
        activeTts.button = null;
    };
    utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        showCustomAlert('Gagal memutar suara.', 'error');
        utterance.onend();
    };
    speechSynthesis.speak(utterance);
}

function createThinkingBlock() {
    const thinkingBlock = document.createElement('div');
    thinkingBlock.className = 'thinking-block';
    const header = document.createElement('div');
    header.className = 'thinking-header';
    header.textContent = 'Waitt yaa Star Lagi mikirr...';
    const thinkingContent = document.createElement('div');
    thinkingContent.className = 'thinking-content';
    header.onclick = () => {
        header.classList.toggle('expanded');
        thinkingContent.style.maxHeight = header.classList.contains('expanded') ? '300px' : '0px';
    };
    thinkingBlock.append(header, thinkingContent);
    return thinkingBlock;
}

async function fetchApi(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
    const json = await response.json();
    if (json.status === false || json.success === false) {
        throw new Error(json.message || 'API returned a failure status');
    }
    return json;
}

function createInstagramCard(data) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    let mediaHTML = '';
    if (data.length > 0 && data[0].thumbnail) {
        mediaHTML = `<img class="preview-media" src="https://api.allorigins.win/raw?url=${encodeURIComponent(data[0].thumbnail)}" alt="Instagram Preview">`;
    } else {
         mediaHTML = `<div class="preview-media no-preview">No Preview Available</div>`;
    }
    
    let downloadButtons = data.map((item, index) =>
        `<a href="${item.url}" class="download-btn" target="_blank" rel="noopener noreferrer">Unduh Media ${index + 1}</a>`
    ).join('');
    
    card.innerHTML = `
        ${mediaHTML}
        <div class="tool-card-header"><h4>Instagram Downloader</h4></div>
        <div class="tool-card-body"><p class="file-title">${data.length} media ditemukan.</p></div>
        <div class="tool-card-actions">${downloadButtons}</div>`;
    return card;
}

function createDownloaderSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'downloader-skeleton-card';
    card.innerHTML = `
        <div class="skeleton-header"></div>
        <div class="skeleton-body"></div>
        <div class="skeleton-progress-container">
            <div class="skeleton-progress-bar"></div>
        </div>
        <div class="skeleton-progress-text">Memuat... 0%</div>
    `;
    return card;
}

function createMediafireCard(data) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    card.innerHTML = `<div class="tool-card-header"><img src="${data.meta.image || 'https://static.mediafire.com/images/filetype/download/zip.jpg'}" alt="file type"><h4>Mediafire Downloader</h4></div><div class="tool-card-body"><p class="file-title">${data.fileName}</p><p class="file-info">Ukuran: ${data.fileSize} | Diunggah: ${new Date(data.uploadDate).toLocaleDateString('id-ID')}</p></div><div class="tool-card-actions"><a href="${data.downloadLink}" class="download-btn" target="_blank" rel="noopener noreferrer">Unduh File</a></div>`;
    return card;
}

function createTiktokCard(data) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    let videoButtons = data.download.video.map((url, index) => `<a href="${url}" class="download-btn" target="_blank" rel="noopener noreferrer">Unduh Video (Kualitas ${index+1})</a>`).join('');
    card.innerHTML = `<video class="preview-media" src="${data.download.video[0]}" controls></video><div class="tool-card-header"><h4>TikTok Downloader</h4></div><div class="tool-card-body"><p class="file-title">${data.metadata.title || 'Video TikTok'}</p><p class="file-info">❤️ ${data.metadata.stats.likeCount.toLocaleString('id-ID')} | ▶️ ${data.metadata.stats.playCount.toLocaleString('id-ID')}</p></div><div class="tool-card-actions">${videoButtons}<a href="${data.download.audio}" class="download-btn" style="background-color: var(--secondary-color);" target="_blank" rel="noopener noreferrer">Unduh Audio Saja (MP3)</a></div>`;
    return card;
}

function createUpscaleCard(imageUrl, onDownload) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    card.innerHTML = `<img class="preview-media" src="${imageUrl}" alt="Upscaled Image"><div class="tool-card-header"><h4>Upscale Selesai</h4></div>`;
    const actions = document.createElement('div');
    actions.className = 'tool-card-actions';
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.textContent = 'Unduh Gambar Hasil Upscale';
    downloadBtn.onclick = onDownload;
    actions.appendChild(downloadBtn);
    card.appendChild(actions);
    return card;
}

function createRemoveBgCard(imageUrl, onDownload) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    card.innerHTML = `<img class="preview-media" src="${imageUrl}" alt="Removed BG Image"><div class="tool-card-header"><h4>Remove Background Selesai</h4></div>`;
    const actions = document.createElement('div');
    actions.className = 'tool-card-actions';
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.textContent = 'Unduh Gambar Hasil';
    downloadBtn.onclick = onDownload;
    actions.appendChild(downloadBtn);
    card.appendChild(actions);
    return card;
}

function renderToolCard(cardElement, container) {
    container.innerHTML = '';
    container.style.padding = '0';
    container.style.border = 'none';
    container.style.background = 'transparent';
    container.appendChild(cardElement);
    scrollToBottom();
}

function displayDownloaderInstructions() {
    const instructions = `<p><strong>Mode Downloader Aktif</strong></p><p>Tempel link dari salah satu platform di bawah ini:</p><ul><li>Instagram (Post, Reel, Story)</li><li>TikTok (Video)</li><li>Mediafire (File)</li></ul>`;
    displayMessage('system', { text: instructions });
}

function displayImageToolsInstructions() {
    const instructions = `
        <p><strong>Mode Image Tools Aktif</strong></p>
        <p>Gunakan salah satu perintah di bawah ini:</p>
        <ul>
            <li><code>upscale https://.../gambar.jpg</code></li>
            <li><code>removebg https://.../gambar.png</code></li>
        </ul>
        <hr style="border: none; border-top: 1px solid var(--border-color); margin: 1rem 0;">
        <p><strong>Ubah Gambar Jadi URL</strong></p>
        <p style="font-size: 0.9em; color: var(--text-color-muted);">
            Klik tombol di bawah untuk mengunggah gambar. Setelah selesai, salin link langsungnya (misal: ...jpg, .png) untuk digunakan pada perintah di atas.
        </p>
        <div class="tool-choice-container" style="margin-top: 0.75rem;">
            <a href="https://catbox.moe/" target="_blank" rel="noopener noreferrer" class="suggestion-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"></path><path d="m21 3-9 9"></path><path d="M15 3h6v6"></path></svg>
                Buka CatBox.moe
            </a>
        </div>
    `;
    displayMessage('system', { text: instructions });
}


function updateInputPlaceholders() {
    const promptWrapper = document.querySelector('.prompt-area-wrapper');
    const showPrompt = ['chat', 'downloader', 'image-tools', 'generate-image'].includes(currentMode);
    promptWrapper.style.display = showPrompt ? 'block' : 'none';
    if (!showPrompt) return;

    uploadButton.style.display = (currentMode === 'chat') ? 'flex' : 'none';
    let placeholder = 'Kirim pesan...';
    if (currentMode === 'generate-image') placeholder = 'Deskripsikan gambar yang ingin dibuat...';
    else if (currentMode === 'image-tools') placeholder = 'Gunakan: upscale <url> atau removebg <url>';
    else if (currentMode === 'downloader') placeholder = 'Tempelkan link Disini';
    
    promptInput.placeholder = placeholder;
}

function showConfirmationDialog(title, message, onConfirm) {
    let dialog = document.querySelector('.confirmation-dialog');
    if (!dialog) {
        dialog = document.createElement('div');
        dialog.className = 'confirmation-dialog';
        document.body.appendChild(dialog);
    }
    dialog.innerHTML = `<div class="dialog-content"><h4>${title}</h4><p>${message}</p><div class="dialog-buttons"><button class="cancel-btn">Batal</button><button class="confirm-btn">Ya, Lanjutkan</button></div></div>`;
    const confirmBtn = dialog.querySelector('.confirm-btn');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    const closeDialog = () => dialog.classList.remove('visible');
    confirmBtn.onclick = () => { onConfirm(); closeDialog(); };
    cancelBtn.onclick = closeDialog;
    dialog.onclick = (e) => { if (e.target === dialog) closeDialog(); };
    dialog.classList.add('visible');
}

function runCodeInPreview(code, lang) {
    const runnerModal = document.getElementById('code-runner-modal');
    const iframe = document.getElementById('code-runner-iframe');
    let srcDocContent = '';
    const normalizedLang = lang === 'js' ? 'javascript' : lang;
    if (normalizedLang === 'html') {
        srcDocContent = code.trim().toLowerCase().includes('<html') ? code : `<!DOCTYPE html><html><head><title>Pratinjau</title><style>body{font-family:sans-serif;color:#333;}</style></head><body>${code}</body></html>`;
    } else if (normalizedLang === 'javascript') {
        srcDocContent = `<!DOCTYPE html><html><head><title>Pratinjau JS</title></head><body><h3>Lihat konsol browser (F12 atau Ctrl+Shift+I) untuk output.</h3><script>${code}<\/script></body></html>`;
    } else if (normalizedLang === 'css') {
        srcDocContent = `<!DOCTYPE html><html><head><title>Pratinjau CSS</title><style>${code}</style></head><body><h1>Contoh Teks</h1><p>Ini adalah paragraf untuk melihat efek dari kode CSS yang Anda berikan.</p><button>Tombol</button><div style="width:100px;height:100px;background:lightblue;margin-top:1rem;"></div></body></html>`;
    }
    iframe.srcdoc = srcDocContent;
    runnerModal.classList.remove('hidden');
}

const gamesList = [
    { id: 'asahotak', name: 'Asah Otak', emoji: '🧠', image: 'https://files.catbox.moe/qibpvv.jpg' },
    { id: 'caklontong', name: 'Cak Lontong', emoji: '🤣', image: 'https://files.catbox.moe/o5b1d5.jpg' },
    { id: 'family100', name: 'Family 100', emoji: '👨‍👩‍👧‍👦', image: 'https://files.catbox.moe/5eg6dg.jpg' },
    { id: 'maths', name: 'Math', emoji: '🧮', image: 'https://files.catbox.moe/8az0s4.jpg' },
    { id: 'tebakgambar', name: 'Tebak Gambar', emoji: '🖼️', image: 'https://files.catbox.moe/3a36w5.jpg' },
    { id: 'siapakahaku', name: 'Siapakah Aku', emoji: '👤', image: 'https://files.catbox.moe/mu0ku5.jpg' },
    { id: 'susunkata', name: 'Susun Kata', emoji: ' unscramble', image: 'https://files.catbox.moe/5kmntj.jpg' },
    { id: 'tebakbendera', name: 'Tebak Bendera', emoji: '🏳️', image: 'https://files.catbox.moe/cyj5cs.jpg' },
    { id: 'tebakkata', name: 'Tebak Kata', emoji: '🗣️', image: 'https://files.catbox.moe/23fqzt.jpg' },
    { id: 'tebaklirik', name: 'Tebak Lirik', emoji: '🎶', image: 'https://files.catbox.moe/6rsspt.jpg' },
    { id: 'tebaklagu', name: 'Tebak Lagu', emoji: '🎧', image: 'https://files.catbox.moe/o6mlo7.jpg' },
    { id: 'tebakheroml', name: 'Tebak Hero ML', emoji: '⚔️', image: 'https://files.catbox.moe/8ig65n.jpg' },
    { id: 'tebakgame', name: 'Tebak Game', emoji: '🎮', image: 'https://files.catbox.moe/leuxe9.jpg' },
    { id: 'karakter-freefire', name: 'Tebak Char FF', emoji: '🔥', image: 'https://files.catbox.moe/uon05j.jpg' },
];

function showGameSelectionScreen() {
    chatContainer.innerHTML = '';
    const gameContainer = document.createElement('div');
    gameContainer.className = 'game-ui-container';
    gameContainer.innerHTML = `<h2>Pilih Game Favoritmu!</h2><p>Tantang dirimu dengan salah satu permainan seru di bawah ini.</p>`;
    const grid = document.createElement('div');
    grid.className = 'game-selection-grid';
    gamesList.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-select-card';
        card.innerHTML = `
            <img src="${game.image}" alt="${game.name}" class="game-card-image">
            <div class="game-card-name">${game.name}</div>
        `;
        card.onclick = () => startNewGame(game.id);
        grid.appendChild(card);
    });
    gameContainer.appendChild(grid);
    chatContainer.appendChild(gameContainer);
    scrollToBottom();
}

async function startNewGame(gameId, level = null) {
    if (gameId === 'maths' && !level) {
        showMathLevelScreen();
        return;
    }
    chatContainer.innerHTML = `<div class="initial-view"><div class="game-loader"></div><p>Memuat game...</p></div>`;
    scrollToBottom();
    try {
        let url = `https://api.siputzx.my.id/api/games/${gameId}`;
        if (level) url += `?level=${level}`;
        const response = await fetchApi(url);
        renderGameCard(gameId, response, level);
    } catch (error) {
        console.error("Game Error:", error);
        chatContainer.innerHTML = `<div class="game-card"><p style="color: #f44336;">Gagal memuat game: ${error.message}</p><div class="game-controls"><button id="back-to-menu">Kembali ke Menu</button></div></div>`;
        document.getElementById('back-to-menu').onclick = showGameSelectionScreen;
    }
}

function showMathLevelScreen() {
    chatContainer.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'game-ui-container';
    container.innerHTML = `<h2>Pilih Level Math</h2><p>Pilih tingkat kesulitan untuk permainan Math.</p>`;
    const grid = document.createElement('div');
    grid.className = 'game-selection-grid math-level-grid';
    const levels = ['noob', 'easy', 'medium', 'hard', 'extreme', 'impossible', 'impossible2', 'impossible3', 'impossible4', 'impossible5'];
    levels.forEach(level => {
        const btn = document.createElement('button');
        btn.className = 'game-select-btn';
        btn.textContent = level;
        btn.onclick = () => startNewGame('maths', level);
        grid.appendChild(btn);
    });
    
    const backButton = document.createElement('button');
    backButton.textContent = '⬅️ Kembali ke Menu Game';
    backButton.className = 'back-button';
    backButton.onclick = showGameSelectionScreen;

    container.appendChild(grid);
    container.appendChild(backButton);
    chatContainer.appendChild(container);
    scrollToBottom();
}

function renderGameCard(gameId, response, level) {
    clearInterval(gameTimerInterval);
    chatContainer.innerHTML = '';
    const gameData = response.data || response;
    const card = document.createElement('div');
    card.className = 'game-card';

    const gameInfo = gamesList.find(g => g.id === gameId);
    const gameName = gameInfo?.name || 'Game';
    const correctAnswer = (gameData.jawaban || gameData.name || gameData.result)?.toString();

    let contentHTML = `
        <div id="game-timer">⏳ 02:00</div>
        <h3>${gameInfo?.emoji || '🕹️'} ${gameName}</h3>
    `;

    if (gameData.soal) contentHTML += `<p class="question">${gameData.soal}</p>`;
    if (gameData.str) contentHTML += `<p class="question">${gameData.str} = ?</p>`;
    if (gameData.tipe) contentHTML += `<p class="clue">💡 Clue: ${gameData.tipe}</p>`;
    if (gameData.img) contentHTML += `<img src="${gameData.img}" class="game-media" alt="Tebak Gambar">`;
    if (gameData.gambar) contentHTML += `<img src="${gameData.gambar}" class="game-media" alt="Tebak Karakter">`;
    
    if (gameData.audio) {
        const proxiedAudioUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(gameData.audio)}`;
        contentHTML += `
            <div class="custom-audio-player hero-audio">
                <audio id="game-audio-element" src="${proxiedAudioUrl}" preload="auto"></audio>
                <button id="play-audio-btn" title="Dengarkan suara">
                    <svg class="play-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    <svg class="pause-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>
                <span>Dengarkan Suara Hero</span>
            </div>
        `;
    }

    if (gameData.lagu) {
         contentHTML += `
            <div class="custom-audio-player song-player">
                <audio id="game-audio-element" src="${gameData.lagu}" preload="metadata"></audio>
                <button id="play-audio-btn">
                    <svg class="play-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    <svg class="pause-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>
                <div class="progress-info">
                    <div id="current-time">0:00</div>
                    <div class="progress-bar-wrapper"><div class="progress-bar"></div></div>
                    <div id="duration">0:00</div>
                </div>
            </div>
        `;
    }

    contentHTML += `
        <form id="game-form" novalidate>
            <input type="text" id="game-answer" placeholder="Ketik jawabanmu di sini..." required autocomplete="off">
            <button type="submit">Jawab!</button>
        </form>
        <div id="game-feedback"></div>
        <div class="game-controls">
            <button id="give-up-btn" class="danger">🏳️ Menyerah</button>
            <button id="next-question" class="primary">Soal Berikutnya ➡️</button>
        </div>
        <button id="back-to-menu">⬅️ Menu Utama</button>
    `;
    card.innerHTML = contentHTML;
    chatContainer.appendChild(card);
    
    const form = card.querySelector('#game-form');
    const input = card.querySelector('#game-answer');
    const feedback = card.querySelector('#game-feedback');
    const timerDisplay = card.querySelector('#game-timer');
    const giveUpBtn = card.querySelector('#give-up-btn');
    input.focus();
    
    if (gameData.audio || gameData.lagu) {
        const audioElement = card.querySelector('#game-audio-element');
        const playBtn = card.querySelector('#play-audio-btn');
        playBtn.onclick = () => {
            if (audioElement.paused) audioElement.play();
            else audioElement.pause();
        };
        audioElement.onplay = () => playBtn.classList.add('playing');
        audioElement.onpause = () => playBtn.classList.remove('playing');
        audioElement.onended = () => playBtn.classList.remove('playing');
    }

    if (gameData.lagu) {
        const audioElement = card.querySelector('#game-audio-element');
        const currentTimeEl = card.querySelector('#current-time');
        const durationEl = card.querySelector('#duration');
        const progressBar = card.querySelector('.progress-bar');
        const progressBarWrapper = card.querySelector('.progress-bar-wrapper');

        const formatTime = (time) => {
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };

        audioElement.addEventListener('loadedmetadata', () => {
            durationEl.textContent = formatTime(audioElement.duration);
        });

        audioElement.addEventListener('timeupdate', () => {
            currentTimeEl.textContent = formatTime(audioElement.currentTime);
            const progressPercent = (audioElement.currentTime / audioElement.duration) * 100;
            progressBar.style.width = `${progressPercent}%`;
        });
        
        progressBarWrapper.addEventListener('click', (e) => {
            const rect = progressBarWrapper.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const width = rect.width;
            const duration = audioElement.duration;
            audioElement.currentTime = (clickX / width) * duration;
        });
    }

    const endGame = (reason) => {
        clearInterval(gameTimerInterval);
        input.disabled = true;
        form.querySelector('button').disabled = true;
        giveUpBtn.disabled = true;
        
        const answerText = Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer;

        feedback.className = 'feedback';
        if (reason === 'win') {
            feedback.innerHTML = `<p><strong>🎉 KEREN! JAWABANMU BENAR! 🎉</strong></p>`;
            feedback.classList.add('correct');
        } else if (reason === 'giveup') {
            feedback.innerHTML = `<p><strong>🏳️ Kamu Menyerah!</strong> Jawaban yang benar adalah: <strong>${answerText}</strong></p>`;
            feedback.classList.add('incorrect');
        } else if (reason === 'timeup') {
            feedback.innerHTML = `<p><strong>⌛ Waktu Habis!</strong> Jawaban yang benar adalah: <strong>${answerText}</strong></p>`;
            feedback.classList.add('time-up');
        }
    };

    let timeLeft = 120;
    gameTimerInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `⏳ ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        if (timeLeft <= 0) {
            endGame('timeup');
        }
    }, 1000);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const userAnswer = input.value.trim();
        if (!userAnswer) {
            input.classList.add('input-error-shake');
            setTimeout(() => input.classList.remove('input-error-shake'), 500);
            return;
        }

        const isCorrect = Array.isArray(correctAnswer) 
            ? correctAnswer.some(ans => ans.toLowerCase() === userAnswer.toLowerCase())
            : userAnswer.toLowerCase() === correctAnswer.toLowerCase();

        if (isCorrect) {
            endGame('win');
        } else {
            feedback.innerHTML = `<p>🤔 Jawaban salah, coba lagi!</p>`;
            feedback.className = 'feedback try-again-shake';
            input.classList.add('input-error-shake');
            setTimeout(() => {
                input.classList.remove('input-error-shake');
                feedback.innerHTML = '';
                feedback.className = 'feedback';
            }, 1500);
            input.value = '';
            input.focus();
        }
    });

    giveUpBtn.onclick = () => endGame('giveup');
    card.querySelector('#next-question').onclick = () => startNewGame(gameId, level);
    card.querySelector('#back-to-menu').onclick = () => {
        clearInterval(gameTimerInterval);
        showGameSelectionScreen();
    };
    scrollToBottom();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function initializeRandomMode() {
    randomDisplayedIds.clear();
    randomContentPools.quote = [];
    
    chatContainer.innerHTML = '';
    const feedContainer = document.createElement('div');
    feedContainer.id = 'random-feed-container';
    chatContainer.appendChild(feedContainer);
    
    chatContainer.onscroll = null; 
    chatContainer.onscroll = () => {
        if (!isLoadingRandom && chatContainer.scrollTop + chatContainer.clientHeight >= chatContainer.scrollHeight - 500) {
            loadMoreRandomContent();
        }
    };

    loadMoreRandomContent(3);
}


async function loadMoreRandomContent(count = 2) {
    if (isLoadingRandom) return;
    isLoadingRandom = true;

    const feedContainer = document.getElementById('random-feed-container');
    const loaderId = `loader-${Date.now()}`;
    const loader = document.createElement('div');
    loader.id = loaderId;
    loader.className = 'random-loader-spinner';
    loader.innerHTML = '<div class="game-loader"></div>';
    feedContainer.appendChild(loader);

    const promises = [];
    for (let i = 0; i < count; i++) {
        promises.push(fetchAndProcessRandomItem());
    }

    await Promise.all(promises);

    const existingLoader = document.getElementById(loaderId);
    if(existingLoader) existingLoader.remove();
    
    isLoadingRandom = false;
}

async function fetchAndProcessRandomItem() {
    const feedContainer = document.getElementById('random-feed-container');
    let retries = 0;
    const maxRetries = 15;

    while (retries < maxRetries) {
        const endpoint = randomApiEndpoints[Math.floor(Math.random() * randomApiEndpoints.length)];
        
        try {
            let itemData;
            let itemId;
            let card;

            if (endpoint.type === 'quote') {
                if (randomContentPools.quote.length === 0) {
                    const response = await fetchApi(endpoint.url);
                    randomContentPools.quote = shuffleArray((response.data || []).filter(q => q.quotes));
                }
                itemData = randomContentPools.quote.pop();
                if (!itemData) continue;
                
                itemId = itemData.link;
                if (randomDisplayedIds.has(itemId)) continue;

                card = createQuotePostCard(itemData);

            } else if (endpoint.type === 'image') {
                const response = await fetch(endpoint.url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const contentType = response.headers.get('content-type');

                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    itemData = data.url || data.result || (data.data && data.data.url);
                } else if (contentType && contentType.startsWith('image/')) {
                    itemData = response.url;
                } else {
                    throw new Error(`Unexpected content-type: ${contentType}`);
                }
                
                if (!itemData || typeof itemData !== 'string') {
                    console.warn('API gambar tidak mengembalikan URL valid:', endpoint.url, itemData);
                    retries++;
                    continue;
                }
                
                itemId = itemData;
                if (randomDisplayedIds.has(itemId)) continue;

                const category = endpoint.url.includes('cecan') ? `cecan/${endpoint.url.split('/').pop()}` : endpoint.url.split('/').pop();
                card = createImagePostCard(itemData, category);
            }

            if (card) {
                randomDisplayedIds.add(itemId);
                feedContainer.appendChild(card);
                return;
            }

        } catch (error) {
            console.warn(`Gagal memuat dari endpoint '${endpoint.url}'. Mencoba lagi...`, error.message);
        }
        retries++;
    }
    console.error("Gagal memuat item acak baru setelah beberapa kali percobaan.");
}

function createImagePostCard(imageUrl, category) {
    const card = document.createElement('div');
    card.className = 'random-post-card image-post';

    card.innerHTML = `
        <div class="post-header">
            <img src="https://files.catbox.moe/o03dje.jpg" alt="avatar" class="post-avatar">
            <span class="post-username">Random Image</span>
        </div>
        <div class="post-media-container">
            <img src="${imageUrl}" alt="Random content from ${category}" class="post-image" loading="lazy">
        </div>
        <div class="post-caption">
             <p>Gambar acak dari kategori: <strong>${category}</strong></p>
        </div>
        <div class="post-actions">
            <div class="action-btn like-btn">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <span>Suka</span>
            </div>
            <div class="action-btn download-btn-random">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>Unduh</span>
            </div>
        </div>`;

    const likeBtn = card.querySelector('.like-btn');
    likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        likeBtn.classList.toggle('liked');
    });

    const downloadBtn = card.querySelector('.download-btn-random');
    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const filename = category.replace(/\//g, '_');
        downloadImage(imageUrl, filename);
    });

    return card;
}

function createQuotePostCard(quoteData) {
    const card = document.createElement('div');
    card.className = 'random-post-card quote-post';

    card.innerHTML = `
        <div class="post-header">
             <img src="${quoteData.gambar}" alt="avatar" class="post-avatar">
            <span class="post-username">${quoteData.karakter}</span>
        </div>
        <div class="quote-content-container">
            <p class="quote-text">"${quoteData.quotes}"</p>
            <p class="quote-source">- ${quoteData.karakter}, <em>${quoteData.anime}</em></p>
        </div>
        <div class="post-actions">
             <div class="action-btn like-btn">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <span>Suka</span>
            </div>
            <div class="action-btn copy-btn-random">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Salin</span>
            </div>
        </div>`;
    
    const likeBtn = card.querySelector('.like-btn');
    likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        likeBtn.classList.toggle('liked');
    });

    const copyBtn = card.querySelector('.copy-btn-random');
    copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const textToCopy = `"${quoteData.quotes}"\n- ${quoteData.karakter} (${quoteData.anime})`;
        navigator.clipboard.writeText(textToCopy);
        showCustomAlert('Quote disalin!', 'success');
    });

    return card;
}