// ==UserScript==
// @name         车机手势切歌 (最终完美版)
// @namespace    http://tampermonkey.net/
// @version      Final
// @description  双指下滑=下一首，双指上滑=上一首。屏幕会有视觉反馈。
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 🔴🔴🔴 这里填你的按钮 CSS 🔴🔴🔴
    const NEXT_SELECTOR = '.你的下一首按钮代码'; 
    const PREV_SELECTOR = '.你的上一首按钮代码';
    // 🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴

    // 视觉反馈：在屏幕上显示大图标
    function showIcon(iconChar) {
        const div = document.createElement('div');
        div.innerText = iconChar;
        div.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            font-size: 100px; color: white; background: rgba(0,0,0,0.6);
            border-radius: 20px; padding: 20px; z-index: 999999; pointer-events: none;
            text-shadow: 0 0 10px black; opacity: 0; transition: opacity 0.2s;
        `;
        document.body.appendChild(div);
        
        // 动画效果
        requestAnimationFrame(() => { div.style.opacity = 1; });
        setTimeout(() => {
            div.style.opacity = 0;
            setTimeout(() => div.remove(), 200);
        }, 600);
    }

    function trigger(selector, icon) {
        const btn = document.querySelector(selector);
        if (btn) {
            btn.click();
            showIcon(icon); // 显示大图标反馈
        } else {
            showIcon("❌");
            console.log("未找到按钮: " + selector);
        }
    }

    // === 手势逻辑 ===
    let startY = 0;
    
    document.addEventListener('touchstart', (e) => {
        // 仅响应双指触摸 (防止误触滚动)
        if (e.touches.length === 2) {
            startY = e.touches[0].clientY;
        }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (startY === 0) return;
        
        // 获取滑动距离
        let moveY = e.changedTouches[0].clientY - startY;
        
        // 阈值设为 50px
        if (moveY > 50) {
            trigger(NEXT_SELECTOR, "⏭️"); // 下滑 -> 下一首
        } else if (moveY < -50) {
            trigger(PREV_SELECTOR, "⏮️"); // 上滑 -> 上一首
        }
        
        startY = 0;
    }, { passive: false });

    console.log("✅ 手势脚本已启动：请尝试双指上下滑动");
})();
