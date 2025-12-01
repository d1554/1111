// ==UserScript==
// @name         S键映射 (重生版 V1.0)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  从零重写：基于S键成功的逻辑，统一延迟触发机制，解决安卓焦点丢失问题
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 1. 视觉反馈系统 (Visual Feedback)
    // 简单的视觉反馈，确认脚本是否“听到”了点击
    // ==========================================
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
        
        // 500ms 后消失
        setTimeout(() => { tipBox.style.opacity = '0'; }, 500);
    }

    // ==========================================
    // 2. 核心按键模拟器 (The Trigger)
    // 既然 S 键能用，我们就用最标准的 Firefox 兼容写法
    // ==========================================
    function fireKey(keyName, targetElement) {
        // 再次确认目标存在，如果不存在则回退到 body
        const target = targetElement || document.body;

        // 1. 强制夺取焦点 (关键步骤)
        // 安卓非全屏模式下，焦点常因为点击而跑偏，必须强拉回来
        try {
            if (target.focus) target.focus();
        } catch(e) {}

        const key = keyName.toLowerCase();
        const code = 'Key' + keyName.toUpperCase();
        const keyCode = keyName.toUpperCase().charCodeAt(0); // H=72, S=83
        
        // Firefox keypress 需要 charCode
        const charCode = keyName.charCodeAt(0); // h=104, s=115

        // 构建事件包
        const eventSequence = [
            { type: 'keydown',  k: keyCode, c: 0 },
            { type: 'keypress', k: 0,       c: charCode }, // Firefox 核心
            { type: 'keyup',    k: keyCode, c: 0 }
        ];

        eventSequence.forEach(evtInfo => {
            try {
                const e = new KeyboardEvent(evtInfo.type, {
                    key: key,
                    code: code,
                    keyCode: evtInfo.k, // 标准写法
                    which: evtInfo.k || evtInfo.c,
                    bubbles: true,
                    cancelable: true,
                    view: window
                });

                // Firefox 强力补丁
                Object.defineProperty(e, 'keyCode', { get: () => evtInfo.k });
                Object.defineProperty(e, 'charCode', { get: () => evtInfo.c });
                Object.defineProperty(e, 'which',    { get: () => evtInfo.k || evtInfo.c });

                target.dispatchEvent(e);
            } catch(err) {
                console.error('Trigger Error:', err);
            }
        });
    }

    // ==========================================
    // 3. 逻辑控制器 (Logic Controller)
    // ==========================================
    let clicks = 0;
    let clickTimer = null;
    let lastTarget = null;
    let safetyLock = false; // 防止重复触发

    // 监听 Play 和 Pause 事件
    function handleStateChange(e) {
        const target = e.target;
        
        // 过滤非视频元素
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;

        // 1. 过滤：视频结束或拖拽中
        if (target.ended || target.seeking) return;
        
        // 2. 过滤：切换视频 (重置计数)
        if (lastTarget && lastTarget !== target) {
            clicks = 0;
            clearTimeout(clickTimer);
        }
        lastTarget = target;

        // 3. 计数逻辑
        // 每次点击都清除旧计时器
        if (clickTimer) clearTimeout(clickTimer);
        
        // 冷却锁：如果刚刚触发过大招，忽略后续微小抖动
        if (safetyLock) return;

        clicks++;
        
        // 视觉反馈
        if (clicks === 1) showTip("1", "rgba(255,255,255,0.5)");
        if (clicks === 2) showTip("2", "rgba(255,255,255,0.8)");
        if (clicks === 3) showTip("3", "#0f0");

        // 4. 触发决策 (核心改动)
        if (clicks >= 3) {
            // === 三连击逻辑 ===
            clicks = 0;
            safetyLock = true; // 开启冷却锁

            // 【关键改动】：H 键不再立即触发，而是延迟 300ms
            // 让安卓系统完成它的三击判定，把焦点还给我们
            setTimeout(() => {
                showTip("H", "#3388ff");
                fireKey('h', target);
                safetyLock = false; // 解锁
            }, 300);

        } else {
            // === 一击或二击等待逻辑 ===
            clickTimer = setTimeout(() => {
                if (clicks === 2) {
                    // === 双击逻辑 ===
                    showTip("S", "#fff");
                    fireKey('s', target);
                }
                clicks = 0; // 重置
            }, 1000); // S键 1秒宽容度
        }
    }

    // 使用捕获模式监听，确保最先获取事件
    window.addEventListener('play', handleStateChange, true);
    window.addEventListener('pause', handleStateChange, true);

})();
