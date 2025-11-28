// ==UserScript==
// @name         S键映射 (三连击H键 + 计数器版)
// @namespace    http://tampermonkey.net/
// @version      29.0
// @description  2连击触发S，3连击触发H；屏幕中央显示大字计数器；保留防连跳与日志功能
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. UI 系统 (日志 + 大计数器) ---
    let logBox = null;
    let counterBox = null;
    const uiQueue = [];

    function initUI() {
        if (document.body) {
            // A. 日志窗口 (右侧)
            logBox = document.createElement('div');
            logBox.style.cssText = `
                position: fixed; top: 10px; right: 10px; width: 300px; height: 400px;
                background: rgba(0, 0, 0, 0.9); color: #0f0; font-family: monospace;
                font-size: 12px; padding: 10px; z-index: 2147483647; overflow-y: auto;
                border: 1px solid #444; pointer-events: none; white-space: pre-wrap;
            `;
            document.body.appendChild(logBox);

            // B. 计数器窗口 (屏幕正中)
            counterBox = document.createElement('div');
            counterBox.style.cssText = `
                position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%);
                font-size: 120px; font-weight: 900; color: rgba(255, 255, 255, 0.9);
                text-shadow: 0 0 20px #000; z-index: 2147483647; pointer-events: none;
                display: none; font-family: sans-serif; transition: transform 0.1s;
            `;
            document.body.appendChild(counterBox);

            // 吐出积压日志
            uiQueue.forEach(msg => printLog(msg.text, msg.color));
            uiQueue.length = 0;
            
            log("✅ UI 系统就绪", "#0f0");
        } else {
            requestAnimationFrame(initUI);
        }
    }
    initUI();

    // 日志辅助
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

    // 计数器辅助
    let counterHideTimer;
    function showCounter(num, color = '#fff') {
        if (!counterBox) return;
        counterBox.innerText = num;
        counterBox.style.color = color;
        counterBox.style.display = 'block';
        counterBox.style.transform = 'translate(-50%, -50%) scale(1.2)'; // 稍微放大一下产生打击感
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
            log("🚀 >>> 触发 S 键 (2连) <<<", "#ff3333");
            showCounter("S", "#ff3333");
        } else if (keyName === 'h') {
            keyChar = 'h'; keyCode = 72;
            log("🚀 >>> 触发 H 键 (3连) <<<", "#3388ff");
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

    // 参数调整
    const WAIT_FOR_TRIPLE = 280; // 等待第三下的时间 (毫秒)，太短不容易触发3击，太长S键会迟钝
    const COOL_DOWN = 2000;      // 触发后的冷却时间 (防连跳)

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;
        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();
        
        // 1. 冷却期检查
        if (now - lastTriggerTime < COOL_DOWN) return;

        // 2. 计数逻辑
        clickCount++;
        
        // 每次点击都清除之前的定时器（防抖）
        if (actionTimer) {
            clearTimeout(actionTimer);
            actionTimer = null;
        }

        // 3. UI 反馈
        if (clickCount === 1) showCounter("1", "#fff");
        if (clickCount === 2) showCounter("2", "#fffa00");
        if (clickCount === 3) showCounter("3!", "#00ffff");

        log(`🖱️ 点击: ${clickCount}`, "#fff");

        // 4. 判定分支
        if (clickCount >= 3) {
            // --- 达成三连击 (H) ---
            triggerKey('h');
            
            // 触发后重置
            clickCount = 0;
            lastTriggerTime = now; 
            log(`❄️ 冷却 ${COOL_DOWN}ms`, "#888");

        } else {
            // --- 尚未达成3击 (可能是1或2) ---
            // 开启定时器，看看用户还会不会按下一缩
            actionTimer = setTimeout(() => {
                // 定时器到了，说明用户停止按键了
                if (clickCount === 2) {
                    // --- 确认为双击 (S) ---
                    triggerKey('s');
                    
                    lastTriggerTime = Date.now(); // 只有触发了动作才冷却
                    log(`❄️ 冷却 ${COOL_DOWN}ms`, "#888");
                } else {
                    // 只是按了一下(1)，或者按乱了，重置
                    log(`❌ 超时归零 (Count: ${clickCount})`, "#666");
                }
                clickCount = 0; 
            }, WAIT_FOR_TRIPLE);
        }
    }

    // --- 全局捕获 ---
    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
