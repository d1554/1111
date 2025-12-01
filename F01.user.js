// ==UserScript==
// @name         安卓Firefox耳机键映射 (1.5秒宽容度版)
// @namespace    http://tampermonkey.net/
// @version      35.0
// @description  基于播放/暂停状态触发：2击S，3击H。适配1.5秒操作间隔。
// @author       Gemini Helper (Based on User Provided Script)
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
                position: fixed; top: 20%; left: 50%; transform: translate(-50%, -50%);
                font-size: 80px; font-weight: 900; color: rgba(255, 255, 255, 0.9);
                text-shadow: 0 0 10px #000; z-index: 2147483647; pointer-events: none;
                display: none; font-family: sans-serif; transition: opacity 0.2s;
            `;
            document.body.appendChild(counterBox);
        } else {
            requestAnimationFrame(initUI);
        }
    }
    initUI();

    let counterHideTimer;
    function showCounter(text, color = '#fff') {
        if (!counterBox) return;
        counterBox.innerText = text;
        counterBox.style.color = color;
        counterBox.style.display = 'block';
        counterBox.style.opacity = '1';

        clearTimeout(counterHideTimer);
        counterHideTimer = setTimeout(() => {
            counterBox.style.opacity = '0';
            setTimeout(() => { counterBox.style.display = 'none'; }, 200);
        }, 800); // 显示时间稍长一点，方便确认
    }

    // --- 2. 键盘发射器 (模拟 S 和 H) ---
    function triggerKey(keyName) {
        let keyChar, keyCode;

        if (keyName === 's') {
            keyChar = 's'; keyCode = 83;
            showCounter("触发: S", "#00ff00"); // 绿色提示
        } else if (keyName === 'h') {
            keyChar = 'h'; keyCode = 72;
            showCounter("触发: H", "#3388ff"); // 蓝色提示
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
                    t.dispatchEvent(new KeyboardEvent('keypress', eventConfig)); // 补充keypress
                    t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
                } catch(e) {}
            }
        });
    }

    // --- 3. 核心逻辑 ---
    let clickCount = 0;
    let actionTimer = null;
    let lastEventTime = 0;
    let lastTriggerTime = 0;
    let lastTarget = null;

    // === 这里修改了你的参数 ===
    const WAIT_FOR_NEXT_CLICK = 1500; // 修改为 1.5 秒宽容度
    const COOL_DOWN = 2000;           // 触发成功后的冷却时间
    const EVENT_DEBOUNCE = 50;        // 事件防抖

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;

        // --- 防误触检测 ---
        if (target.ended) return;
        if (target.duration && Math.abs(target.currentTime - target.duration) < 0.5) return;
        if (target.seeking) return; // 关键：拖拽时不计数

        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();

        // 防抖
        if (now - lastEventTime < EVENT_DEBOUNCE) return;
        lastEventTime = now;

        // 冷却期
        if (now - lastTriggerTime < COOL_DOWN) {
            clickCount = 0;
            return;
        }

        // 切换视频重置
        if (lastTarget && lastTarget !== target) {
            clickCount = 0;
            if (actionTimer) clearTimeout(actionTimer);
        }
        lastTarget = target;

        // 清理旧定时器
        if (actionTimer) {
            clearTimeout(actionTimer);
            actionTimer = null;
        }

        // 计数
        clickCount++;

        // UI 反馈
        if (clickCount === 1) showCounter("1", "rgba(255,255,255,0.6)");
        if (clickCount === 2) showCounter("2", "rgba(255,255,255,0.8)");
        if (clickCount === 3) showCounter("3", "rgba(255,255,255,1.0)");

        // 触发判定
        if (clickCount >= 3) {
            // 3击直接触发 H
            triggerKey('h');
            clickCount = 0;
            lastTriggerTime = now;
        } else {
            // 等待 1.5秒 看看有没有下一次点击
            actionTimer = setTimeout(() => {
                if (clickCount === 2) {
                    triggerKey('s');
                    lastTriggerTime = Date.now();
                }
                // 如果是1次，就什么都不做，只是普通的暂停/播放
                clickCount = 0;
            }, WAIT_FOR_NEXT_CLICK);
        }
    }

    // 使用捕获模式监听，确保最早捕获
    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
