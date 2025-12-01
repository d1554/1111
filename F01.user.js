// ==UserScript==
// @name         S键映射 (V51 精准回退修复版)
// @namespace    http://tampermonkey.net/
// @version      51.0
// @description  基于V34完美回退：S键保持V34原始逻辑(确保可用)，H键单独应用Firefox补丁；轻量级防误触
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 0. 轻量级 CSS (仅防止双击缩放，不影响点击) ---
    function injectMinimalCSS() {
        const css = `
            video, audio, button, .video-wrapper, .control-bar {
                touch-action: manipulation !important; 
            }
        `;
        const style = document.createElement('style');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }
    injectMinimalCSS();

    // --- 1. UI 系统 (保持不变) ---
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
        }, 500);
    }

    // --- 2. 混合键盘发射器 (Hybrid Trigger) ---
    function triggerKey(keyName, originalTarget) {
        
        // 目标：优先发给视频，没有就发给body
        const targets = [originalTarget || document.body, document];

        // === 分支 1：如果是 S 键，使用 V34 的原始逻辑 (最简单，最稳) ===
        if (keyName === 's') {
            const keyCode = 83; // S
            const eventConfig = {
                key: 's', code: 'KeyS', keyCode: keyCode, which: keyCode,
                bubbles: true, cancelable: true, view: window
            };
            
            targets.forEach(t => {
                if(!t) return;
                try {
                    t.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
                    t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
                } catch(e) {}
            });
            return; // S 键处理完毕，直接结束
        }

        // === 分支 2：如果是 H 键，使用 Firefox 强力补丁 (因为普通逻辑发不出 H) ===
        if (keyName === 'h') {
            showCounter("H", "#3388ff");
            
            const keyCode = 72;  // H
            const charCode = 104; // h
            
            targets.forEach(t => {
                if(!t) return;
                
                // 1. KeyDown
                try {
                    let e = new KeyboardEvent('keydown', {
                        key: 'h', code: 'KeyH', keyCode: keyCode, which: keyCode,
                        bubbles: true, cancelable: true, view: window
                    });
                    // Firefox 补丁
                    Object.defineProperty(e, 'keyCode', { get: () => keyCode });
                    Object.defineProperty(e, 'which', { get: () => keyCode });
                    Object.defineProperty(e, 'charCode', { get: () => 0 });
                    t.dispatchEvent(e);
                } catch(err) {}

                // 2. KeyPress (H键的核心)
                try {
                    let e = new KeyboardEvent('keypress', {
                        key: 'h', code: 'KeyH', keyCode: 0, which: charCode,
                        bubbles: true, cancelable: true, view: window
                    });
                    Object.defineProperty(e, 'keyCode', { get: () => 0 });
                    Object.defineProperty(e, 'charCode', { get: () => charCode });
                    Object.defineProperty(e, 'which', { get: () => charCode });
                    t.dispatchEvent(e);
                } catch(err) {}

                // 3. KeyUp
                try {
                    let e = new KeyboardEvent('keyup', {
                        key: 'h', code: 'KeyH', keyCode: keyCode, which: keyCode,
                        bubbles: true, cancelable: true, view: window
                    });
                    Object.defineProperty(e, 'keyCode', { get: () => keyCode });
                    t.dispatchEvent(e);
                } catch(err) {}
            });
        }
    }

    // --- 3. 核心逻辑 (完全复制 V34) ---
    let clickCount = 0;
    let actionTimer = null;
    let lastEventTime = 0;   
    let lastTriggerTime = 0; 
    let lastTarget = null; 

    // 配置参数
    const WAIT_FOR_NEXT_CLICK = 1000; 
    const COOL_DOWN = 2000;           
    const EVENT_DEBOUNCE = 50;        

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;

        // 1. 播放结束检测
        if (target.ended) return; 
        if (target.duration && Math.abs(target.currentTime - target.duration) < 0.5) return;

        // 2. 寻找进度(Seeking)检测
        if (target.seeking) return;

        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();

        // 0. 事件防抖
        if (now - lastEventTime < EVENT_DEBOUNCE) return;
        lastEventTime = now;
        
        // 1. 冷却期检查
        if (now - lastTriggerTime < COOL_DOWN) {
            clickCount = 0; 
            return;
        }

        // 2. 切换视频检测
        if (lastTarget && lastTarget !== target) {
            clickCount = 0;
            if (actionTimer) {
                clearTimeout(actionTimer);
                actionTimer = null;
            }
        }
        lastTarget = target; 

        // 3. 清理旧定时器
        if (actionTimer) {
            clearTimeout(actionTimer);
            actionTimer = null;
        }

        // 4. 计数增加
        clickCount++;

        // 5. UI 反馈
        if (clickCount === 1) showCounter("1", "rgba(255,255,255,0.6)");
        if (clickCount === 2) showCounter("2", "rgba(255,255,255,0.8)");
        if (clickCount === 3) showCounter("3", "rgba(255,255,255,1.0)");

        // 6. 触发判定
        if (clickCount >= 3) {
            // 三连击：触发 H (使用 Firefox 补丁版逻辑)
            triggerKey('h', target);
            clickCount = 0;
            lastTriggerTime = now; 
        } else {
            // 倒计时
            actionTimer = setTimeout(() => {
                if (clickCount === 2) {
                    // 双击：触发 S (使用 V34 原始逻辑)
                    triggerKey('s', target);
                    lastTriggerTime = Date.now();
                }
                clickCount = 0; 
            }, WAIT_FOR_NEXT_CLICK);
        }
    }

    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
