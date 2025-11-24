// ==UserScript==
// @name         视频自动解除静音 (针对播放/暂停操作)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  无论通过点击还是按键触发播放，都会自动取消静音并恢复音量
// @author       Gemini
// @match        https://www.douyin.com/*
// @match        https://live.douyin.com/*
// @match        https://www.bilibili.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log("自动解除静音脚本已启动");

    /**
     * 核心逻辑：尝试解除静音
     * @param {HTMLMediaElement} videoElement
     */
    function unmuteVideo(videoElement) {
        if (videoElement.muted) {
            videoElement.muted = false;
            console.log("已检测到静音，强制解除静音");
        }
        // 如果音量太小（比如0），强制设为 50%
        if (videoElement.volume === 0) {
            videoElement.volume = 0.5;
            console.log("音量为0，强制恢复为 50%");
        }
    }

    // 1. 监听所有媒体元素的 'play' 事件 (捕获阶段，确保能抓到)
    // 这里的 true 表示在捕获阶段触发，这对于动态加载的网页（如抖音）非常有效
    document.addEventListener('play', (e) => {
        if (e.target instanceof HTMLMediaElement) {
            unmuteVideo(e.target);
        }
    }, true);

    // 2. 额外监听空格键 (Space) - 防止有些网页按空格播放时不触发标准的 play 事件
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            // 查找当前页面上所有的 video 标签
            const videos = document.querySelectorAll('video');
            videos.forEach(video => {
                // 只有当前显示的、或者正在播放的才处理
                if (!video.paused || video.getBoundingClientRect().height > 0) {
                    unmuteVideo(video);
                }
            });
        }
    }, true);

})();