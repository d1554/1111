// ==UserScript==
// @name         S键映射 V35 (Android Fix版)
// @namespace    http://tampermonkey.net/
// @version      35.0
// @description  修复安卓Chrome三连击事件丢失，2击S / 3击H；防切换视频、防拖拽误触；1秒连击判定+冷却
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

    // --- 2. 键盘发射器 ---
    function triggerKey(keyName) {
        let keyChar, keyCode;
        
        if (keyName === 's') {
            keyChar = 's'; keyCode = 83;
            showCounter("S", "#ffffff");
        } else if (keyName === 'h') {
            keyChar = 'h'; keyCode = 72;
            showCounter("H", "#3388ff");
        }

        const eventConfig = {
            key: keyChar, 
            code: 'Key' + keyChar.toUpperCase(),
            keyCode: keyCode, 
            which: keyCode,
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

    // --- 3. 核心连击逻辑 (Android click 版) ---
    let clickCount = 0;
    let actionTimer = null;
    let lastEventTime = 0;
    let lastTriggerTime = 0;
    let lastTarget = null;

    const WAIT_FOR_NEXT_CLICK = 1000; // 1秒连击窗口
    const COOL_DOWN = 2000;           // 激活后2秒冷却
    const EVENT_DEBOUNCE = 80;        // click 防抖

    window.addEventListener('click', function(e) {
        const target = e.target;

        // 仅侦测 VIDEO / AUDIO 的点击
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;

        const now = Date.now();

        // --- 防抖 ---
        if (now - lastEventTime < EVENT_DEBOUNCE) return;
        lastEventTime = now;

        // --- 冷却期 ---
        if (now - lastTriggerTime < COOL_DOWN) {
            clickCount = 0;
            return;
        }

        // --- 切换视频重置 ---
        if (lastTarget && lastTarget !== target) {
            clickCount = 0;
            if (actionTimer) clearTimeout(actionTimer);
        }
        lastTarget = target;

        // --- 增加计数 ---
        clickCount++;

        if (clickCount === 1) showCounter("1", "rgba(255,255,255,0.6)");
        if (clickCount === 2) showCounter("2", "rgba(255,255,255,0.8)");
        if (clickCount === 3) showCounter("3", "rgba(255,255,255,1)");

        // --- 连击判定 ---
        if (clickCount >= 3) {
            triggerKey('h');
            clickCount = 0;
            lastTriggerTime = now;
            return;
        }

        // --- 二击定时判定（1秒内不再点就触发 S） ---
        if (actionTimer) clearTimeout(actionTimer);

        actionTimer = setTimeout(() => {
            if (clickCount === 2) {
                triggerKey('s');
                lastTriggerTime = Date.now();
            }
            clickCount = 0;
        }, WAIT_FOR_NEXT_CLICK);

    }, true);

})();
