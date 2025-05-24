const tabbar = document.getElementById('tabbar');
const newTabBtn = document.getElementById('new-tab');
const webviewsContainer = document.getElementById('webviews');
const urlInput = document.getElementById('url');
const loadingBar = document.getElementById('loading');
const phishingCheckBtn = document.getElementById('phishing-check');

const backBtn = document.getElementById('back');
const forwardBtn = document.getElementById('forward');
const reloadBtn = document.getElementById('reload');
const goBtn = document.getElementById('go');

let tabs = [];
let activeTabId = null;
let tabIdCounter = 0;
let openaiApiKey = null;

function createTab(url = 'about:blank') {
    const id = ++tabIdCounter;
    // Tab element
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.id = id;
    tab.innerHTML = `<img class="favicon" src="https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}" alt="" /><span class="title">New Tab</span><button class="close" title="Close tab">x</button>`;
    tabbar.insertBefore(tab, newTabBtn);

    // Webview element
    const webview = document.createElement('webview');
    webview.className = 'webview';
    webview.dataset.id = id;
    webview.setAttribute('src', url);
    webview.setAttribute('preload', 'preload.js');
    webview.setAttribute('webpreferences', 'contextIsolation');
    webviewsContainer.appendChild(webview);

    // Tab object
    const tabObj = { id, tab, webview };
    tabs.push(tabObj);

    // Tab events
    tab.addEventListener('click', (e) => {
        if (e.target.classList.contains('close')) {
            closeTab(id);
        } else {
            setActiveTab(id);
        }
    });

    // Webview events
    webview.addEventListener('page-title-updated', (e) => {
        tab.querySelector('.title').textContent = e.title || 'New Tab';
    });
    webview.addEventListener('page-favicon-updated', (e) => {
        if (e.favicons && e.favicons.length > 0) {
            tab.querySelector('.favicon').src = e.favicons[0];
        }
    });
    webview.addEventListener('did-navigate', (e) => {
        if (id === activeTabId) urlInput.value = e.url;
        // Update favicon on navigation
        tab.querySelector('.favicon').src = `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(e.url)}`;
    });
    webview.addEventListener('did-start-loading', () => {
        if (id === activeTabId) loadingBar.style.width = '30%';
    });
    webview.addEventListener('did-progress-loading', (event) => {
        if (id === activeTabId) loadingBar.style.width = `${30 + (event.progress * 70)}%`;
    });
    webview.addEventListener('did-finish-load', () => {
        if (id === activeTabId) {
            loadingBar.style.width = '100%';
            setTimeout(() => { loadingBar.style.width = '0'; }, 200);
        }
    });
    webview.addEventListener('did-fail-load', () => {
        if (id === activeTabId) loadingBar.style.width = '0';
    });

    setActiveTab(id);
}

function setActiveTab(id) {
    activeTabId = id;
    tabs.forEach(({ id: tid, tab, webview }) => {
        if (tid === id) {
            tab.classList.add('active');
            webview.classList.add('active');
            urlInput.value = webview.getURL ? webview.getURL() : webview.src;
            // Set document title to tab title
            document.title = tab.querySelector('.title').textContent + ' - Aksil Browser';
        } else {
            tab.classList.remove('active');
            webview.classList.remove('active');
            tab.style.background = '';
            tab.style.color = '';
        }
    });
}

function closeTab(id) {
    const idx = tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    const [{ tab, webview }] = tabs.splice(idx, 1);
    tab.remove();
    webview.remove();
    if (tabs.length === 0) {
        createTab();
    } else {
        setActiveTab(tabs[Math.max(0, idx - 1)].id);
    }
}

function getActiveWebview() {
    const tab = tabs.find(t => t.id === activeTabId);
    return tab ? tab.webview : null;
}

function goTo() {
    const webview = getActiveWebview();
    if (!webview) return;
    const url = urlInput.value.trim();
    if (!url) return;
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.includes('.') && !url.includes(' ')) {
            finalUrl = 'https://' + url;
        } else {
            finalUrl = 'https://www.google.com/search?q=' + encodeURIComponent(url);
        }
        urlInput.value = finalUrl;
    }
    webview.loadURL(finalUrl);
}

function reload() {
    const webview = getActiveWebview();
    if (webview) webview.reload();
}

function goBack() {
    const webview = getActiveWebview();
    if (webview && webview.canGoBack()) webview.goBack();
}

function goForward() {
    const webview = getActiveWebview();
    if (webview && webview.canGoForward()) webview.goForward();
}

goBtn.addEventListener('click', goTo);
reloadBtn.addEventListener('click', reload);
backBtn.addEventListener('click', goBack);
forwardBtn.addEventListener('click', goForward);
newTabBtn.addEventListener('click', () => createTab());

urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') goTo();
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        urlInput.select();
    }
    if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        createTab();
    }
    if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        closeTab(activeTabId);
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        switchTab(-1);
    }
    if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        switchTab(1);
    }
});

function switchTab(direction) {
    const idx = tabs.findIndex(t => t.id === activeTabId);
    if (idx === -1) return;
    let newIdx = (idx + direction + tabs.length) % tabs.length;
    setActiveTab(tabs[newIdx].id);
}

function showPhishingModal(message) {
    let modal = document.getElementById('phishing-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'phishing-modal';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.background = '#9B2323';
        modal.style.color = '#fff';
        modal.style.padding = '24px';
        modal.style.border = '2px solid #9B2323';
        modal.style.borderRadius = '8px';
        modal.style.zIndex = 9999;
        modal.style.boxShadow = '0 2px 16px rgba(155,35,35,0.2)';
        modal.style.maxWidth = '90vw';
        modal.style.maxHeight = '80vh';
        modal.style.overflowY = 'auto';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `<div style='white-space:pre-wrap;'>${message}</div><br><button id='close-phishing-modal' style='background:#fff;color:#9B2323;border:1px solid #9B2323;padding:6px 16px;border-radius:4px;'>Close</button>`;
    document.getElementById('close-phishing-modal').onclick = () => modal.remove();
}

async function extractPageContent() {
    const webview = getActiveWebview();
    if (!webview) return null;
    // Use executeJavaScript to get title, url, and text
    const result = await webview.executeJavaScript(`({
        title: document.title,
        url: window.location.href,
        text: document.body.innerText
    })`);
    return result;
}

async function captureWebviewScreenshot() {
    const webview = getActiveWebview();
    if (!webview) return null;
    // Capture screenshot as NativeImage
    const image = await webview.capturePage();
    // Convert to base64 PNG
    return image.toDataURL();
}

function showApiKeyModal(onSave) {
    let modal = document.getElementById('api-key-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'api-key-modal';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.background = '#9B2323';
        modal.style.color = '#fff';
        modal.style.padding = '24px';
        modal.style.border = '2px solid #9B2323';
        modal.style.borderRadius = '8px';
        modal.style.zIndex = 10000;
        modal.style.boxShadow = '0 2px 16px rgba(155,35,35,0.2)';
        modal.innerHTML = `
            <div style='font-size:16px;margin-bottom:10px;'>Enter your OpenAI API key:</div>
            <input id='api-key-input' type='password' style='width:100%;font-size:15px;padding:6px;margin-bottom:12px;border-radius:4px;border:1px solid #ccc;' />
            <br>
            <button id='save-api-key' style='margin-right:8px;background:#fff;color:#9B2323;border:1px solid #9B2323;padding:6px 16px;border-radius:4px;'>Save</button>
            <button id='cancel-api-key' style='background:#fff;color:#9B2323;border:1px solid #9B2323;padding:6px 16px;border-radius:4px;'>Cancel</button>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('save-api-key').onclick = () => {
        const key = document.getElementById('api-key-input').value.trim();
        if (key) {
            modal.remove();
            onSave(key);
        }
    };
    document.getElementById('cancel-api-key').onclick = () => {
        modal.remove();
        phishingCheckBtn.textContent = '🛡️';
        phishingCheckBtn.disabled = false;
    };
}

async function checkPhishing() {
    phishingCheckBtn.textContent = '⏳';
    phishingCheckBtn.disabled = true;
    try {
        if (!openaiApiKey) {
            showApiKeyModal((key) => {
                openaiApiKey = key;
                checkPhishing();
            });
            return;
        }
        const webview = getActiveWebview();
        if (!webview) throw new Error('No active webview');
        // Get URL from webview
        const url = await webview.executeJavaScript('window.location.href');
        // Capture screenshot
        const screenshotDataUrl = await captureWebviewScreenshot();
        if (!screenshotDataUrl) throw new Error('Could not capture screenshot');
        // Remove data:image/png;base64, prefix
        const base64Image = screenshotDataUrl.replace(/^data:image\/png;base64,/, '');
        // Prepare OpenAI Vision prompt
        const requestBody = {
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are a security expert specializing in detecting phishing and impersonation websites. Provide clear, concise answers in the exact format requested."
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this webpage screenshot and the following URL for potential impersonation or phishing attempts.\n\nURL: ${url}\n\nPay special attention to:\n- Domain manipulation (typosquatting, homograph attacks, suspicious subdomains, misuse of legitimate domains, URL encoding tricks, HTTP vs HTTPS)\n- Visual indicators (branding, layout, security badges, input requests, urgency, grammar, etc.)\n\nRespond with a valid JSON object containing:\n{\n  \"isPhishing\": \"Yes\" or \"No\",\n  \"confidence\": number (0-100),\n  \"impersonation\": {\n    \"isImpersonating\": true/false,\n    \"originalEntity\": \"name of the entity being impersonated or null\"\n  },\n  \"explanation\": \"brief explanation\",\n  \"urlFindings\": [\"list of key suspicious or safe URL factors\"]\n}`
                        },
                        {
                            type: "image_url",
                            image_url: { url: `data:image/png;base64,${base64Image}` }
                        }
                    ]
                }
            ],
            max_tokens: 1200,
            response_format: { type: "json_object" }
        };
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || response.statusText);
        }
        const data = await response.json();
        let analysis = data.choices?.[0]?.message?.content;
        let parsed = null;
        try { parsed = JSON.parse(analysis); } catch (e) {}
        let msg = parsed ?
            `Phishing: ${parsed.isPhishing}\nConfidence: ${parsed.confidence}%\n${parsed.impersonation.isImpersonating ? `Impersonating: ${parsed.impersonation.originalEntity}\n` : ''}Explanation: ${parsed.explanation}\n\nKey Findings:\n${(parsed.urlFindings||[]).map(f=>'- '+f).join('\n')}` :
            analysis;
        showPhishingModal(msg);
    } catch (err) {
        showPhishingModal('Error: ' + err.message);
    } finally {
        phishingCheckBtn.textContent = '🛡️';
        phishingCheckBtn.disabled = false;
    }
}

phishingCheckBtn.addEventListener('click', checkPhishing);

// Initial tab
createTab(); 