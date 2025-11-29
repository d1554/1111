// ==UserScript==
// @name         S键映射 (v33 防拖动误触版)
// @namespace    http://tampermonkey.net/
// @version      33.0
// @description  手动滑动进度条不再触发S键；保留按2下立即触发S、5秒内按第3下触发H
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
            // 小巧精简的 UI
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
        }, 800);
    }

    // --- 2. 键盘发射器 ---
    function triggerKey(keyName) {
        let keyChar, keyCode;
        
        if (keyName === 's') {
            keyChar = 's'; keyCode = 83;
            console.log("🚀 触发 S 键");
        } else if (keyName === 'h') {
            keyChar = 'h'; keyCode = 72;
            console.log("🚀 触发 H 键");
            showCounter("H", "#3388ff");
        }

        const eventConfig = {
            key: keyChar, code: 'Key' + keyChar.toUpperCase(),
            keyCode: keyCode, which: keyCode,
            bubbles: true, cancelable: true, view: window
        };
        
        const targets = [document.activeElement, document.body, document.documentElement];
        targets.forEach(t => {
            if(t) {
                try {
                    t.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
                    t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
                } catch(e) {}
            }
        });
    }

    // --- 3. 核心逻辑 ---
    let clickCount = 0;
    let resetTimer = null;
    let lastTriggerTime = 0;
    let lastClickTime = 0;
    
    // --- ！！！新增：进度条锁！！！ ---
    let isSeeking = false; 

    // 参数设置
    const DOUBLE_CLICK_TOLERANCE = 500;  // 1->2 间隔
    const TRIPLE_CLICK_TOLERANCE = 5000; // 2->3 间隔
    const COOL_DOWN = 2000;

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;

        // --- A. 侦测拖动行为 ---
        if (e.type === 'seeking') {
            isSeeking = true;
            // console.log("🔒 正在拖动进度条，锁定脚本");
            return;
        }
        if (e.type === 'seeked') {
            // 拖动结束后，延迟 600ms 再解锁
            // 防止松手那一瞬间的 Play 事件误触
            setTimeout(() => {
                isSeeking = false;
                // console.log("🔓 拖动结束，解锁");
            }, 600);
            return;
        }

        // 只有 play 和 pause 往下走
        if (e.type !== 'play' && e.type !== 'pause') return;

        // --- B. 检查锁 ---
        // 如果正在拖动，或者刚刚拖动完，直接忽略本次点击
        if (isSeeking) {
            return;
        }

        // --- C. 正常的连击判定逻辑 ---
        const now = Date.now();
        const diff = now - lastClickTime;
        lastClickTime = now;

        // 状态 0: 初始
        if (clickCount === 0) {
            if (now - lastTriggerTime < COOL_DOWN) return;
            
            clickCount = 1;
            showCounter("1", "rgba(255,255,255,0.6)");
            
            if (resetTimer) clearTimeout(resetTimer);
            resetTimer = setTimeout(() => { clickCount = 0; }, DOUBLE_CLICK_TOLERANCE);
            return;
        }

        // 状态 1: 等待第2击
        if (clickCount === 1) {
            if (diff > DOUBLE_CLICK_TOLERANCE) { // 超时了，算新的一轮第1击
                clickCount = 1; 
                showCounter("1", "rgba(255,255,255,0.6)");
                if (resetTimer) clearTimeout(resetTimer);
                resetTimer = setTimeout(() => { clickCount = 0; }, DOUBLE_CLICK_TOLERANCE);
                return;
            }

            // 成功双击 -> 触发 S
            clickCount = 2;
            showCounter("2", "rgba(255,255,255,0.8)");
            triggerKey('s');

            // 开启5秒待机等待 H
            if (resetTimer) clearTimeout(resetTimer);
            resetTimer = setTimeout(() => {
                clickCount = 0;
            }, TRIPLE_CLICK_TOLERANCE);
            return;
        }

        // 状态 2: 等待第3击
        if (clickCount === 2) {
            // 触发 H
            clickCount = 3;
            triggerKey('h');
            
            clickCount = 0;
            lastTriggerTime = now;
            if (resetTimer) clearTimeout(resetTimer);
        }
    }

    // 监听 seeking 和 seeked 来判断是否在拖动
    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);
    window.addEventListener('seeking', globalHandler, true);
    window.addEventListener('seeked', globalHandler, true);

})();
