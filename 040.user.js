// ==UserScript==
// @name         S键映射 (清爽最终版)
// @namespace    http://tampermonkey.net/
// @version      31.0
// @description  2连击触发S(无提示)，3连击触发H；字号改小，移除调试日志
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. UI 系统 (仅保留精简计数器) ---
    let counterBox = null;

    function initUI() {
        if (document.body) {
            counterBox = document.createElement('div');
            // 修改：字体改小为 60px (原120px)，位置下移
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
        // 动画效果稍微调小一点，不那么夸张
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
            console.log("🚀 触发 S 键");
            // 用户要求：按两下不显示 S，所以这里不调用 showCounter
        } else if (keyName === 'h') {
            keyChar = 'h'; keyCode = 72;
            console.log("🚀 触发 H 键");
            // 三连击还是给个小提示，区分一下
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

    // --- 3. 核心逻辑 (无日志版) ---
    let clickCount = 0;
    let actionTimer = null;
    let lastTriggerTime = 0;

    // 参数保持之前的稳定版设置
    const WAIT_FOR_NEXT_CLICK = 500; // 宽容度 0.5秒
    const COOL_DOWN = 2000;          // 冷却 2秒

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;
        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();
        
        // 1. 冷却期检查
        if (now - lastTriggerTime < COOL_DOWN) return;

        // 2. 计数
        clickCount++;
        if (actionTimer) {
            clearTimeout(actionTimer);
            actionTimer = null;
        }

        // 3. UI 反馈 (只显示 1, 2, 3)
        // 使用更柔和的颜色，不再用红黄蓝那么刺眼
        if (clickCount === 1) showCounter("1", "rgba(255,255,255,0.6)");
        if (clickCount === 2) showCounter("2", "rgba(255,255,255,0.8)");
        if (clickCount === 3) showCounter("3", "rgba(255,255,255,1.0)");

        // 4. 判定
        if (clickCount >= 3) {
            // --- 三连击 H ---
            triggerKey('h');
            clickCount = 0;
            lastTriggerTime = now;

        } else {
            // --- 等待 ---
            actionTimer = setTimeout(() => {
                if (clickCount === 2) {
                    // --- 双击 S ---
                    triggerKey('s');
                    lastTriggerTime = Date.now();
                }
                clickCount = 0; 
            }, WAIT_FOR_NEXT_CLICK);
        }
    }

    // 启动全局捕获
    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
