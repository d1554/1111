// ==UserScript==
// @name         S键映射 (强制聚焦/精准触发版)
// @namespace    http://tampermonkey.net/
// @version      35.0
// @description  1秒宽容度：2连击S，3连击H；修复焦点问题，确保H键指令能被播放器接收
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

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

    // --- 2. 键盘发射器 (V35 重构：增加目标元素和强制聚焦) ---
    function triggerKey(keyName, targetElement) {
        let keyChar, keyCode;
        
        if (keyName === 's') {
            keyChar = 's'; keyCode = 83;
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
        
        // 【核心修复列表】
        // 1. 尝试聚焦视频本身
        if (targetElement && typeof targetElement.focus === 'function') {
            targetElement.focus();
        }

        // 2. 确定打击目标列表
        // 很多播放器监听的是 video 的父级 div，或者 document 本身
        const targets = [];
        
        if (targetElement) {
            targets.push(targetElement); // 视频标签本身
            if (targetElement.parentElement) targets.push(targetElement.parentElement); // 视频的父容器
        }
        targets.push(document.activeElement); // 当前激活元素
        targets.push(document.body); // 网页主体

        // 去重并发送
        const uniqueTargets = [...new Set(targets)].filter(t => t);

        uniqueTargets.forEach(t => {
            try {
                t.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
                t.dispatchEvent(new KeyboardEvent('keypress', eventConfig)); // 部分老网站需要这个
                t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
            } catch(e) {}
        });
        
        console.log(`[Script] Sent Key ${keyChar.toUpperCase()} to`, uniqueTargets);
    }

    // --- 3. 核心逻辑 ---
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

        // 防误触检测
        if (target.ended) return; 
        if (target.duration && Math.abs(target.currentTime - target.duration) < 0.5) return;
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

        // 3. 计时器清理
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
            // 【关键修改】把当前的 target (视频元素) 传给发射器
            triggerKey('h', target); 
            clickCount = 0;
            lastTriggerTime = now; 
        } else {
            actionTimer = setTimeout(() => {
                if (clickCount === 2) {
                    triggerKey('s', target); // S键也传入 target
                    lastTriggerTime = Date.now();
                }
                clickCount = 0; 
            }, WAIT_FOR_NEXT_CLICK);
        }
    }

    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
