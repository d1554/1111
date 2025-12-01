// ==UserScript==
// @name         S键映射 (V53 安全挂载诊断版)
// @namespace    http://tampermonkey.net/
// @version      53.0
// @description  修复调试窗口不显示的问题；强制等待页面加载完成后再挂载UI；顶部显示日志
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 全局变量 ---
    let debugBox = null;
    let counterBox = null;
    let hasLoaded = false;

    // ==========================================
    // 1. 安全挂载系统 (Safe Mount System)
    // ==========================================
    function tryMountUI() {
        if (hasLoaded) return; // 防止重复挂载
        if (!document.body) return; // 身体没长好，下次再来

        hasLoaded = true;

        // --- A. 创建调试窗口 (顶部) ---
        debugBox = document.createElement('div');
        debugBox.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 30vh;
            background: rgba(0,0,0,0.95); color: #0f0; font-size: 12px; line-height: 1.2;
            overflow-y: auto; z-index: 2147483647; padding: 5px;
            border-bottom: 2px solid #fff; font-family: monospace; pointer-events: none;
            word-break: break-all;
        `;
        document.body.appendChild(debugBox);
        log(">>> V53 诊断系统挂载成功", "#fff");
        log(">>> 窗口位于顶部，请三连击测试", "#fff");

        // --- B. 创建大计数器 (中央) ---
        counterBox = document.createElement('div');
        counterBox.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            font-size: 80px; font-weight: 900; color: rgba(255, 255, 255, 0.9);
            text-shadow: 0 0 10px #000; z-index: 2147483646; pointer-events: none;
            display: none; transition: opacity 0.1s;
        `;
        document.body.appendChild(counterBox);
    }

    // 启动定时器，每100ms检查一次，直到挂载成功
    const mountTimer = setInterval(() => {
        if (document.body) {
            tryMountUI();
            clearInterval(mountTimer);
        }
    }, 100);

    // ==========================================
    // 2. 日志与UI工具
    // ==========================================
    function log(msg, color = '#0f0') {
        if (!debugBox) return; // 如果UI还没挂载，日志先丢弃(或存队列，这里简化处理)
        const line = document.createElement('div');
        const time = new Date().toLocaleTimeString().split(' ')[0] + '.' + new Date().getMilliseconds();
        line.innerHTML = `<span style="color:#666">[${time}]</span> <span style="color:${color}">${msg}</span>`;
        // 插入到最前面，方便手机看最新消息
        debugBox.insertBefore(line, debugBox.firstChild);
    }

    let counterHideTimer;
    function showCounter(num, color = '#fff') {
        if (!counterBox) return;
        counterBox.innerText = num;
        counterBox.style.color = color;
        counterBox.style.display = 'block';
        clearTimeout(counterHideTimer);
        counterHideTimer = setTimeout(() => { counterBox.style.display = 'none'; }, 500);
    }

    // ==========================================
    // 3. 键盘事件监听 (验证系统是否收到)
    // ==========================================
    window.addEventListener('keydown', (e) => {
        const src = e.isTrusted ? "物理" : "脚本";
        log(`👂 系统收到[${src}] Key:${e.key} Code:${e.keyCode}`, "#ff00ff");
    }, true);

    // ==========================================
    // 4. CSS 防手势
    // ==========================================
    function injectCSS() {
        const css = `video, audio, button, .video-wrapper { touch-action: manipulation !important; }`;
        const style = document.createElement('style');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }
    injectCSS();

    // ==========================================
    // 5. 按键发射器 (V51 混合版)
    // ==========================================
    function triggerKey(keyName, originalTarget) {
        log(`🚀 发射按键: ${keyName.toUpperCase()}`, "orange");
        
        const targets = [originalTarget || document.body, document];
        
        if (keyName === 's') { // S键：原始逻辑
            const keyCode = 83;
            targets.forEach(t => {
                if(!t) return;
                try {
                    let e = new KeyboardEvent('keydown', {
                        key: 's', code: 'KeyS', keyCode: keyCode, which: keyCode,
                        bubbles: true, cancelable: true, view: window
                    });
                    t.dispatchEvent(e);
                    t.dispatchEvent(new KeyboardEvent('keyup', {
                        key: 's', code: 'KeyS', keyCode: keyCode, which: keyCode,
                        bubbles: true, cancelable: true, view: window
                    }));
                } catch(err) { log("Send Error: " + err.message, "red"); }
            });
        }

        if (keyName === 'h') { // H键：Firefox 补丁
            const keyCode = 72;
            const charCode = 104;
            targets.forEach(t => {
                if(!t) return;
                try {
                    // KeyDown
                    let eDown = new KeyboardEvent('keydown', {
                        key: 'h', code: 'KeyH', keyCode: keyCode, which: keyCode,
                        bubbles: true, cancelable: true, view: window
                    });
                    Object.defineProperty(eDown, 'keyCode', { get: () => keyCode });
                    Object.defineProperty(eDown, 'which', { get: () => keyCode });
                    Object.defineProperty(eDown, 'charCode', { get: () => 0 });
                    t.dispatchEvent(eDown);

                    // KeyPress
                    let ePress = new KeyboardEvent('keypress', {
                        key: 'h', code: 'KeyH', keyCode: 0, which: charCode,
                        bubbles: true, cancelable: true, view: window
                    });
                    Object.defineProperty(ePress, 'keyCode', { get: () => 0 });
                    Object.defineProperty(ePress, 'charCode', { get: () => charCode });
                    Object.defineProperty(ePress, 'which', { get: () => charCode });
                    t.dispatchEvent(ePress);
                } catch(err) { log("Send H Error: " + err.message, "red"); }
            });
        }
    }

    // ==========================================
    // 6. 核心逻辑
    // ==========================================
    let clickCount = 0;
    let actionTimer = null;
    let lastEventTime = 0;   
    let lastTriggerTime = 0; 
    let lastTarget = null; 

    const WAIT_FOR_NEXT_CLICK = 1000; 
    const COOL_DOWN = 2000;           
    const EVENT_DEBOUNCE = 50;        

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;

        if (target.ended) return; 
        if (target.seeking) return;
        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();
        if (now - lastEventTime < EVENT_DEBOUNCE) return;
        lastEventTime = now;
        
        if (now - lastTriggerTime < COOL_DOWN) {
            log("冷却中...", "gray");
            clickCount = 0; 
            return;
        }

        if (lastTarget && lastTarget !== target) {
            clickCount = 0;
            if (actionTimer) clearTimeout(actionTimer);
        }
        lastTarget = target; 
        if (actionTimer) clearTimeout(actionTimer);

        clickCount++;
        showCounter(clickCount); // 显示大数字
        log(`⚡ 计数: ${clickCount}`, "#0ff");

        if (clickCount >= 3) {
            log("✅ 触发三连击 H", "#0f0");
            triggerKey('h', target);
            clickCount = 0;
            lastTriggerTime = now; 
        } else {
            actionTimer = setTimeout(() => {
                if (clickCount === 2) {
                    log("✅ 触发双击 S", "#0f0");
                    triggerKey('s', target);
                    lastTriggerTime = Date.now();
                }
                clickCount = 0; 
            }, WAIT_FOR_NEXT_CLICK);
        }
    }

    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
