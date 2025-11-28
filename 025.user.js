// ==UserScript==
// @name         S键映射 (v29.0 平板舒适版)
// @namespace    http://tampermonkey.net/
// @version      29.0
// @description  将双击判定时间放宽至600ms以适应触摸延迟，同时修复瞬间重复触发的问题
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. UI 初始化 ---
    let logBox = null;
    function initUI() {
        if (document.body && !logBox) {
            logBox = document.createElement('div');
            logBox.style.cssText = `
                position: fixed; top: 10px; right: 10px; width: 280px; height: 350px;
                background: rgba(0, 0, 0, 0.85); color: #0f0; font-family: monospace;
                font-size: 14px; padding: 10px; z-index: 2147483647; overflow-y: auto;
                border: 1px solid #555; pointer-events: none;
            `;
            document.body.appendChild(logBox);
            log("✅ 脚本就绪 (600ms)", "#0f0");
        } else if (!document.body) {
            requestAnimationFrame(initUI);
        }
    }
    initUI();

    function log(text, color = '#ccc') {
        if (!logBox) return;
        const div = document.createElement('div');
        const now = new Date();
        const time = `${now.getSeconds()}.${String(now.getMilliseconds()).padStart(3, '0')}`;
        div.innerHTML = `<span style="color:#666">${time}</span> <span style="color:${color}">${text}</span>`;
        logBox.insertBefore(div, logBox.firstChild);
        if (logBox.children.length > 30) logBox.lastChild.remove();
    }

    // --- 2. 触发逻辑 ---
    function triggerS() {
        log("🚀 触发 S 键 !!!", "#ff3333"); // 醒目红
        
        const eventConfig = {
            key: 's', code: 'KeyS', keyCode: 83, which: 83,
            bubbles: true, cancelable: true, view: window
        };
        // 广撒网触发
        [document.activeElement, document.body, document.documentElement].forEach(t => {
            if(t) try {
                t.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
                t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
            } catch(e) {}
        });
    }

    // --- 3. 核心判定 (宽容模式) ---
    let clickCount = 0;
    let resetTimer = null;
    let lastTriggerTime = 0;
    
    // 改动点：从 300 增加到 600，完美覆盖你的 366ms 间隔
    const CLICK_WINDOW = 600; 
    // 冷却 2秒
    const COOL_DOWN = 2000; 

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;
        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();

        // 1. 绝对冷却检查 (防止瞬间连发)
        // 只要在冷却期，任何信号直接丢弃，不打印日志，不处理
        if (now - lastTriggerTime < COOL_DOWN) {
            return; 
        }

        // 2. 计数
        clickCount++;

        // 清除重置计时器 (延续窗口)
        if (resetTimer) {
            clearTimeout(resetTimer);
            resetTimer = null;
        }

        if (clickCount >= 2) {
            // --- 触发 ---
            // 先记录时间，立刻锁死，防止后续信号再次进入
            lastTriggerTime = now;
            clickCount = 0;
            
            triggerS();
            log(`🔒 锁定 2秒`, "#fa0");
        } else {
            // --- 第一次点击 ---
            log(`⏳ (1/2) 等待...`, "#fff");
            
            // 600ms 后还没第二下，才重置
            resetTimer = setTimeout(() => {
                clickCount = 0;
                log(`❌ 超时`, "#666");
            }, CLICK_WINDOW);
        }
    }

    // --- 全局捕获 ---
    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
