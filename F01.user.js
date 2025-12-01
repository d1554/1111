// ==UserScript==
// @name         S键映射 (Firefox全屏/普通通杀版 V42)
// @namespace    http://tampermonkey.net/
// @version      42.0
// @description  双击S，三击H；强制焦点校正，修复普通模式下按键失效问题
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. UI 系统 (精简版) ---
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

    // --- 2. 键盘发射器 (V42: 焦点强制 + 冒泡穿透) ---
    function triggerKey(keyName, originalTarget) {
        // 延迟保持不变，避开点击冲突
        setTimeout(() => {
            const isH = keyName.toLowerCase() === 'h';
            if (isH) showCounter("H", "#3388ff"); // 蓝色提示

            // 键码定义 (保留 V41 验证成功的 Firefox 修正)
            let keyChar = keyName.toLowerCase();
            let code = 'Key' + keyName.toUpperCase();
            let keyCode = keyName.toUpperCase().charCodeAt(0); 
            let charCode = keyName.toLowerCase().charCodeAt(0); // 104 or 115

            // 【核心修改 1】构建完整的“族谱”链条
            // 我们不依赖事件冒泡，而是手动把事件发给每一个父级
            // 因为有些网站会在中间层拦截 stopPropagation
            let targets = [window, document, document.body];
            
            if (originalTarget) {
                // 尝试让视频本身获得焦点
                try { originalTarget.focus({preventScroll: true}); } catch(e){}

                let current = originalTarget;
                while (current && current !== document.body) {
                    targets.unshift(current); // 把父级加入列表
                    current = current.parentElement;
                }
            }
            targets = [...new Set(targets)]; // 去重

            // 【核心修改 2】对列表中的每一个元素发射事件
            targets.forEach(t => {
                if(!t) return;

                // 1. keydown
                try {
                    let evtDown = new KeyboardEvent('keydown', {
                        key: keyChar, code: code, keyCode: keyCode, which: keyCode,
                        bubbles: true, cancelable: true, view: window
                    });
                    Object.defineProperty(evtDown, 'keyCode', { get: () => keyCode });
                    Object.defineProperty(evtDown, 'which', { get: () => keyCode });
                    Object.defineProperty(evtDown, 'charCode', { get: () => 0 });
                    t.dispatchEvent(evtDown);
                } catch(e) {}

                // 2. keypress (Firefox 关键)
                try {
                    let evtPress = new KeyboardEvent('keypress', {
                        key: keyChar, code: code, keyCode: 0, which: charCode,
                        bubbles: true, cancelable: true, view: window
                    });
                    Object.defineProperty(evtPress, 'keyCode', { get: () => 0 });
                    Object.defineProperty(evtPress, 'charCode', { get: () => charCode });
                    Object.defineProperty(evtPress, 'which', { get: () => charCode });
                    t.dispatchEvent(evtPress);
                } catch(e) {}

                // 3. keyup
                try {
                    let evtUp = new KeyboardEvent('keyup', {
                        key: keyChar, code: code, keyCode: keyCode, which: keyCode,
                        bubbles: true, cancelable: true, view: window
                    });
                    Object.defineProperty(evtUp, 'keyCode', { get: () => keyCode });
                    t.dispatchEvent(evtUp);
                } catch(e) {}
            });

        }, 250);
    }

    // --- 3. 核心逻辑 (保持不变) ---
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
