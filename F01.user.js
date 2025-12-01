// ==UserScript==
// @name         S键映射 (V35 Debug 强力日志版)
// @namespace    http://tampermonkey.net/
// @version      35.0
// @description  屏幕右侧显示详细Log，用于调试3连击失效问题
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // --- DEBUG 窗口系统 (最优先加载) ---
    // ==========================================
    let debugPanel = null;

    function initDebugUI() {
        if (document.body) {
            debugPanel = document.createElement('div');
            debugPanel.id = 'gemini-debug-panel';
            debugPanel.style.cssText = `
                position: fixed; top: 0; right: 0; width: 350px; height: 100vh;
                background: rgba(0, 0, 0, 0.7); color: #0f0; font-family: monospace;
                font-size: 12px; z-index: 2147483647; overflow-y: auto;
                padding: 10px; pointer-events: none; /* 让点击穿透，不影响操作 */
                user-select: text; /* 允许复制文本 */
                pointer-events: auto; /* 改为auto允许鼠标滚动和复制 */
                border-left: 2px solid #fff;
            `;
            document.body.appendChild(debugPanel);
            log("=== Debug Window Ready ===");
            log("等待视频事件...");
        } else {
            requestAnimationFrame(initDebugUI);
        }
    }
    requestAnimationFrame(initDebugUI);

    function log(msg) {
        if (!debugPanel) return;
        const time = new Date().toISOString().split('T')[1].slice(0, -1); // HH:mm:ss.sss
        const line = document.createElement('div');
        line.style.borderBottom = "1px solid #333";
        line.innerText = `[${time}] ${msg}`;
        debugPanel.insertBefore(line, debugPanel.firstChild); // 最新消息在最上面
        // 限制日志行数，防止卡顿
        if (debugPanel.children.length > 50) {
            debugPanel.removeChild(debugPanel.lastChild);
        }
    }

    // ==========================================
    // --- 1. UI 系统 (大数字提示) ---
    // ==========================================
    let counterBox = null;
    function initUI() {
        if (document.body) {
            counterBox = document.createElement('div');
            counterBox.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                font-size: 60px; font-weight: 900; color: rgba(255, 255, 255, 0.8);
                text-shadow: 0 0 10px #000; z-index: 2147483646; pointer-events: none;
                display: none; font-family: sans-serif; transition: transform 0.1s;
            `;
            document.body.appendChild(counterBox);
        }
    }
    initUI();

    let counterHideTimer;
    function showCounter(num, color = '#fff') {
        if (!counterBox) return;
        counterBox.innerText = num;
        counterBox.style.color = color;
        counterBox.style.display = 'block';
        counterBox.style.transform = 'translate(-50%, -50%) scale(1.1)';
        setTimeout(() => counterBox.style.transform = 'translate(-50%, -50%) scale(1)', 50);
        clearTimeout(counterHideTimer);
        counterHideTimer = setTimeout(() => { counterBox.style.display = 'none'; }, 500);
    }

    // ==========================================
    // --- 2. 键盘发射器 ---
    // ==========================================
    function triggerKey(keyName) {
        log(`【发射指令】 >>> 模拟按键: ${keyName.toUpperCase()}`);
        let keyChar, keyCode;
        
        if (keyName === 's') {
            keyChar = 's'; keyCode = 83;
        } else if (keyName === 'h') {
            keyChar = 'h'; keyCode = 72;
            showCounter("H", "#3388ff");
        }

        const eventConfig = {
            key: keyChar, 
            code: 'Key' + keyChar.toUpperCase(),
            keyCode: keyCode, 
            which: keyCode,
            bubbles: true, cancelable: true, view: window
        };
        
        const t = document.activeElement || document.body;
        try {
            t.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
            t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
            log(`--> 发送成功，目标: ${t.tagName}`);
        } catch(e) {
            log(`--> 发送报错: ${e.message}`);
        }
    }

    // ==========================================
    // --- 3. 核心逻辑 (带 Log) ---
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

        // --- Log 原始事件 ---
        const eventInfo = `Event: ${e.type} | Seeking: ${target.seeking}`;
        
        // 1. 播放结束检测
        if (target.ended) {
            log(`${eventInfo} -> 忽略 (Ended)`);
            return;
        }

        // 2. 寻找进度检测
        if (target.seeking) {
            log(`${eventInfo} -> 忽略 (Seeking)`);
            return;
        }
        
        // 过滤非 play/pause
        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();
        const diff = now - lastEventTime;

        // 0. 防抖
        if (diff < EVENT_DEBOUNCE) {
            log(`${eventInfo} -> 忽略 (防抖 ${diff}ms < ${EVENT_DEBOUNCE})`);
            return;
        }
        lastEventTime = now;
        
        // 1. 冷却期
        const coolDiff = now - lastTriggerTime;
        if (coolDiff < COOL_DOWN) {
            clickCount = 0; 
            log(`${
