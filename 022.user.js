// ==UserScript==
// @name         S键映射 (精准狙击版)
// @namespace    http://tampermonkey.net/
// @version      27.0
// @description  修正切两集的问题：每次触发只发送唯一一次按键信号；0.3秒极速响应
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
        }, 600);
    }

    // --- 触发 S 键 (核心修正) ---
    function triggerS() {
        console.log("🚀 [精准版] 触发 S 键 (单次)");
        showMsg("⚡ <b>S</b>", true);

        const eventConfig = {
            key: 's', code: 'KeyS', keyCode: 83, which: 83,
            bubbles: true, cancelable: true, view: window
        };

        // ！！！修正点！！！
        // 以前是循环发给 body, activeElement, html... 导致发了多次
        // 现在只发给 body，利用冒泡机制传遍全场
        const target = document.body;
        
        if (target) {
            target.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
            target.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
        }
    }

    // --- 逻辑控制 ---
    let clickCount = 0;
    let resetTimer = null;
    let lastTriggerTime = 0;
    
    // 0.3秒极速判定
    const CLICK_WINDOW = 300; 

    function globalHandler(e) {
        const target = e.target;
        // 依然只监听视频标签
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;
        if (e.type !== 'play' && e.type !== 'pause') return;

        // 冷却时间 500ms，防止你手抖按出三下，导致又切一集
        if (Date.now() - lastTriggerTime < 500) return;

        clickCount++;

        if (resetTimer) clearTimeout(resetTimer);

        if (clickCount >= 2) {
            triggerS();
            clickCount = 0;
            lastTriggerTime = Date.now();
        } else {
            // showMsg("Waiting..."); 
            resetTimer = setTimeout(() => {
                clickCount = 0;
            }, CLICK_WINDOW);
        }
    }

    // --- 全局捕获 ---
    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

    console.log("✅ [S键映射] 精准版已启动");
    showMsg("✅ 精准单发版");

})();
