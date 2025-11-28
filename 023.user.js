// ==UserScript==
// @name         S键映射 (侦探调试版)
// @namespace    http://tampermonkey.net/
// @version      27.0
// @description  包含详细的毫秒级日志记录，用于诊断"连跳"问题
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. 黑匣子日志窗口 ---
    const logBox = document.createElement('div');
    logBox.style.cssText = `
        position: fixed; top: 10px; right: 10px; width: 350px; height: 500px;
        background: rgba(0, 0, 0, 0.9); color: #0f0; font-family: 'Consolas', monospace;
        font-size: 12px; padding: 10px; z-index: 2147483647; overflow-y: auto;
        border: 1px solid #444; pointer-events: none; white-space: pre-wrap;
    `;
    document.body.appendChild(logBox);

    function log(msg, color = '#ccc') {
        const now = new Date();
        const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${String(now.getMilliseconds()).padStart(3, '0')}`;
        const div = document.createElement('div');
        div.innerHTML = `<span style="color:#666">[${time}]</span> <span style="color:${color}">${msg}</span>`;
        logBox.insertBefore(div, logBox.firstChild);
        if (logBox.children.length > 40) logBox.lastChild.remove();
    }

    log("🕵️ 侦探模式启动... 等待操作", "yellow");

    // --- 2. 触发 S 键 ---
    function triggerS() {
        log("🚀 >>> 发射 S 键信号 <<<", "#ff3333");
        
        const eventConfig = {
            key: 's', code: 'KeyS', keyCode: 83, which: 83,
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

    // --- 3. 核心逻辑 (带诊断) ---
    let clickCount = 0;
    let resetTimer = null;
    let lastTriggerTime = 0;
    
    // 判定窗口：0.3秒
    const CLICK_WINDOW = 300; 
    // 冷却时间：触发S后的不应期 (防止S键造成的新视频加载被误判为点击)
    const COOL_DOWN = 1000; 

    function globalHandler(e) {
        const target = e.target;
        // 只监控 video/audio
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;
        // 只监控 play/pause
        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();
        const timeSinceLastTrigger = now - lastTriggerTime;

        // --- 诊断日志 A：原始信号 ---
        log(`收到信号: ${e.type.toUpperCase()}`, "#fff");

        // 1. 冷却期检查
        // 如果距离上次触发 S 还没过 1秒，这可能是 S 键导致的视频切换/自动播放
        if (timeSinceLastTrigger < COOL_DOWN) {
            log(`  ↳ 🚫 忽略 (冷却中: 还剩${COOL_DOWN - timeSinceLastTrigger}ms)`, "#666");
            return;
        }

        // 2. 计数逻辑
        clickCount++;
        
        // 只要来了新信号，就清除“重置倒计时”
        if (resetTimer) {
            clearTimeout(resetTimer);
            resetTimer = null;
        }

        log(`  ↳ 计数: ${clickCount} / 2`, "#0ff");

        if (clickCount >= 2) {
            // --- 触发！---
            log(`  ✅ 达成双击 (${clickCount}次)`, "#0f0");
            triggerS();
            
            // 触发后立即重置
            clickCount = 0;
            lastTriggerTime = Date.now();
            log(`  ❄️ 进入冷却期 ${COOL_DOWN}ms`, "#888");
        } else {
            // --- 第一次点击 ---
            log(`  ⏳ 等待连击 (窗口: ${CLICK_WINDOW}ms)`, "#fa0");
            
            resetTimer = setTimeout(() => {
                clickCount = 0;
                log(`  ❌ 超时重置 (未检测到连击)`, "#666");
            }, CLICK_WINDOW);
        }
    }

    // --- 全局捕获 ---
    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
