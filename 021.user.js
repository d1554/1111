// ==UserScript==
// @name         S键映射 (0.3秒极速版)
// @namespace    http://tampermonkey.net/
// @version      26.0
// @description  判定时间缩短至300ms，手感极脆，必须快速连按两下才能触发
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- UI 显示 ---
    let toast = null;
    let hideTimer;

    function showMsg(text, isTrigger = false) {
        if (!toast || !document.body.contains(toast)) {
            toast = document.createElement('div');
            toast.style.cssText = 'position:fixed; top:15%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.8); color:#fff; font-size:16px; padding:8px 15px; border-radius:50px; display:none; z-index:2147483647; pointer-events:none; font-weight:bold; white-space:nowrap; transition: transform 0.1s;';
            document.body.appendChild(toast);
        }
        
        toast.innerHTML = text;
        toast.style.backgroundColor = isTrigger ? 'rgba(255, 50, 50, 0.95)' : 'rgba(0, 0, 0, 0.8)';
        toast.style.transform = isTrigger ? 'translate(-50%,-50%) scale(1.1)' : 'translate(-50%,-50%) scale(1)';
        toast.style.display = 'block';
        toast.style.opacity = '1';
        
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.style.display = 'none', 200);
        }, 600); // 提示框消失得也快一点
    }

    // --- 触发 S 键 ---
    function triggerS() {
        console.log("🚀 [0.3s版] 触发 S 键！");
        showMsg("⚡ <b>S</b>", true); // 提示语改短一点，配合极速感

        const eventConfig = {
            key: 's', code: 'KeyS', keyCode: 83, which: 83,
            bubbles: true, cancelable: true, view: window
        };

        const targets = [
            document.activeElement,
            document.body,
            document.documentElement
        ];

        targets.forEach(t => {
            if(t) {
                try {
                    t.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
                    t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
                } catch(e) {}
            }
        });
    }

    // --- 核心逻辑 ---
    let clickCount = 0;
    let resetTimer = null;
    let lastTriggerTime = 0;
    
    // 判定阈值：300毫秒
    const CLICK_WINDOW = 300; 

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;
        if (e.type !== 'play' && e.type !== 'pause') return;

        // 冷却时间：触发一次后，500ms内不再响应，防止连击变成两次触发
        if (Date.now() - lastTriggerTime < 500) return;

        clickCount++;

        // 只要有新操作，立刻清除之前的重置倒计时
        if (resetTimer) clearTimeout(resetTimer);

        if (clickCount >= 2) {
            // --- 0.3s 内达成了第二次点击 ---
            triggerS();
            
            clickCount = 0;
            lastTriggerTime = Date.now();
        } else {
            // --- 第一次点击 ---
            // showMsg("Waiting..."); // 极速版就不显示 Waiting 了，太晃眼，只在触发时显示
            
            // 开启 300ms 倒计时。如果 300ms 后还没第二下，就重置。
            resetTimer = setTimeout(() => {
                clickCount = 0;
            }, CLICK_WINDOW);
        }
    }

    // --- 全局捕获 ---
    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

    console.log(`✅ [S键映射] 极速版 (${CLICK_WINDOW}ms) 已启动`);
    showMsg("✅ 0.3s 极速版");

})();
