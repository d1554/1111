// ==UserScript==
// @name         S键映射 (V34增强版-防手势拦截)
// @namespace    http://tampermonkey.net/
// @version      50.0
// @description  基于V34核心逻辑：监听Play/Pause事件；加入CSS防手势，解决按钮三连击被浏览器拦截的问题；修复Firefox H键
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 0. CSS 防手势 (核心修复：让按钮三连击生效) ---
    // 强制禁用浏览器的缩放和选中手势，确保第3次点击能穿透给播放器
    function injectAntiGestureStyle() {
        const css = `
            /* 针对视频、按钮、播放器容器 */
            video, audio, .html5-video-player, button, .video-wrapper, .control-bar {
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

    // --- 2. 键盘发射器 (升级为 Firefox 兼容版) ---
    // 虽然逻辑回归V34，但按键发送必须用更强的版本，否则Firefox手机版发不出H
    function triggerKey(keyName, originalTarget) {
        
        // 稍微延迟一点点，避开点击冲突
        setTimeout(() => {
            if (keyName === 'h') showCounter("H", "#3388ff");
            
            let keyChar = keyName.toLowerCase();
            let code = 'Key' + keyName.toUpperCase();
            let keyCode = keyName.toUpperCase().charCodeAt(0); 
            let charCode = keyName.charCodeAt(0); // 关键：Firefox需要 charCode

            // 目标：优先发给视频，没有就发给body
            const targets = [originalTarget || document.body, document];

            targets.forEach(t => {
                if(!t) return;
                
                // 1. KeyDown
                try {
                    let e = new KeyboardEvent('keydown', {
                        key: keyChar, code: code, keyCode: keyCode, which: keyCode,
                        bubbles: true, cancelable: true, view: window
                    });
                    Object.defineProperty(e, 'keyCode', { get: () => keyCode });
                    Object.defineProperty(e, 'which', { get: () => keyCode });
                    Object.defineProperty(e, 'charCode', { get: () => 0 });
                    t.dispatchEvent(e);
                } catch(err) {}

                // 2. KeyPress (Firefox H键核心)
                try {
                    let e = new KeyboardEvent('keypress', {
                        key: keyChar, code: code, keyCode: 0, which: charCode,
                        bubbles: true, cancelable: true, view: window
                    });
                    Object.defineProperty(e, 'keyCode', { get: () => 0 });
                    Object.defineProperty(e, 'charCode', { get: () => charCode });
                    Object.defineProperty(e, 'which', { get: () => charCode });
                    t.dispatchEvent(e);
                } catch(err) {}

                // 3. KeyUp
                try {
                    let e = new KeyboardEvent('keyup', {
                        key: keyChar, code: code, keyCode: keyCode, which: keyCode,
                        bubbles: true, cancelable: true, view: window
                    });
                    Object.defineProperty(e, 'keyCode', { get: () => keyCode });
                    t.dispatchEvent(e);
                } catch(err) {}
            });
        }, 50);
    }

    // --- 3. 核心逻辑 (回归 V34) ---
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

        // ---------------- 防误触检测区 ----------------
        // 1. 播放结束检测
        if (target.ended) return; 
        if (target.duration && Math.abs(target.currentTime - target.duration) < 0.5) return;

        // 2. 寻找进度(Seeking)检测
        if (target.seeking) return;
        // --------------------------------------------

        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();

        // 0. 事件防抖
        if (now - lastEventTime < EVENT_DEBOUNCE) return;
        lastEventTime = now;
        
        // 1. 冷却期检查
        if (now - lastTriggerTime < COOL_DOWN) {
            clickCount = 0; 
            return;
        }

        // 2. 切换视频检测
        if (lastTarget && lastTarget !== target) {
            clickCount = 0;
            if (actionTimer) {
                clearTimeout(actionTimer);
                actionTimer = null;
            }
        }
        lastTarget = target; 

        // 3. 清理旧定时器
        if (actionTimer) {
            clearTimeout(actionTimer);
            actionTimer = null;
        }

        // 4. 计数增加
        clickCount++;

        // 5. UI 反馈
        if (clickCount === 1) showCounter("1", "rgba(255,255,255,0.6)");
        if (clickCount === 2) showCounter("2", "rgba(255,255,255,0.8)");
        if (clickCount === 3) showCounter("3", "rgba(255,255,255,1.0)");

        // 6. 触发判定
        if (clickCount >= 3) {
            // 三连击：触发 H
            // 传入 target 以便 triggerKey 能发给正确的视频元素
            triggerKey('h', target);
            clickCount = 0;
            lastTriggerTime = now; 
        } else {
            // 倒计时
            actionTimer = setTimeout(() => {
                if (clickCount === 2) {
                    // 双击：触发 S
                    triggerKey('s', target);
                    lastTriggerTime = Date.now();
                }
                clickCount = 0; 
            }, WAIT_FOR_NEXT_CLICK);
        }
    }

    // 监听 Play/Pause
    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
