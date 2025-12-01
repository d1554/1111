// ==UserScript==
// @name         S键映射 (V39-暴力清场防吞版)
// @namespace    http://tampermonkey.net/
// @version      39.0
// @description  强制清除Firefox三击产生的文本选区；H键连发3次确保穿透；保留防误触
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

    // --- 2. 键盘发射器 (暴力清场 + 连发) ---
    function triggerKey(keyName, originalTarget) {
        // 稍微延迟一丢丢，等Firefox把“全选”这件蠢事做完
        setTimeout(() => {
            
            // === 【第一步：暴力清场】 ===
            // 1. 清除三击产生的高亮选区 (这是Firefox吞事件的罪魁祸首)
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }
            // 2. 强制当前焦点元素失焦 (Reset)
            if (document.activeElement) {
                document.activeElement.blur();
            }
            // 3. 重新把焦点聚焦回视频 (如果有)，或者聚焦到body
            if (originalTarget && originalTarget.focus) {
                originalTarget.focus();
            } else {
                document.body.focus();
            }

            // === 【第二步：按键构造】 ===
            let keyChar = keyName;
            let keyCode = (keyName === 's') ? 83 : 72;
            
            if (keyName === 'h') showCounter("H", "#3388ff");

            const eventConfig = {
                key: keyChar, 
                code: 'Key' + keyChar.toUpperCase(),
                keyCode: keyCode, 
                which: keyCode,
                charCode: keyCode, // 为keypress补全
                bubbles: true, cancelable: true, view: window
            };

            // === 【第三步：地毯式轰炸】 ===
            // 定义一个发送函数
            const fire = () => {
                // 优先发给 originalTarget (视频本身)，不行就发给 document
                const t = originalTarget || document.body;
                
                // keydown -> keypress -> keyup
                t.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
                t.dispatchEvent(new KeyboardEvent('keypress', eventConfig)); // 很多H键绑定在这里
                t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
            };

            // 连发3次，间隔20ms，确保有一发能钻过浏览器的事件缝隙
            fire(); 
            setTimeout(fire, 20);
            setTimeout(fire, 40);

        }, 150); // 延迟150ms开始执行，避开三击物理高峰
    }

    // --- 3. 核心逻辑 (保持防误触) ---
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
            // 将 target 传进去，方便我们重新聚焦
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
