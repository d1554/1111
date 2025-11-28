// ==UserScript==
// @name         S键映射 (v30 宽容时间版)
// @namespace    http://tampermonkey.net/
// @version      30.0
// @description  将判定时间延长至500ms以适应触摸延迟；保留日志、大字计数器、防连跳
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. UI 系统 ---
    let logBox = null;
    let counterBox = null;
    const uiQueue = [];

    function initUI() {
        if (document.body) {
            logBox = document.createElement('div');
            logBox.style.cssText = `
                position: fixed; top: 10px; right: 10px; width: 300px; height: 400px;
                background: rgba(0, 0, 0, 0.9); color: #0f0; font-family: monospace;
                font-size: 12px; padding: 10px; z-index: 2147483647; overflow-y: auto;
                border: 1px solid #444; pointer-events: none; white-space: pre-wrap;
            `;
            document.body.appendChild(logBox);

            counterBox = document.createElement('div');
            counterBox.style.cssText = `
                position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%);
                font-size: 120px; font-weight: 900; color: rgba(255, 255, 255, 0.9);
                text-shadow: 0 0 20px #000; z-index: 2147483647; pointer-events: none;
                display: none; font-family: sans-serif; transition: transform 0.1s;
            `;
            document.body.appendChild(counterBox);

            uiQueue.forEach(msg => printLog(msg.text, msg.color));
            uiQueue.length = 0;
            
            log("✅ 系统就绪 (判定宽松度: 500ms)", "#0f0");
        } else {
            requestAnimationFrame(initUI);
        }
    }
    initUI();

    function log(text, color = '#ccc') {
        if (logBox) printLog(text, color);
        else uiQueue.push({text, color});
    }

    function printLog(msg, color) {
        const now = new Date();
        const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${String(now.getMilliseconds()).padStart(3, '0')}`;
        const div = document.createElement('div');
        div.innerHTML = `<span style="color:#666">[${time}]</span> <span style="color:${color}">${msg}</span>`;
        if (logBox) {
            logBox.insertBefore(div, logBox.firstChild);
            if (logBox.children.length > 50) logBox.lastChild.remove();
        }
    }

    let counterHideTimer;
    function showCounter(num, color = '#fff') {
        if (!counterBox) return;
        counterBox.innerText = num;
        counterBox.style.color = color;
        counterBox.style.display = 'block';
        counterBox.style.transform = 'translate(-50%, -50%) scale(1.2)';
        setTimeout(() => counterBox.style.transform = 'translate(-50%, -50%) scale(1)', 50);

        clearTimeout(counterHideTimer);
        counterHideTimer = setTimeout(() => {
            counterBox.style.display = 'none';
        }, 500);
    }

    // --- 2. 键盘发射器 ---
    function triggerKey(keyName) {
        let keyChar, keyCode;
        if (keyName === 's') {
            keyChar = 's'; keyCode = 83;
            log("🚀 >>> 触发 S 键 <<<", "#ff3333");
            showCounter("S", "#ff3333");
        } else if (keyName === 'h') {
            keyChar = 'h'; keyCode = 72;
            log("🚀 >>> 触发 H 键 <<<", "#3388ff");
            showCounter("H", "#3388ff");
        }

        const eventConfig = {
            key: keyChar, code: 'Key' + keyChar.toUpperCase(),
            keyCode: keyCode, which: keyCode,
            bubbles: true, cancelable: true, view: window
        };
        
        const targets = [document.activeElement, document.body, document.documentElement];
        targets.forEach(t => {
            if(t) {
                try {
                    t.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
                    t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
                } catch(e) {}
            }
        });
    }

    // --- 3. 核心逻辑 ---
    let clickCount = 0;
    let actionTimer = null;
    let lastTriggerTime = 0;
    let lastClickTime = 0; // 记录上一次点击的具体时间，用来计算间隔

    // 关键参数调整！
    const WAIT_FOR_NEXT_CLICK = 500; // 等待时间放宽到 0.5 秒
    const COOL_DOWN = 2000;      

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;
        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();
        
        // 1. 冷却期检查
        if (now - lastTriggerTime < COOL_DOWN) return;

        // 计算手速间隔 (用于调试)
        if (lastClickTime > 0) {
            const diff = now - lastClickTime;
            // 只有间隔很短才显示，避免显示隔了几分钟的操作
            if (diff < 2000) {
                log(`⏱️ 间隔: ${diff}ms`, "#888");
            }
        }
        lastClickTime = now;

        // 2. 计数
        clickCount++;
        if (actionTimer) {
            clearTimeout(actionTimer);
            actionTimer = null;
        }

        // 3. UI
        if (clickCount === 1) showCounter("1", "#fff");
        if (clickCount === 2) showCounter("2", "#fffa00");
        if (clickCount === 3) showCounter("3!", "#00ffff");

        log(`🖱️ 点击: ${clickCount}`, "#fff");

        // 4. 判定
        if (clickCount >= 3) {
            // --- 三连击 H ---
            triggerKey('h');
            clickCount = 0;
            lastTriggerTime = now;
            lastClickTime = 0; 
            log(`❄️ 冷却启动`, "#888");

        } else {
            // --- 等待 ---
            actionTimer = setTimeout(() => {
                // 时间到了，还没按下一把
                if (clickCount === 2) {
                    // 确认是双击 S
                    triggerKey('s');
                    lastTriggerTime = Date.now();
                    log(`❄️ 冷却启动`, "#888");
                } else {
                    log(`❌ 超时归零 (Count: ${clickCount})`, "#666");
                }
                clickCount = 0; 
                lastClickTime = 0;
            }, WAIT_FOR_NEXT_CLICK);
        }
    }

    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
