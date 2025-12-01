// ==UserScript==
// @name         S键映射 (V36 诊断调试版)
// @namespace    http://tampermonkey.net/
// @version      36.0
// @description  3连击H；屏幕右下角显示实时按键日志，用于排查模拟按键是否成功发出
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // --- 0. 调试控制台 (新增) ---
    // ==========================================
    let debugBox = null;

    function initDebugUI() {
        if (document.body) {
            debugBox = document.createElement('div');
            debugBox.style.cssText = `
                position: fixed; bottom: 10px; right: 10px; width: 300px; height: 200px;
                background: rgba(0, 0, 0, 0.85); color: #0f0; font-family: monospace;
                font-size: 12px; z-index: 999999; padding: 10px; overflow-y: auto;
                pointer-events: none; border-radius: 5px; border: 1px solid #333;
            `;
            debugBox.innerHTML = '<div style="border-bottom:1px solid #444; margin-bottom:5px">== 按键监控启动 ==</div>';
            document.body.appendChild(debugBox);

            // 监听全局按键，把它们打印出来
            window.addEventListener('keydown', (e) => {
                logKey(`[捕获] Key: ${e.key} | Code: ${e.code} | Trusted: ${e.isTrusted}`);
            }, true);

        } else {
            requestAnimationFrame(initDebugUI);
        }
    }
    initDebugUI();

    function logKey(msg) {
        if (!debugBox) return;
        const line = document.createElement('div');
        line.innerText = `> ${new Date().toLocaleTimeString().split(' ')[0]} ${msg}`;
        debugBox.insertBefore(line, debugBox.children[1]); // 插入到顶部
        // 保持只有20行
        if (debugBox.children.length > 20) debugBox.lastChild.remove();
    }

    // ==========================================
    // --- 1. UI 系统 (计数显示) ---
    // ==========================================
    let counterBox = null;
    function initUI() {
        if (document.body) {
            counterBox = document.createElement('div');
            counterBox.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                font-size: 60px; font-weight: 900; color: rgba(255, 255, 255, 0.8);
                text-shadow: 0 0 10px #000; z-index: 2147483647; pointer-events: none;
                display: none; font-family: sans-serif;
            `;
            document.body.appendChild(counterBox);
        } else {
            requestAnimationFrame(initUI);
        }
    }
    initUI();

    let counterHideTimer;
    function showCounter(num, color = '#fff') {
        if (!counterBox) return;
        counterBox.innerText = num;
        counterBox.style.color = color;
        counterBox.style.display = 'block';
        clearTimeout(counterHideTimer);
        counterHideTimer = setTimeout(() => {
            counterBox.style.display = 'none';
        }, 500);
    }

    // ==========================================
    // --- 2. 键盘发射器 (带日志) ---
    // ==========================================
    function triggerKey(keyName, targetElement) {
        let keyChar, keyCode;
        
        if (keyName === 's') {
            keyChar = 's'; keyCode = 83;
        } else if (keyName === 'h') {
            keyChar = 'h'; keyCode = 72;
            showCounter("H", "#3388ff");
        }

        logKey(`[尝试发送] 准备模拟: ${keyChar.toUpperCase()}`);

        const eventConfig = {
            key: keyChar, 
            code: 'Key' + keyChar.toUpperCase(),
            keyCode: keyCode, 
            which: keyCode,
            bubbles: true, cancelable: true, view: window
        };
        
        // 确定目标
        const targets = [];
        if (targetElement) {
            // 尝试强制聚焦
            try { targetElement.focus(); } catch(e) {}
            targets.push(targetElement);
        }
        targets.push(document.body);
        targets.push(document.documentElement);

        const uniqueTargets = [...new Set(targets)];

        // 发送
        uniqueTargets.forEach(t => {
            try {
                t.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
                // 为了兼容性，多发几个事件
                t.dispatchEvent(new KeyboardEvent('keypress', eventConfig));
                t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
            } catch(e) {}
        });
    }

    // ==========================================
    // --- 3. 核心逻辑 (保持不变) ---
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
        if (target.ended || target.seeking) return;
        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();
        if (now - lastEventTime < EVENT_DEBOUNCE) return;
        lastEventTime = now;
        
        if (now - lastTriggerTime < COOL_DOWN) { clickCount = 0; return; }
        if (lastTarget && lastTarget !== target) { clickCount = 0; if (actionTimer) clearTimeout(actionTimer); }
        lastTarget = target; 
        if (actionTimer) { clearTimeout(actionTimer); actionTimer = null; }

        clickCount++;
        
        // UI 反馈
        if (clickCount === 1) showCounter("1", "rgba(255,255,255,0.6)");
        if (clickCount === 2) showCounter("2", "rgba(255,255,255,0.8)");
        if (clickCount === 3) show
