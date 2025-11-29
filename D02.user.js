// ==UserScript==
// @name         S键映射 (清爽最终版-防结束误触)
// @namespace    http://tampermonkey.net/
// @version      33.0
// @description  1秒宽容度：2连击触发S，3连击触发H；修复视频播放结束自动触发S的问题
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
        
        // 极简动画
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
            // 双击S不显示提示，直接触发
        } else if (keyName === 'h') {
            keyChar = 'h'; keyCode = 72;
            showCounter("H", "#3388ff"); // 三击H显示提示
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

    // --- 3. 核心逻辑 (修复Fix版) ---
    let clickCount = 0;
    let actionTimer = null;
    let lastEventTime = 0;   // 用于防抖
    let lastTriggerTime = 0; // 用于冷却

    // 配置参数
    const WAIT_FOR_NEXT_CLICK = 1000; // 宽容度 1秒
    const COOL_DOWN = 2000;           // 冷却时间
    const EVENT_DEBOUNCE = 50;        // 事件防抖

    function globalHandler(e) {
        const target = e.target;
        // 仅针对视频和音频标签
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;
        
        // -----------------------------------------------------
        // 【核心修复】：如果视频已经结束 (ended) 或者极其接近结尾，忽略此事件
        // -----------------------------------------------------
        if (target.ended) return; 
        
        // 双重保险：部分播放器 ended 属性更新有延迟，判断当前时间是否接近总时长 (0.5秒内)
        if (target.duration && Math.abs(target.currentTime - target.duration) < 0.5) return;
        // -----------------------------------------------------

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

        // 每次点击都先清除之前的计时器
        if (actionTimer) {
            clearTimeout(actionTimer);
            actionTimer = null;
        }

        // 2. 计数增加
        clickCount++;

        // 3. UI 实时反馈
        if (clickCount === 1) showCounter("1", "rgba(255,255,255,0.6)");
        if (clickCount === 2) showCounter("2", "rgba(255,255,255,0.8)");
        if (clickCount === 3) showCounter("3", "rgba(255,255,255,1.0)");

        // 4. 判定逻辑
        if (clickCount >= 3) {
            // --- 三连击：立即触发 H ---
            triggerKey('h');
            clickCount = 0;
            lastTriggerTime = now; 
        } else {
            // --- 一击或二击：启动倒计时 ---
            actionTimer = setTimeout(() => {
                if (clickCount === 2) {
                    // --- 双击结算：触发 S ---
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
