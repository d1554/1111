// ==UserScript==
// @name         S键映射 (V46 防手势装甲版)
// @namespace    http://tampermonkey.net/
// @version      46.0
// @description  通过CSS强制禁用视频的默认触控手势(放大/选字)，解决快速三连击被浏览器拦截的问题
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. CSS 强力注入 (The Armor) ---
    // 这是解决"快速点击无效"的核心。
    // 强制告诉浏览器：在这个视频上，别给我整双击放大、三击选字那些花里胡哨的。
    function injectAntiGestureStyle() {
        const css = `
            video, audio, .html5-video-player {
                /* 禁止双击缩放，消除300ms延迟 */
                touch-action: manipulation !important; 
                /* 禁止长按/三击选中文字 */
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                /* 消除高亮色块 */
                -webkit-tap-highlight-color: transparent !important;
                outline: none !important;
            }
        `;
        const style = document.createElement('style');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }
    injectAntiGestureStyle();

    // --- 2. 视觉提示 (UI) ---
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

    // --- 3. 焦点夺回与按键发送 ---
    function fireKey(keyName, originalTarget) {
        // 延迟可以适当缩短了，因为CSS禁用了手势，浏览器反应会变快
        setTimeout(() => {
            const target = originalTarget || document.body;

            // 1. 模拟鼠标按下，再次确保焦点归位
            try {
                target.dispatchEvent(new MouseEvent('mousedown', {
                    bubbles: true, cancelable: true, view: window
                }));
                if (target.focus) target.focus({preventScroll: true});
            } catch(e) {}

            // 2. 构造按键
            const key = keyName.toLowerCase();
            const keyCode = keyName.toUpperCase().charCodeAt(0);
            const charCode = keyName.charCodeAt(0);

            const eventSequence = [
                { type: 'keydown',  k: keyCode, c: 0 },
                { type: 'keypress', k: 0,       c: charCode },
                { type: 'keyup',    k: keyCode, c: 0 }
            ];

            // 3. 发送给目标和document
            [target, document].forEach(t => {
                eventSequence.forEach(evtInfo => {
                    try {
                        const e = new KeyboardEvent(evtInfo.type, {
                            key: key, 
                            code: 'Key' + keyName.toUpperCase(),
                            keyCode: evtInfo.k, 
                            which: evtInfo.k || evtInfo.c,
                            bubbles: true, cancelable: true, view: window
                        });
                        Object.defineProperty(e, 'keyCode', { get: () => evtInfo.k });
                        Object.defineProperty(e, 'charCode', { get: () => evtInfo.c });
                        Object.defineProperty(e, 'which',    { get: () => evtInfo.k || evtInfo.c });
                        t.dispatchEvent(e);
                    } catch(err) {}
                });
            });
        }, 300); // 300ms 延迟
    }

    // --- 4. 计数逻辑 (保持不变) ---
    let clicks = 0;
    let clickTimer = null;
    let lastTarget = null;
    let safetyLock = false;

    function handleStateChange(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;
        if (target.ended || target.seeking) return;
        
        if (lastTarget && lastTarget !== target) {
            clicks = 0;
            clearTimeout(clickTimer);
        }
        lastTarget = target;

        if (clickTimer) clearTimeout(clickTimer);
        if (safetyLock) return;

        clicks++;
        
        // UI 反馈
        if (clicks === 1) showTip("1", "rgba(255,255,255,0.5)");
        if (clicks === 2) showTip("2", "rgba(255,255,255,0.8)");
        if (clicks === 3) showTip("3", "#0f0");

        if (clicks >= 3) {
            // 三连击 H
            clicks = 0;
            safetyLock = true; // 上锁
            
            showTip("H", "#3388ff");
            fireKey('h', target);
            
            // 0.5秒后解锁，防止后续操作干扰
            setTimeout(() => { safetyLock = false; }, 500);

        } else {
            // S 键倒计时
            clickTimer = setTimeout(() => {
                if (clicks === 2) {
                    showTip("S", "#fff");
                    fireKey('s', target);
                }
                clicks = 0;
            }, 1000);
        }
    }

    window.addEventListener('play', handleStateChange, true);
    window.addEventListener('pause', handleStateChange, true);

})();
