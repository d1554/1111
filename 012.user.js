// ==UserScript==
// @name         视频事件监测仪 (调试专用)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  不执行功能，只在屏幕右上角显示检测到的 播放/暂停 事件，用于排查问题
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. 创建一个可以在屏幕上一直显示的调试控制台 ---
    const consoleBox = document.createElement('div');
    consoleBox.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 300px;
        height: 400px;
        background: rgba(0, 0, 0, 0.9);
        color: #0f0;
        font-family: monospace;
        font-size: 12px;
        padding: 10px;
        z-index: 999999;
        overflow-y: auto;
        pointer-events: none; /* 让它不挡鼠标点击 */
        border: 1px solid #fff;
    `;
    // 初始提示
    consoleBox.innerHTML = '<div style="border-bottom:1px solid #666; padding-bottom:5px; margin-bottom:5px;">🔍 事件监测仪已启动...</div>';
    document.body.appendChild(consoleBox);

    // 辅助函数：写日志
    function log(msg, color = '#0f0') {
        const time = new Date().toLocaleTimeString().split(' ')[0]; // 只显示时分秒
        const line = document.createElement('div');
        line.innerHTML = `<span style="color:#666">[${time}]</span> <span style="color:${color}">${msg}</span>`;
        consoleBox.insertBefore(line, consoleBox.children[1]); // 插在最上面
        
        // 保持日志不超过 50 行，防止卡顿
        if (consoleBox.children.length > 50) {
            consoleBox.lastChild.remove();
        }
    }

    // --- 2. 暴力寻找视频并绑定监听 ---
    let currentVideo = null;

    function checkVideo() {
        const video = document.querySelector('video');
        
        if (!video) {
            // 如果还没找到视频，或者视频没了
            if (currentVideo) {
                log("❌ 视频元素丢失", "red");
                currentVideo = null;
            }
            return;
        }

        // 如果找到了新视频（或者刚加载完）
        if (video !== currentVideo) {
            log("✅ 捕捉到新的视频元素！", "yellow");
            currentVideo = video;
            
            // 绑定基础事件
            bindEvents(video);
        }
    }

    // --- 3. 监听事件核心 ---
    function bindEvents(video) {
        // 监听 播放
        video.addEventListener('play', () => {
            log("▶️ 触发 PLAY (开始播放)", "#00ff00");
        });

        // 监听 暂停
        video.addEventListener('pause', () => {
            log("⏸️ 触发 PAUSE (暂停)", "#ff5555");
        });

        // 监听 进度条拖动 (Seeking)
        // 很多时候拖动也会触发 pause/play，我们要看清楚
        video.addEventListener('seeking', () => {
            log("⏩ 正在拖动进度条 (Seeking)", "#aaa");
        });
        
        // 监听 等待缓冲 (Waiting)
        video.addEventListener('waiting', () => {
            log("⏳ 缓冲中 (Waiting)", "orange");
        });
    }

    // 每 500 毫秒扫描一次页面，确保能抓到视频
    setInterval(checkVideo, 500);

})();
