// ==UserScript==
// @name         S键映射 (安卓族谱遍历通杀版 V44)
// @namespace    http://tampermonkey.net/
// @version      44.0
// @description  双击S，三击H；采用全DOM层级遍历触发，解决安卓普通模式找不到监听目标的问题
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. UI (保留) ---
    let counterBox = null;
    function initUI() {
        if (!document.body) return requestAnimationFrame(initUI);
        counterBox = document.createElement('div');
        counterBox.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            font-size: 60px; font-weight: 900; color: rgba(255, 255, 255, 0.8);
            text-shadow: 0 0 10px #000; z-index: 2147483647; pointer-events: none;
            display: none; transition: opacity 0.2s;
        `;
        document.body.appendChild(counterBox);
    }
    initUI();

    function showCounter(num, color='#fff') {
        if (!counterBox) return;
        counterBox.innerText = num;
        counterBox.style.color = color;
        counterBox.style.display = 'block';
        counterBox.style.opacity = '1';
        setTimeout(() => {
            counterBox.style.opacity = '0';
            setTimeout(() => counterBox.style.display = 'none', 200);
        }, 500);
    }

    // --- 2. 键盘发射器 (V44: 族谱遍历 + 模拟 Windows 键码) ---
    function triggerKey(keyName, originalTarget) {
        
        // 延迟 300ms 避开安卓触摸冲突
        setTimeout(() => {
            const isH = keyName.toLowerCase() === 'h';
            if (isH) showCounter("H", "#3388ff");

            // --- 键码定义 (模拟标准 Windows 键盘事件) ---
            let keyChar = keyName.toLowerCase();
            let code = 'Key' + keyName.toUpperCase();
            let keyCode = keyName.toUpperCase().charCodeAt(0); // H=72
            let charCode = keyName.toLowerCase().charCodeAt(0); // h=104

            // --- 【核心逻辑】构建“全家桶”目标列表 ---
            // 既然不知道谁在监听，就给从 Video 到 Root 的所有元素都发一遍
            let targets = [];
            
            // 1. 视频元素本身
            if (originalTarget) targets.push(originalTarget);
            
            // 2. 向上遍历所有父级 (div, section, app-container...)
            let current = originalTarget ? originalTarget.parentElement : null;
            while (current) {
                targets.push(current);
                current = current.parentElement;
            }
            
            // 3. 保底目标
            targets.push(document.body);
            targets.push(document.documentElement); // html 标签
            targets.push(document);
            targets.push(window);

            // 去重
            targets = [...new Set(targets)];

            // --- 疯狂发送 ---
            targets.forEach(t => {
                if(!t) return;

                // 1. keydown (模拟 Windows 物理按下)
                try {
                    let evtDown = new KeyboardEvent('keydown', {
                        key: keyChar, code: code, keyCode: keyCode, which: keyCode,
                        bubbles: false, // 我们自己手动遍历了，不需要 bubbles，防止重复触发
                        cancelable: true, view: window,
                        composed: true // 穿透 Shadow DOM
                    });
                    Object.defineProperty(evtDown, 'keyCode', { get: () => keyCode });
                    Object.defineProperty(evtDown, 'which', { get: () => keyCode });
                    Object.defineProperty(evtDown, 'charCode', { get: () => 0 });
                    t.dispatchEvent(evtDown);
                } catch(e) {}

                // 2. keypress (Firefox 字符输入，模拟 Windows 输入文字)
                try {
                    let evtPress = new KeyboardEvent('keypress', {
                        key: keyChar, code: code, keyCode: 0, which: charCode,
                        bubbles: false,
                        cancelable: true, view: window,
                        composed: true
                    });
                    Object.defineProperty(evtPress, 'keyCode', { get: () => 0 });
                    Object.defineProperty(evtPress, 'charCode', { get: () => charCode }); // 关键: 104
                    Object.defineProperty(evtPress, 'which', { get: () => charCode });
                    t.dispatchEvent(evtPress);
                } catch(e) {}

                // 3. keyup (模拟 Windows 抬起)
                try {
                    let evtUp = new KeyboardEvent('keyup', {
                        key: keyChar, code: code, keyCode: keyCode, which: keyCode,
                        bubbles: false,
                        cancelable: true, view: window,
                        composed: true
                    });
                    Object.defineProperty(evtUp, 'keyCode', { get: () => keyCode });
                    t.dispatchEvent(evtUp);
                } catch(e) {}
            });

        }, 300);
    }

    // --- 3. 核心逻辑 (保持 V43 逻辑) ---
    let clickCount = 0;
    let actionTimer = null;
    let lastEventTime = 0;   
    let lastTriggerTime = 0; 
    let lastTarget = null; 

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
            if (actionTimer) clearTimeout(actionTimer);
        }
        lastTarget = target; 

        if (actionTimer) clearTimeout(actionTimer);

        clickCount++;
        showCounter(clickCount);

        if (clickCount >= 3) {
            triggerKey('h', target); 
            clickCount = 0;
            lastTriggerTime = now; 
        } else {
            actionTimer = setTimeout(() => {
                if (clickCount === 2) {
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
