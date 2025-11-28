// ==UserScript==
// @name         S键映射 (修复显示+防连跳)
// @namespace    http://tampermonkey.net/
// @version      28.0
// @description  修复UI不显示的问题；增加触发后2秒冷却锁定，彻底根治自动连跳
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. UI 引擎 (带等待机制) ---
    let logBox = null;
    const uiQueue = []; // 如果UI还没好，把日志先存着

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
            
            // 把积压的日志吐出来
            uiQueue.forEach(msg => printLog(msg.text, msg.color));
            uiQueue.length = 0;
            
            log("✅ UI 初始化成功", "#0f0");
        } else {
            // body 还没好，下一帧再试
            requestAnimationFrame(initUI);
        }
    }
    
    // 立即启动 UI 初始化循环
    initUI();

    function log(text, color = '#ccc') {
        if (logBox) {
            printLog(text, color);
        } else {
            uiQueue.push({text, color});
        }
    }

    function printLog(msg, color) {
        if (!logBox) return;
        const now = new Date();
        const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${String(now.getMilliseconds()).padStart(3, '0')}`;
        const div = document.createElement('div');
        div.innerHTML = `<span style="color:#666">[${time}]</span> <span style="color:${color}">${msg}</span>`;
        logBox.insertBefore(div, logBox.firstChild);
        if (logBox.children.length > 50) logBox.lastChild.remove();
    }

    // --- 2. 触发 S 键 ---
    function triggerS() {
        log("🚀 >>> 触发 S 键 <<<", "#ff3333");
        
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

    // --- 3. 核心逻辑 ---
    let clickCount = 0;
    let resetTimer = null;
    let lastTriggerTime = 0;
    
    // 判定窗口：0.3秒
    const CLICK_WINDOW = 300; 
    
    // ！！！防连跳核心！！！
    // 触发后 2000ms (2秒) 内，脚本变成瞎子，什么都不看
    // 防止切到下一个视频时自动播放引发误判
    const COOL_DOWN = 2000; 

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;
        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();
        
        // --- 冷却检查 ---
        if (now - lastTriggerTime < COOL_DOWN) {
            // 这里不显示日志了，避免切视频时刷屏，反正就是在冷却中
            return; 
        }

        // --- 正常逻辑 ---
        clickCount++;
        
        // 只要有新操作，清除重置计时器
        if (resetTimer) {
            clearTimeout(resetTimer);
            resetTimer = null;
        }

        if (clickCount >= 2) {
            // --- 触发 ---
            triggerS();
            
            log(`✅ 双击生效! 锁定脚本 ${COOL_DOWN/1000}秒`, "#fa0");
            clickCount = 0;
            lastTriggerTime = now; // 记录触发时间，开启冷却
        } else {
            // --- 第一次点击 ---
            log(`⏳ 操作 (1/2) - 等待连击...`, "#fff");
            
            resetTimer = setTimeout(() => {
                clickCount = 0;
                log(`❌ 超时归零`, "#666");
            }, CLICK_WINDOW);
        }
    }

    // --- 全局捕获 ---
    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
