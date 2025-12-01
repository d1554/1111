// ==UserScript==
// @name         S键映射 (V49 慢动作模仿版)
// @namespace    http://tampermonkey.net/
// @version      49.0
// @description  检测到快速三连击后，脚本接管并每隔0.5秒模拟一次点击，最后触发H键，完美模拟手动操作
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. CSS 防手势 (保留，保证你输入顺畅) ---
    function injectAntiGestureStyle() {
        const css = `
            video, audio, .html5-video-player, .video-wrapper {
                touch-action: manipulation !important; 
                -webkit-user-select: none !important;
                user-select: none !important;
                -webkit-tap-highlight-color: transparent !important;
                outline: none !important;
            }
        `;
        const style = document.createElement('style');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }
    injectAntiGestureStyle();

    // --- 2. 视觉提示 ---
    let tipBox = null;
    function showTip(text, color = '#fff') {
        if (!tipBox) {
            tipBox = document.createElement('div');
            tipBox.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                font-size: 40px; font-weight: bold; color: #fff;
                text-shadow: 0 0 5px #000; pointer-events: none; z-index: 999999;
                transition: opacity 0.2s; opacity: 0;
            `;
            (document.body || document.documentElement).appendChild(tipBox);
        }
        tipBox.innerText = text;
        tipBox.style.color = color;
        tipBox.style.opacity = '1';
        setTimeout(() => { tipBox.style.opacity = '0'; }, 400); // 稍微快点消失
    }

    // --- 3. 模拟单次物理点击 ---
    function simulatePhysicalClick(target) {
        try {
            // 模拟完整的一套：按下 -> 抬起 -> 点击
            const opts = { bubbles: true, cancelable: true, view: window };
            target.dispatchEvent(new MouseEvent('mousedown', opts));
            target.dispatchEvent(new MouseEvent('mouseup', opts));
            target.dispatchEvent(new MouseEvent('click', opts));
            
            // 顺便聚焦
            if (target.focus) target.focus({preventScroll: true});
        } catch(e) {}
    }

    // --- 4. 按键发射器 ---
    function fireHKey(originalTarget) {
        let target = originalTarget || document.body;
        const keyName = 'h';
        const keyCode = 72;
        const charCode = 104;

        const eventSequence = [
            { type: 'keydown',  k: keyCode, c: 0 },
            { type: 'keypress', k: 0,       c: charCode },
            { type: 'keyup',    k: keyCode, c: 0 }
        ];

        [target, document].forEach(t => {
            eventSequence.forEach(evtInfo => {
                try {
                    const e = new KeyboardEvent(evtInfo.type, {
                        key: keyName, 
                        code: 'KeyH',
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
    }

    function fireSKey(target) {
        // S键还是保持简单直接触发，因为它本来就是好的
        const keyCode = 83;
        const charCode = 115;
        const e = new KeyboardEvent('keydown', { key: 's', keyCode: 83, which: 83, bubbles: true });
        Object.defineProperty(e, 'keyCode', { get: () => 83 });
        (target || document.body).dispatchEvent(e);
        
        // 补全 keyup
        const eUp = new KeyboardEvent('keyup', { key: 's', keyCode: 83, which: 83, bubbles: true });
        Object.defineProperty(eUp, 'keyCode', { get: () => 83 });
        (target || document.body).dispatchEvent(eUp);
    }

    // --- 5. 慢动作执行引擎 ---
    function runSlowMotionSequence(target) {
        // 第一下模拟点击 (立即)
        showTip("模拟 1...", "#aaa");
        simulatePhysicalClick(target);

        // 第二下模拟点击 (0.5秒后)
        setTimeout(() => {
            showTip("模拟 2...", "#ccc");
            simulatePhysicalClick(target);
        }, 500);

        // 第三下模拟点击 + 发射 H 键 (1.0秒后)
        setTimeout(() => {
            showTip("发射 H !!!", "#3388ff");
            simulatePhysicalClick(target); // 先点
            fireHKey(target);             // 后发
        }, 1000);
    }


    // --- 6. 触控监听 ---
    let clicks = 0;
    let clickTimer = null;
    let safetyLock = false; // 锁住输入，防止执行期间再次触发
    
    let startX = 0, startY = 0;

    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) return;
        startX = e.touches[0].screenX;
        startY = e.touches[0].screenY;
    }, true);

    document.addEventListener('touchend', (e) => {
        if (safetyLock) return; // 执行慢动作期间，忽略新的点击
        if (e.changedTouches.length === 0) return;
        
        const moveX = Math.abs(e.changedTouches[0].screenX - startX);
        const moveY = Math.abs(e.changedTouches[0].screenY - startY);
        if (moveX > 15 || moveY > 15) return;

        // 目标判断
        let target = e.target;
        let isVideoArea = false;
        let current = target;
        for(let i=0; i<4; i++) {
            if (current && (current.nodeName === 'VIDEO' || current.nodeName === 'AUDIO' || current.querySelector('video'))) {
                isVideoArea = true;
                break;
            }
            if(current) current = current.parentElement;
        }
        if (!isVideoArea) return;

        // 计数
        clicks++;

        if (clicks === 1) showTip("1", "rgba(255,255,255,0.5)");
        if (clicks === 2) showTip("2", "rgba(255,255,255,0.8)");
        if (clicks === 3) showTip("3", "#0f0");

        if (clickTimer) clearTimeout(clickTimer);

        if (clicks >= 3) {
            // === 触发三连击逻辑 ===
            clicks = 0;
            safetyLock = true; // 上锁！
            
            // 开始执行每隔0.5秒的模拟操作
            runSlowMotionSequence(target);
            
            // 1.5秒后解锁，让用户可以继续操作
            setTimeout(() => { safetyLock = false; }, 1500);

        } else {
            // === 双击 S 倒计时 ===
            clickTimer = setTimeout(() => {
                if (clicks === 2) {
                    showTip("S", "#fff");
                    fireSKey(target);
                }
                clicks = 0;
            }, 600);
        }

    }, true);

})();
