// ==UserScript==
// @name         S键映射 (极速响应版)
// @namespace    http://tampermonkey.net/
// @version      23.0
// @description  移除所有速度限制，支持极速双击；只要500ms内有两次操作立刻触发
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- UI ---
    let toast = null;
    let hideTimer;

    function showMsg(text, isTrigger = false) {
        if (!toast || !document.body.contains(toast)) {
            toast = document.createElement('div');
            toast.style.cssText = 'position:fixed; top:20%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.8); color:#fff; font-size:16px; padding:10px 20px; border-radius:50px; display:none; z-index:999999; pointer-events:none; font-weight:bold; transition:all 0.1s;';
            document.body.appendChild(toast);
        }
        
        toast.innerHTML = text;
        toast.style.background = isTrigger ? 'rgba(220, 20, 60, 0.9)' : 'rgba(0, 0, 0, 0.8)';
        toast.style.transform = isTrigger ? 'translate(-50%,-50%) scale(1.1)' : 'translate(-50%,-50%) scale(1)';
        toast.style.display = 'block';
        
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            toast.style.display = 'none';
        }, 800);
    }

    // --- 触发 S ---
    function triggerS() {
        console.log("🚀 极速触发 S 键");
        showMsg("⚡ <b>S 键已触发</b>", true);

        const eventConfig = {
            key: 's', code: 'KeyS', keyCode: 83, which: 83,
            bubbles: true, cancelable: true, view: window
        };

        const targets = [
            document.activeElement,
            document.querySelector('video'),
            document.body
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

    // --- 核心逻辑 (计数器模式) ---
    let clickCount = 0;
    let resetTimer = null;
    let currentVideo = null;

    function handleEvent(e) {
        // 忽略进度条拖动
        if (e.target.seeking) return;

        // 1. 清除重置计时器 (说明你在连按中)
        if (resetTimer) clearTimeout(resetTimer);

        // 2. 计数 +1
        clickCount++;

        // 3. 判断
        if (clickCount >= 2) {
            // --- 达成双击！---
            triggerS();
            // 触发后立即归零，防止三连击导致触发两次
            clickCount = 0; 
        } else {
            // --- 第一次点击 ---
            // 开启一个 500ms 的窗口。如果 500ms 内没有第二下，就重置。
            // 这里的 500 是“最长等待时间”，不是“最短限制”。你按多快都行。
            resetTimer = setTimeout(() => {
                clickCount = 0;
                // showMsg("超时 (单击)"); // 调试用，平时不显示
            }, 500); 
        }
    }

    // --- 监工：死循环挂载 ---
    function watchdog() {
        const media = document.querySelector('video') || document.querySelector('audio');
        if (!media || media === currentVideo) return;

        console.log("✅ 挂载新视频");
        showMsg("脚本已就绪");
        
        // 清理旧的
        if (currentVideo) {
            currentVideo.removeEventListener('play', handleEvent);
            currentVideo.removeEventListener('pause', handleEvent);
        }

        // 挂载新的
        media.addEventListener('play', handleEvent);
        media.addEventListener('pause', handleEvent);
        
        currentVideo = media;
    }

    // 0.5秒检查一次视频元素是否更换
    setInterval(watchdog, 500);

})();
