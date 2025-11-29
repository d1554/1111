// ==UserScript==
// @name         多功能媒体控 (S键映射+自动解除静音)
// @namespace    http://tampermonkey.net/
// @version      35.0
// @description  合并功能：1. 过滤重复信号映射S/H键；2. 播放时自动解除静音并恢复音量
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 模块 1: UI 显示系统 (原脚本 B)
    // ==========================================
    let counterBox = null;

    function initUI() {
        if (document.body) {
            counterBox = document.createElement('div');
            counterBox.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                font-size: 60px; font-weight: 900; color: rgba(255, 255, 255, 0.8);
                text-shadow: 0 0 10px #000; z-index: 2147483647; pointer-events: none;
                display: none; font-family: sans-serif; transition: transform 0.1s;
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
        counterBox.style.transform = 'translate(-50%, -50%) scale(1.1)';
        setTimeout(() => counterBox.style.transform = 'translate(-50%, -50%) scale(1)', 50);

        clearTimeout(counterHideTimer);
        counterHideTimer = setTimeout(() => {
            counterBox.style.display = 'none';
        }, 800);
    }

    // ==========================================
    // 模块 2: 键盘模拟发射器 (原脚本 B)
    // ==========================================
    function triggerKey(keyName) {
        let keyChar, keyCode;
        if (keyName === 's') {
            keyChar = 's'; keyCode = 83;
            console.log("🚀 触发 S 键");
        } else if (keyName === 'h') {
            keyChar = 'h'; keyCode = 72;
            console.log("🚀 触发 H 键");
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

    // ==========================================
    // 模块 3: 音量控制逻辑 (原脚本 A - 移植)
    // ==========================================
    function unmuteVideo(videoElement) {
        let modified = false;
        // 1. 解除静音
        if (videoElement.muted) {
            videoElement.muted = false;
            modified = true;
            console.log("🔊 已强制解除静音");
        }
        // 2. 恢复音量 (如果为0，设为50%)
        if (videoElement.volume === 0) {
            videoElement.volume = 0.5;
            modified = true;
            console.log("🔊 音量过低，已恢复为 50%");
        }
        if (modified) {
            // 可选：显示一个小提示，或者复用上面的 showCounter
            // showCounter("🔊", "#00ff00"); 
        }
    }

    // ==========================================
    // 模块 4: 核心信号处理 (合并逻辑)
    // ==========================================
    let clickCount = 0;
    let resetTimer = null;
    let lastTriggerTime = 0;
    let lastSignalTime = 0; 
    
    // 参数配置
    const SIGNAL_DEBOUNCE = 150;     // 信号去重阈值
    const DOUBLE_CLICK_TOLERANCE = 500; 
    const TRIPLE_CLICK_TOLERANCE = 5000;
    const COOL_DOWN = 2000;

    function globalHandler(e) {
        const target = e.target;
        // 必须是媒体元素
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;
        // 必须是播放或暂停事件
        if (e.type !== 'play' && e.type !== 'pause') return;

        // 屏蔽 Seeking (进度条拖动造成的假信号)
        if (target.seeking) return;

        const now = Date.now();
        const signalDiff = now - lastSignalTime;

        // [核心防抖] 过滤过快的重复信号
        if (signalDiff < SIGNAL_DEBOUNCE) {
            console.log(`🛡️ 过滤重影信号 (间隔 ${signalDiff}ms)`);
            return;
        }
        
        lastSignalTime = now;

        // --- [插入逻辑] 自动解除静音 ---
        // 只有在 'play' 事件且通过了防抖检查后，才执行解除静音
        // 这样避免了两个脚本打架
        if (e.type === 'play') {
            unmuteVideo(target);
        }
        // -----------------------------

        // --- 计数与按键逻辑 ---

        // 0. 初始态
        if (clickCount === 0) {
            if (now - lastTriggerTime < COOL_DOWN) return;
            
            clickCount = 1;
            showCounter("1", "rgba(255,255,255,0.6)");
            
            if (resetTimer) clearTimeout(resetTimer);
            resetTimer = setTimeout(() => { clickCount = 0; }, DOUBLE_CLICK_TOLERANCE);
            return;
        }

        // 1. 等待第2击
        if (clickCount === 1) {
            // 超时判断
            if (signalDiff > DOUBLE_CLICK_TOLERANCE) {
                clickCount = 1;
                showCounter("1", "rgba(255,255,255,0.6)");
                if (resetTimer) clearTimeout(resetTimer);
                resetTimer = setTimeout(() => { clickCount = 0; }, DOUBLE_CLICK_TOLERANCE);
                return;
            }

            clickCount = 2;
            showCounter("2", "rgba(255,255,255,0.8)");
            triggerKey('s'); // 触发 S

            if (resetTimer) clearTimeout(resetTimer);
            resetTimer = setTimeout(() => { clickCount = 0; }, TRIPLE_CLICK_TOLERANCE);
            return;
        }

        // 2. 等待第3击 (5秒内)
        if (clickCount === 2) {
            clickCount = 3;
            triggerKey('h'); // 触发 H
            
            clickCount = 0;
            lastTriggerTime = now;
            if (resetTimer) clearTimeout(resetTimer);
        }
    }

    // 监听全局 Play/Pause
    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

    // ==========================================
    // 模块 5: 辅助 - 空格键兜底 (原脚本 A)
    // ==========================================
    // 仅保留针对空格键的检测，以防某些网页不触发标准的play事件
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            const videos = document.querySelectorAll('video');
            videos.forEach(video => {
                // 仅处理可见或正在播放的视频
                if (!video.paused || video.getBoundingClientRect().height > 0) {
                    unmuteVideo(video);
                }
            });
        }
    }, true);

})();
