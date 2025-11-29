// ==UserScript==
// @name         S键映射 (清爽最终版-修复自启)
// @namespace    http://tampermonkey.net/
// @version      32.0
// @description  2连击触发S，3连击触发H；修复打开网页自动触发、语音重叠问题
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 0. 启动保护 (新增核心修复) ---
    // 记录脚本加载的时间。很多网站刚打开时会乱发 play/pause 事件进行初始化
    // 我们强制在前 3000 毫秒(3秒)内忽略所有事件，防止误触
    const SCRIPT_START_TIME = Date.now();
    const PROTECTION_TIME = 3000; 

    // --- 1. UI 系统 ---
    let counterBox = null;

    function initUI() {
        if (document.body) {
            counterBox = document.createElement('div');
            // 字体 60px
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
            // console.log("🚀 触发 S 键");
        } else if (keyName === 'h') {
            keyChar = 'h'; keyCode = 72;
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
    let actionTimer = null;
    let lastTriggerTime = 0;

    const WAIT_FOR_NEXT_CLICK = 500; 
    const COOL_DOWN = 2000;          

    function globalHandler(e) {
        const target = e.target;
        // 过滤非媒体元素
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;
        
        // 过滤非播放暂停事件
        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();

        // [修复]：如果页面刚打开不到3秒，认为是网页自己在初始化，直接无视
        if (now - SCRIPT_START_TIME < PROTECTION_TIME) {
            // console.log("🛡️ 启动保护期，忽略初始化事件");
            return;
        }
        
        // 1. 冷却期检查 (防止脚本触发按键后导致死循环)
        if (now - lastTriggerTime < COOL_DOWN) return;

        // 2. 计数
        clickCount++;
        if (actionTimer) {
            clearTimeout(actionTimer);
            actionTimer = null;
        }

        // 3. UI 反馈
        if (clickCount === 1) showCounter("1", "rgba(255,255,255,0.6)");
        if (clickCount === 2) showCounter("2", "rgba(255,255,255,0.8)");
        if (clickCount === 3) showCounter("3", "rgba(255,255,255,1.0)");

        // 4. 判定逻辑
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
