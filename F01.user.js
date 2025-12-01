// ==UserScript==
// @name         S键映射 (Firefox终极模拟版)
// @namespace    http://tampermonkey.net/
// @version      36.0
// @description  1秒宽容度；修复Firefox H键无效问题(补全keypress事件)；保留防误触/防拖拽
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

    // --- 2. 键盘发射器 (V36 终极版) ---
    function triggerKey(keyName) {
        let keyChar = keyName.toLowerCase();
        let keyCode = keyName.toUpperCase().charCodeAt(0);

        // UI 提示
        if (keyName === 'h') showCounter("H", "#3388ff");
        
        // 目标列表：增加 window，因为有些网站事件监听在 window 上
        const targets = [document.activeElement, document.body, document.documentElement, window];

        targets.forEach(t => {
            if (!t) return;

            // 模拟完整的按键生命周期：按下 -> 按住(输入字符) -> 抬起
            // 很多网站 H 键需要 keypress 才能生效
            ['keydown', 'keypress', 'keyup'].forEach(type => {
                try {
                    let eventInit = {
                        key: keyChar,
                        code: 'Key' + keyChar.toUpperCase(),
                        keyCode: keyCode, // 默认值
                        which: keyCode,
                        bubbles: true, 
                        cancelable: true, 
                        view: window
                    };

                    let evt = new KeyboardEvent(type, eventInit);

                    // 【核心修复】针对 Firefox 严格区分 keyCode 和 charCode
                    // keydown/keyup: keyCode 有值, charCode 为 0
                    // keypress: keyCode 通常为 0, charCode 有值 (ASCII码)
                    
                    const isPress = (type === 'keypress');

                    Object.defineProperty(evt, 'keyCode', { 
                        get: () => isPress ? 0 : keyCode 
                    });
                    
                    Object.defineProperty(evt, 'charCode', { 
                        get: () => isPress ? keyCode : 0 
                    });
                    
                    Object.defineProperty(evt, 'which', { 
                        get: () => keyCode // which 比较通用，一直保持有值
                    });

                    t.dispatchEvent(evt);
                } catch (e) {
                    console.error("Trigger Error:", e);
                }
            });
        });
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

        if (actionTimer) {
            clearTimeout(actionTimer);
            actionTimer = null;
        }

        clickCount++;

        // UI 反馈
        if (clickCount === 1) showCounter("1", "rgba(255,255,255,0.6)");
        if (clickCount === 2) showCounter("2", "rgba(255,255,255,0.8)");
        if (clickCount === 3) showCounter("3", "rgba(255,255,255,1.0)");

        if (clickCount >= 3) {
            triggerKey('h'); // 立即触发 H
            clickCount = 0;
            lastTriggerTime = now; 
        } else {
            actionTimer = setTimeout(() => {
                if (clickCount === 2) {
                    triggerKey('s'); // 倒计时结束触发 S
                    lastTriggerTime = Date.now();
                }
                clickCount = 0; 
            }, WAIT_FOR_NEXT_CLICK);
        }
    }

    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
