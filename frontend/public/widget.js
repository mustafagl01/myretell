(function () {
    // MyRetell Widget Script
    const script = document.currentScript;
    const agentId = script.getAttribute('data-agent-id');

    if (!agentId) {
        console.error('MyRetell: data-agent-id attribute is required');
        return;
    }

    // Styles for the widget
    const style = document.createElement('style');
    style.innerHTML = `
        #myretell-widget-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        #myretell-widget-button {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1, #7c3aed);
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        #myretell-widget-button:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 16px rgba(0,0,0,0.3);
        }
        #myretell-widget-panel {
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 320px;
            height: 400px;
            background: #111118;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            display: none;
            flex-direction: column;
            overflow: hidden;
            color: white;
        }
        .myretell-header {
            padding: 12px 16px;
            background: rgba(255,255,255,0.03);
            border-bottom: 1px solid rgba(255,255,255,0.06);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .myretell-title { font-weight: 600; font-size: 14px; }
        .myretell-close { cursor: pointer; opacity: 0.6; font-size: 18px; }
        .myretell-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            text-align: center;
        }
        .myretell-visualizer {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            border: 2px solid rgba(99,102,241,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 24px;
            position: relative;
        }
        .myretell-ring {
            position: absolute;
            inset: -5px;
            border: 2px solid rgba(99,102,241,0.4);
            border-radius: 50%;
            animation: myretell-pulse 2s infinite;
            display: none;
        }
        @keyframes myretell-pulse {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(1.4); opacity: 0; }
        }
        .myretell-status { font-size: 13px; color: #8b8b9e; margin-bottom: 20px; }
        .myretell-btn {
            padding: 10px 24px;
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        .myretell-btn.stop { background: #ef4444; }
    `;
    document.head.appendChild(style);

    // Create UI
    const container = document.createElement('div');
    container.id = 'myretell-widget-container';
    container.innerHTML = `
        <div id="myretell-widget-panel">
            <div class="myretell-header">
                <span class="myretell-title">Voice Assistant</span>
                <span class="myretell-close">&times;</span>
            </div>
            <div class="myretell-body">
                <div class="myretell-visualizer">
                    <div class="myretell-ring"></div>
                    <span style="font-size: 32px">🎙️</span>
                </div>
                <div class="myretell-status">Ready to talk</div>
                <button class="myretell-btn" id="myretell-start-btn">Start Conversation</button>
            </div>
        </div>
        <button id="myretell-widget-button">🎙️</button>
    `;
    document.body.appendChild(container);

    const panel = document.getElementById('myretell-widget-panel');
    const button = document.getElementById('myretell-widget-button');
    const closeBtn = panel.querySelector('.myretell-close');
    const startBtn = document.getElementById('myretell-start-btn');
    const statusText = panel.querySelector('.myretell-status');
    const ring = panel.querySelector('.myretell-ring');

    let isPanelOpen = false;
    let isActive = false;

    button.onclick = () => {
        isPanelOpen = !isPanelOpen;
        panel.style.display = isPanelOpen ? 'flex' : 'none';
    };

    closeBtn.onclick = () => {
        isPanelOpen = false;
        panel.style.display = 'none';
    };

    startBtn.onclick = () => {
        if (!isActive) {
            startBtn.textContent = 'End Call';
            startBtn.classList.add('stop');
            statusText.textContent = 'Connecting...';
            ring.style.display = 'block';
            isActive = true;
            // In a real implementation, we would initialize AudioManager here
            // For now, this is a UI shell for the widget
            setTimeout(() => {
                statusText.textContent = 'Assistant is listening...';
            }, 1000);
        } else {
            startBtn.textContent = 'Start Conversation';
            startBtn.classList.remove('stop');
            statusText.textContent = 'Call Ended';
            ring.style.display = 'none';
            isActive = false;
        }
    };
})();
