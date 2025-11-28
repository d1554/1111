// ==UserScript==
// @name         物理按键映射 S 键 (纯净版)
// @namespace    http://tampermonkey.net/
// @version      15.0
// @description  利用物理暂停键的“快速开关”来模拟键盘 S 键。不含任何手势或悬浮球。
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 提示框 (让你知道脚本生效了)
    function showToast(text) {
        let div = document.createElement('div');
        div.style.cssText = 'position:fixed; top:10%; left:50%; transform:translateX(-50%); background:rgba(0,255,0,0.8); color:black; padding:10px 20px; border-radius:5px; z-index:999999; font-weight:bold; font-size:16px; pointer-events:none;';
        div.innerText = text;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 1500);
    }

    // 模拟按下 S 键 (核心)
    function pressSKey() {
        console.log("🚀 触发 S 键映射");
        showToast("已触发：键盘 S");

        // 模拟一套完整的按键动作，适配各种网页的监听方式
        const eventProps = {
            key: 's',
            code: 'KeyS',
            keyCode: 83,
            which: 83,
            bubbles: true,
            cancelable: true,
            view: window
        };

        // 发送 keydown -> keypress -> keyup
        document.dispatchEvent(new KeyboardEvent('keydown', eventProps));
        document.dispatchEvent(new KeyboardEvent('keypress', eventProps));
        document.dispatchEvent(new KeyboardEvent('keyup', eventProps));
        
        // 双保险：同时也发给 body
        document.body.dispatchEvent(new KeyboardEvent('keydown', eventProps));
    }

    // 监听状态变化
    let lastPauseTime = 0;

    function attachListener() {
        const media = document.querySelector('video') || document.querySelector('audio');
        if (!media) return;
        if (media.dataset.physicalMapped) return;

        media.dataset.physicalMapped = "true";
        console.log("✅ 已接管物理暂停键监控");
        showToast("物理键映射已就绪");

        // 1. 记录暂停时间
        media.addEventListener('pause', () => {
            lastPauseTime = Date.now();
        });

        // 2. 检测播放时间
        media.addEventListener('play', () => {
            const now = Date.now();
            const diff = now - lastPauseTime;

            // 如果暂停和播放的间隔在 0.05秒 到 0.8秒 之间
            // 说明是用户在“双击”物理按键
            if (diff > 50 && diff < 800) {
                console.log(`捕获到快速操作 (${diff}ms)，执行切视频...`);
                pressSKey();
            }
        });
    }

    // 每秒检查一次，防止换视频后失效
    setInterval(attachListener, 1000);

})();
