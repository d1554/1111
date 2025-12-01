// ==UserScript==
// @name         S键映射 (终极焦点夺回版 V45)
// @namespace    http://tampermonkey.net/
// @version      45.0
// @description  利用 mousedown 事件欺骗浏览器强制夺回焦点，解决安卓普通模式三击失效问题
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. 提示框 (UI) ---
    let tipBox = null;
    function showTip(text, color = '#fff') {
        if (!tipBox) {
            tipBox = document.createElement('div');
            tipBox.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                font-size: 50px; font-weight: bold; color: #fff;
                text-shadow: 0 0 5px #000; pointer-events: none; z-index: 999999;
                transition: opacity 0.2s; opacity: 0;
            `;
            (document.body || document.documentElement).appendChild(tipBox);
        }
        tipBox.innerText = text;
        tipBox.style.color = color;
        tipBox.style.opacity = '1';
        setTimeout(() => { tipBox.style.opacity = '0'; }, 500);
    }

    // --- 2. 核心：带焦点欺骗的按键发送器 ---
    function fireKey(keyName, originalTarget) {
        
        // 适当增加延迟到 350ms，给浏览器的三击放大动画一点缓冲时间
        setTimeout(() => {
            const target = originalTarget || document.body;

            // === 【核心大招】欺骗浏览器夺回焦点 ===
            // 安卓普通模式下，三击会导致焦点丢失。
            // 我们手动触发一个 'mousedown' 事件，假装用户按住了视频。
            // 这通常能强制浏览器把焦点重新分配给视频元素。
            try {
                let fakeClick = new MouseEvent('mousedown', {
                    bubbles: true, cancelable: true, view: window
                });
                target.dispatchEvent(fakeClick);
                
                if (target.focus) target.focus({preventScroll: true});
            } catch(e) {}
            // ======================================

            // 准备按键数据
            const key = keyName.toLowerCase();
            const code = 'Key' + keyName.toUpperCase();
            const keyCode = keyName.toUpperCase().charCodeAt(0); // H=72
            const charCode = keyName.charCodeAt(0); // h=104

            // 定义事件包
            const eventSequence = [
                { type: 'keydown',  k: keyCode, c: 0 },
                { type: 'keypress', k: 0,       c: charCode }, // Firefox 必须
                { type: 'keyup',    k: keyCode, c: 0 }
            ];

            // 发送目标：双管齐下
            // 1. 发给视频元素本身 (针对全屏和现代播放器)
            // 2. 发给 document (针对全局监听的快捷键)
            let targets = [target, document]; 
            
            targets.forEach(t => {
                eventSequence.forEach(evtInfo => {
                    try {
                        const e = new KeyboardEvent(evtInfo.type, {
                            key: key, code: code,
                            keyCode: evtInfo.k, which: evtInfo.k || evtInfo.c,
                            bubbles: true, cancelable: true, view: window
                        });

                        Object.defineProperty(e, 'keyCode', { get: () => evtInfo.k });
                        Object.defineProperty(e, 'charCode', { get: () => evtInfo.c });
                        Object.defineProperty(e, 'which',    { get: () => evtInfo.k || evtInfo.c });

                        t.dispatchEvent(e);
                    } catch(err) {}
                });
            });

        }, 350); // 延迟 350ms
    }

    // --- 3. 计数与防抖逻辑 ---
    let clicks = 0;
    let clickTimer = null;
    let lastTarget = null;
    let safetyLock = false; 

    function handleStateChange(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;

        if (target.ended || target.seeking) return;
        
        // 切换视频时重置
        if (lastTarget && lastTarget !== target) {
            clicks = 0;
            clearTimeout(clickTimer);
        }
        lastTarget = target;

        if (clickTimer) clearTimeout(clickTimer);
        if (safetyLock) return;

        clicks++;
        
        if (clicks === 1) showTip("1", "rgba(255,255,255,0.5)");
        if (clicks === 2) showTip("2", "rgba(255,255,255,0.8)");
        if (clicks === 3) showTip("3", "#0f0");

        if (clicks >= 3) {
            // === 三连击 H ===
            clicks = 0;
            safetyLock = true;
            
            showTip("H", "#3388ff");
            // 调用发送器
            fireKey('h', target);
            
            // 稍后解锁
            setTimeout(() => { safetyLock = false; }, 500);

        } else {
            // === 等待 S ===
            clickTimer = setTimeout(() => {
                if (clicks === 2) {
                    showTip("S", "#fff");
                    fireKey('s', target);
                }
                clicks = 0;
            }, 1000); // S 键保持 1秒宽容度
        }
    }

    window.addEventListener('play', handleStateChange, true);
    window.addEventListener('pause', handleStateChange, true);

})();
