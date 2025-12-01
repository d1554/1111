// ==UserScript==
// @name         S键映射 (Firefox时机修复版)
// @namespace    http://tampermonkey.net/
// @version      37.0
// @description  1秒宽容度；修复Firefox三连击H因事件冲突被吞掉的问题(异步触发)
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
        }, 500);
    }

    // --- 2. 键盘发射器 (异步增强版) ---
    function triggerKey(keyName) {
        // 将发射逻辑包裹在 setTimeout 中，强制推迟到下一个事件循环
        // 这是解决 Firefox "吞事件" 的关键
        setTimeout(() => {
            let keyChar = keyName.toLowerCase();
            let keyCode = keyName.toUpperCase().charCodeAt(0);

            if (keyName === 'h') showCounter("H", "#3388ff");
            
            // 扩大打击面，确保 activeElement 能收到
            const targets = [document.activeElement || document.body, document.body, document.documentElement, window];
            
            // 去重，防止对同一个元素发两次
            const uniqueTargets = [...new Set(targets)]; 

            uniqueTargets.forEach(t => {
                if (!t) return;

                ['keydown', 'keypress', 'keyup'].forEach(type => {
                    try {
                        let eventInit = {
                            key: keyChar,
                            code: 'Key' + keyChar.toUpperCase(),
                            keyCode: keyCode,
                            which: keyCode,
                            bubbles: true, 
                            cancelable: true,
                            composed: true, // 现代浏览器事件穿透 Shadow DOM
                            view: window
                        };

                        let evt = new KeyboardEvent(type, eventInit);
                        const isPress = (type === 'keypress');

                        Object.defineProperty(evt, 'keyCode', { get: () => isPress ? 0 : keyCode });
                        Object.defineProperty(evt, 'charCode', { get: () => isPress ? keyCode : 0 });
                        Object.defineProperty(evt, 'which', { get: () => keyCode });

                        t.dispatchEvent(evt);
                    } catch (e) {
                        console.error("Key trigger failed:", e);
                    }
                });
            });
        }, 50); // 延迟 50ms 发射，避开 play/pause 的处理高峰
    }

    // --- 3. 核心逻辑 (保持不变) ---
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

        if (target.ended) return; 
        if (target.duration && Math.abs(target.currentTime - target.duration) < 0.5) return;
        if (target.seeking) return;

        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();

        if (now - lastEventTime < EVENT_DEBOUNCE) return;
        lastEventTime = now;
        
        if (now - lastTriggerTime < COOL_DOWN) {
            clickCount = 0; 
            return;
        }

        if (lastTarget && lastTarget !== target) {
            clickCount = 0;
            if (actionTimer) {
                clearTimeout(actionTimer);
                actionTimer = null;
            }
        }
        lastTarget = target; 

        if (actionTimer) {
            clearTimeout(actionTimer);
            actionTimer = null;
        }

        clickCount++;

        if (clickCount === 1) showCounter("1", "rgba(255,255,255,0.6)");
        if (clickCount === 2) showCounter("2", "rgba(255,255,255,0.8)");
        if (clickCount === 3) showCounter("3", "rgba(255,255,255,1.0)");

        if (clickCount >= 3) {
            // 这里调用 triggerKey，内部会延迟 50ms 执行
            triggerKey('h');
            clickCount = 0;
            lastTriggerTime = now; 
        } else {
            actionTimer = setTimeout(() => {
                if (clickCount === 2) {
                    triggerKey('s');
                    lastTriggerTime = Date.now();
                }
                clickCount = 0; 
            }, WAIT_FOR_NEXT_CLICK);
        }
    }

    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
