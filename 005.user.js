// ==UserScript==
// @name         状态监听切歌 (暂停+播放=下一首)
// @namespace    http://tampermonkey.net/
// @version      13.0
// @description  不需要键盘事件。只要检测到"快速暂停又播放"，就触发下一首
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 🔴🔴🔴 填入你的下一首按钮选择器 🔴🔴🔴
    const NEXT_SELECTOR = '.你的下一首按钮'; 

    // 提示框
    const toast = (msg) => {
        let div = document.createElement('div');
        div.style.cssText = 'position:fixed;top:20%;left:50%;transform:translate(-50%,0);background:rgba(255,0,0,0.8);color:#fff;padding:10px 20px;border-radius:20px;z-index:999999;font-weight:bold;pointer-events:none;';
        div.innerText = msg;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 1500);
    };

    let lastPauseTime = 0;
    
    // 核心函数：绑定到页面所有的音视频元素上
    function attachListeners() {
        const mediaElements = document.querySelectorAll('video, audio');
        
        mediaElements.forEach(media => {
            if (media.dataset.listening) return; // 避免重复绑定
            media.dataset.listening = "true";
            
            console.log("已接管媒体元素:", media);

            // 1. 监听暂停
            media.addEventListener('pause', () => {
                lastPauseTime = Date.now();
                // console.log("媒体已暂停");
            });

            // 2. 监听播放
            media.addEventListener('play', () => {
                const now = Date.now();
                const diff = now - lastPauseTime;

                // 判定逻辑：
                // 如果这次播放距离上次暂停小于 800毫秒
                // 说明用户是在快速按开关 (双击效果)
                if (diff < 800 && diff > 50) {
                    console.log(`检测到快速切换 (${diff}ms)，判定为切歌指令！`);
                    triggerNext();
                }
            });
        });
    }

    function triggerNext() {
        const btn = document.querySelector(NEXT_SELECTOR);
        if (btn) {
            toast("⏭️ 触发下一首");
            btn.click();
            // 重置时间防止连续触发
            lastPauseTime = 0;
        } else {
            toast("❌ 没找到下一首按钮");
        }
    }

    // 定时检查有没有新的视频加载出来 (防止网页通过AJAX换页后失效)
    setInterval(attachListeners, 2000);
    
    toast("✅ 状态切歌脚本已就绪");
    console.log("脚本启动：请尝试快速按两次暂停键");

})();
