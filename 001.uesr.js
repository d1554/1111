// ==UserScript==
// @name         安卓画中画 (PiP) 按键劫持测试
// @namespace    http://tampermonkey.net/
// @version      9.0
// @description  尝试进入画中画模式，利用悬浮窗的高优先级捕获按键
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 🔴 你的按钮选择器
    const NEXT_SELECTOR = '.你的下一首按钮'; 
    const PREV_SELECTOR = '.你的上一首按钮';

    // UI
    const btn = document.createElement('button');
    btn.innerText = "📺 点击启动画中画劫持";
    btn.style.cssText = "position:fixed; top:10px; right:10px; z-index:999999; background:red; color:white; padding:10px; border:none; border-radius:5px;";
    document.body.appendChild(btn);

    const logBox = document.createElement('div');
    logBox.style.cssText = "position:fixed; top:60px; right:10px; z-index:999999; background:rgba(0,0,0,0.8); color:#0f0; font-size:12px; max-width:200px;";
    document.body.appendChild(logBox);

    function log(msg) {
        logBox.innerHTML = msg + "<br>" + logBox.innerHTML;
    }

    // 创建视频
    const video = document.createElement('video');
    video.src = 'https://www.w3schools.com/html/mov_bbb.mp4'; // 使用真实视频以确保触发
    video.loop = true;
    video.muted = false; // 必须有声音
    video.style.opacity = 0; 
    video.style.position = 'fixed';
    document.body.appendChild(video);

    // 核心逻辑
    btn.onclick = async () => {
        try {
            await video.play();
            log("1. 视频已播放");

            if (video.requestPictureInPicture) {
                await video.requestPictureInPicture();
                log("✅ 已进入画中画模式！");
                log("👉 请现在按方向盘/耳机键测试");
            } else {
                log("❌ 此浏览器不支持画中画 API");
            }
        } catch (e) {
            log("❌ 启动失败: " + e.message);
        }
    };

    // 监听 MediaSession (在 PiP 模式下可能会生效)
    if ('mediaSession' in navigator) {
        const handler = (details) => {
            log(`捕获动作: ${details.action}`);
            if (details.action === 'nexttrack') document.querySelector(NEXT_SELECTOR)?.click();
            if (details.action === 'previoustrack') document.querySelector(PREV_SELECTOR)?.click();
        };
        navigator.mediaSession.setActionHandler('nexttrack', handler);
        navigator.mediaSession.setActionHandler('previoustrack', handler);
    }

    // 监听键盘事件 (同时监听 keydown 和 keyup)
    // 有时候 keydown 被吞了，但 keyup 会漏网
    ['keydown', 'keyup'].forEach(eventType => {
        document.addEventListener(eventType, (e) => {
            // 过滤掉常规按键，只看媒体键
            if (e.keyCode === 176 || e.key === 'MediaTrackNext' || e.code === 'MediaTrackNext') {
                log(`⚡ ${eventType} 捕获下一首`);
                if (eventType === 'keyup') document.querySelector(NEXT_SELECTOR)?.click();
            }
        });
    });

})();
