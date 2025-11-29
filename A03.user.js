// ==UserScript==
// @name         S键映射 (v34 信号去重版)
// @namespace    http://tampermonkey.net/
// @version      34.0
// @description  过滤150ms内的重复信号，彻底解决"单击变双击"的重影问题；保留5秒H键逻辑
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. UI 系统 ---
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

    // --- 2. 键盘发射器 ---
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

    // --- 3. 核心逻辑 ---
    let clickCount = 0;
    let resetTimer = null;
    let lastTriggerTime = 0;
    
    // [关键] 记录上一次收到信号的绝对时间
    let lastSignalTime = 0; 
    
    // [参数]
    // SIGNAL_DEBOUNCE: 信号去重阈值。
    // 小于 150ms 的连续信号被视为同一个动作的"回声"，直接忽略。
    const SIGNAL_DEBOUNCE = 150; 
    
    const DOUBLE_CLICK_TOLERANCE = 500; 
    const TRIPLE_CLICK_TOLERANCE = 5000;
    const COOL_DOWN = 2000;

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;
        if (e.type !== 'play' && e.type !== 'pause') return;

        // 屏蔽 Seeking (进度条)
        if (target.seeking) return;

        const now = Date.now();
        const signalDiff = now - lastSignalTime;

        // [核心修复] 如果这次信号距离上次信号太近 (<150ms)，认为是机器误报/重影，忽略！
        if (signalDiff < SIGNAL_DEBOUNCE) {
            console.log(`🛡️ 过滤重影信号 (间隔 ${signalDiff}ms)`);
            return;
        }
        
        // 更新信号时间
        lastSignalTime = now;

        // --- 下面是正常的计数逻辑 ---

        // 0. 初始态
        if (clickCount === 0) {
            if (now - lastTriggerTime < COOL_DOWN) return;
            
            clickCount = 1;
            showCounter("1", "rgba(255,255,255,0.6)");
            
            if (resetTimer) clearTimeout(resetTimer);
            resetTimer = setTimeout(() => { clickCount = 0; }, DOUBLE_CLICK_TOLERANCE);
            return;
        }

        // 1. 等待第2击 (这里不需要判断间隔了，因为 signalDiff 已经过滤了极短间隔)
        if (clickCount === 1) {
            // 这里唯一要判断的是是否超时 (比如间隔 2秒 按了两下，不算双击)
            // 虽然 resetTimer 会处理，但为了保险：
            if (signalDiff > DOUBLE_CLICK_TOLERANCE) {
                // 超时了，这算是新的一下
                clickCount = 1;
                showCounter("1", "rgba(255,255,255,0.6)");
                if (resetTimer) clearTimeout(resetTimer);
                resetTimer = setTimeout(() => { clickCount = 0; }, DOUBLE_CLICK_TOLERANCE);
                return;
            }

            clickCount = 2;
            showCounter("2", "rgba(255,255,255,0.8)");
            triggerKey('s'); // 立即触发 S

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

    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
