// ==UserScript==
// @name         S键映射 (安卓强力穿透版)
// @namespace    http://tampermonkey.net/
// @version      39.0
// @description  1秒宽容度；修复安卓H键无效(地毯式冒泡触发)；保留S键双击；
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

    // --- 2. 键盘发射器 (安卓穿透版) ---
    function triggerKey(keyName, originalTarget) {
        // 保持 250ms 延迟，避开安卓的三击放大/文本选中干扰
        setTimeout(() => {
            let keyChar = keyName;
            let keyCode = (keyName === 's') ? 83 : 72;

            if (keyName === 'h') showCounter("H", "#3388ff");

            const eventConfig = {
                key: keyChar, 
                code: 'Key' + keyChar.toUpperCase(),
                keyCode: keyCode, 
                which: keyCode,
                bubbles: true, cancelable: true, view: window
            };

            // 【核心修改】构建目标列表：不仅包含 document/window，
            // 还要包含视频元素及其所有父级 div (直到 body)
            // 很多移动端网页的事件监听器绑在视频外面的 wrapper 层上
            let targets = [window, document, document.body];
            
            if (originalTarget) {
                let current = originalTarget;
                // 向上查找 5 层父元素 (通常播放器容器就在这几层里)
                for (let i = 0; i < 5; i++) {
                    if (current) {
                        targets.push(current);
                        current = current.parentElement;
                    }
                }
            }
            
            // 去重
            targets = [...new Set(targets)];

            // 疯狂触发
            targets.forEach(t => {
                if(t) {
                    try {
                        t.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
                        t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
                        // 安卓 Firefox 对 keypress 支持较弱，但也发一下以防万一
                        t.dispatchEvent(new KeyboardEvent('keypress', eventConfig));
                    } catch(e) {}
                }
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

        if (clickCount === 1) showCounter("1", "rgba(255,255,255,0.6)");
        if (clickCount === 2) showCounter("2", "rgba(255,255,255,0.8)");
        if (clickCount === 3) showCounter("3", "rgba(255,255,255,1.0)");

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
