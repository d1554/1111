// ==UserScript==
// @name         多功能媒体控 (S键映射+自动解除静音)
// @namespace    http://tampermonkey.net/
// @version      36.0
// @description  修复版：限制解除静音触发频率，防止在双击过程中产生干扰信号导致误判为三击
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 模块 1: UI 显示系统
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
    // 模块 2: 键盘模拟发射器
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
    // 模块 3: 音量控制逻辑 (带防抖锁)
    // ==========================================
    function unmuteVideo(videoElement) {
        // 为了防止重复操作DOM引发页面重绘产生幽灵信号
        // 先检查是否真的需要修改
        let needsUnmute = videoElement.muted;
        let needsVolumeUp = videoElement.volume === 0;

        if (!needsUnmute && !needsVolumeUp) return false;

        if (needsUnmute) {
            videoElement.muted = false;
            console.log("🔊 已强制解除静音");
        }
        if (needsVolumeUp) {
            videoElement.volume = 0.5;
            console.log("🔊 音量过低，已恢复为 50%");
        }
        return true; // 返回 true 表示进行了修改
    }

    // ==========================================
    // 模块 4: 核心信号处理 (修复逻辑)
    // ==========================================
    let clickCount = 0;
    let resetTimer = null;
    let lastTriggerTime = 0;
    let lastSignalTime = 0; 
    
    // [参数微调] 
    // 将去重阈值从 150 提升到 200，更激进地过滤“幽灵信号”
    const SIGNAL_DEBOUNCE = 200;     
    const DOUBLE_CLICK_TOLERANCE = 500; 
    const TRIPLE_CLICK_TOLERANCE = 5000;
    const COOL_DOWN = 2000;

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;
        if (e.type !== 'play' && e.type !== 'pause') return;

        if (target.seeking) return;

        const now = Date.now();
        const signalDiff = now - lastSignalTime;

        // 1. 强力去重
        if (signalDiff < SIGNAL_DEBOUNCE) {
            console.log(`🛡️ 过滤过快信号/重影 (间隔 ${signalDiff}ms)`);
            return;
        }
        lastSignalTime = now;

        // --- [修复核心] 智能解除静音 ---
        // 只有当 clickCount 为 0 (新的一轮操作开始) 时，才去尝试解除静音。
        // 如果 clickCount > 0 (说明用户正在进行双击/三击连按)，此时绝对不要去动音量！
        // 因为动音量会导致网页状态抖动，干扰后续的点击计数。
        if (clickCount === 0 && e.type === 'play') {
            const didModify = unmuteVideo(target);
            // 如果刚刚修改了音量，建议忽略接下来极短时间内的任何信号(防止网站反弹)
            if (didModify) {
                // 强制更新时间戳，吞掉接下来 50ms 可能产生的副作用信号
                lastSignalTime = Date.now() + 50; 
            }
        }
        // -----------------------------

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
            if (signalDiff > DOUBLE_CLICK_TOLERANCE) {
                // 超时重置
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

        // 2. 等待第3击
        if (clickCount === 2) {
            clickCount = 3;
            triggerKey('h'); // 触发 H
            
            clickCount = 0;
            lastTriggerTime = now;
            if (resetTimer) clearTimeout(resetTimer);
        }
    }

    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

    // ==========================================
    // 模块 5: 辅助 - 空格键 (保留)
    // ==========================================
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            const videos = document.querySelectorAll('video');
            videos.forEach(video => {
                if (!video.paused || video.getBoundingClientRect().height > 0) {
                    unmuteVideo(video);
                }
            });
        }
    }, true);

})();
