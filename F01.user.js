// ==UserScript==
// @name         S键映射 (安卓普通模式修复 V43)
// @namespace    http://tampermonkey.net/
// @version      43.0
// @description  双击S，三击H；强制清除选中状态+注入TabIndex强制聚焦；修复普通模式焦点丢失
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. UI 系统 (保持简洁) ---
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

    // --- 2. 键盘发射器 (V43: 焦点锁定版) ---
    function triggerKey(keyName, originalTarget) {
        
        // 稍微延长一点点延迟到 300ms，确保安卓的"三击放大"或"选中"动画结束
        setTimeout(() => {
            const isH = keyName.toLowerCase() === 'h';
            if (isH) showCounter("H", "#3388ff");

            // --- 【关键步骤 1】清除干扰 ---
            // 移除因三连击可能产生的文本选中状态，这会抢走键盘焦点
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }

            // --- 【关键步骤 2】强制聚焦视频 ---
            // 如果是在普通模式，焦点可能跑偏了。我们必须手动把焦点拉回视频元素。
            let focusTarget = originalTarget;
            if (focusTarget) {
                // 如果视频元素本身不可聚焦（默认情况），强制赋予它聚焦能力
                if (!focusTarget.getAttribute('tabindex')) {
                    focusTarget.setAttribute('tabindex', '-1');
                }
                try {
                    focusTarget.focus({preventScroll: true});
                    // console.log("强制聚焦到:", focusTarget); 
                } catch(e) {}
            }

            // --- 【关键步骤 3】确定发送目标 ---
            // 优先发给当前（被我们强制）聚焦的元素，其次是 body
            // 这样能模拟出"用户盯着视频按键盘"的效果
            let targets = [document.activeElement, focusTarget, document.body, window];
            targets = [...new Set(targets)]; // 去重

            // 键码定义 (保留 V41 验证成功的 Firefox 修正)
            let keyChar = keyName.toLowerCase();
            let code = 'Key' + keyName.toUpperCase();
            let keyCode = keyName.toUpperCase().charCodeAt(0); 
            let charCode = keyName.toLowerCase().charCodeAt(0); 

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

                // 2. keypress (Firefox 核心)
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

        }, 300); // 延迟调整为 300ms
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
