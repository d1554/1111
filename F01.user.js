// ==UserScript==
// @name         S键映射 (V48 极速触控版)
// @namespace    http://tampermonkey.net/
// @version      48.0
// @description  使用原生 touch 事件替代 click，无论手速多快都能精准捕捉；防滑动误触；解决安卓吞事件问题
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. CSS 防手势 (依然保留，辅助优化手感) ---
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

    // --- 3. 强力按键发射器 (保持 V47 的焦点夺回逻辑) ---
    function fireKey(keyName, originalTarget) {
        let target = originalTarget;
        // 尝试修正目标
        if (target && !target.nodeName.match(/VIDEO|AUDIO/)) {
            const innerVideo = target.querySelector('video, audio');
            if (innerVideo) target = innerVideo;
        }
        if (!target) target = document.body;

        // 焦点夺回
        try {
            // 模拟鼠标按下，骗取浏览器焦点
            target.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true, cancelable: true, view: window
            }));
            if (target.focus) target.focus({preventScroll: true});
        } catch(e) {}

        const key = keyName.toLowerCase();
        const code = 'Key' + keyName.toUpperCase();
        const keyCode = keyName.toUpperCase().charCodeAt(0);
        const charCode = keyName.charCodeAt(0);

        const eventSequence = [
            { type: 'keydown',  k: keyCode, c: 0 },
            { type: 'keypress', k: 0,       c: charCode },
            { type: 'keyup',    k: keyCode, c: 0 }
        ];

        // 双管齐下
        [target, document].forEach(t => {
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
    }

    // --- 4. 触控监听引擎 (Touch Engine) ---
    // 这是核心改动：不再听 click，直接听手指动作
    
    let clicks = 0;
    let clickTimer = null;
    let safetyLock = false;
    
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    // 手指按下：记录坐标
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) return; // 忽略多指操作
        startX = e.touches[0].screenX;
        startY = e.touches[0].screenY;
        startTime = Date.now();
    }, true);

    // 手指抬起：判断是否为点击
    document.addEventListener('touchend', (e) => {
        // e.changedTouches 包含抬起的那根手指的信息
        if (e.changedTouches.length === 0) return;
        
        const endX = e.changedTouches[0].screenX;
        const endY = e.changedTouches[0].screenY;
        
        // 计算移动距离
        const moveX = Math.abs(endX - startX);
        const moveY = Math.abs(endY - startY);
        
        // 如果移动超过 15px，认为是滑动/滚屏，不计入点击
        if (moveX > 15 || moveY > 15) return;

        // 智能区域判断：只在视频相关区域响应
        let target = e.target;
        let isVideoArea = false;
        
        // 向上查找 4 层，看是不是在视频里
        let current = target;
        for(let i=0; i<4; i++) {
            if (current && (current.nodeName === 'VIDEO' || current.nodeName === 'AUDIO' || current.querySelector('video'))) {
                isVideoArea = true;
                break;
            }
            if(current) current = current.parentElement;
        }
        
        if (!isVideoArea) return;

        // --- 确认是有效点击，开始计数 ---
        if (safetyLock) return;
        
        clicks++;

        // 视觉反馈
        if (clicks === 1) showTip("1", "rgba(255,255,255,0.5)");
        if (clicks === 2) showTip("2", "rgba(255,255,255,0.8)");
        if (clicks === 3) showTip("3", "#0f0");

        if (clickTimer) clearTimeout(clickTimer);

        if (clicks >= 3) {
            // === 三连击 H ===
            clicks = 0;
            safetyLock = true;
            
            showTip("H", "#3388ff");
            
            // 立即发射
            setTimeout(() => {
                fireKey('h', target);
                safetyLock = false;
            }, 50); // 触控版可以响应更快，50ms即可

        } else {
            // === 双击 S 倒计时 ===
            clickTimer = setTimeout(() => {
                if (clicks === 2) {
                    showTip("S", "#fff");
                    fireKey('s', target);
                }
                clicks = 0;
            }, 600); // 稍微加快节奏
        }

    }, true); // 捕获模式

})();
