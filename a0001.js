// ==UserScript==
// @name         抖音精选 - 伪装宽度 & 屏蔽悬停自动播放
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  伪装浏览器宽度为 760px，并屏蔽列表页鼠标滑过卡片时的视频自动播放
// @author       Your Name
// @match        https://www.douyin.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const injectScript = document.createElement('script');

    injectScript.textContent = `
        (function() {
            // ==========================================
            // 功能 1：伪装窗口宽度为 760px
            // ==========================================
            const FAKE_WIDTH = 760;

            Object.defineProperty(window, 'innerWidth', { get: () => FAKE_WIDTH, configurable: true });
            Object.defineProperty(window, 'outerWidth', { get: () => FAKE_WIDTH, configurable: true });
            Object.defineProperty(window.screen, 'width', { get: () => FAKE_WIDTH, configurable: true });
            Object.defineProperty(window.screen, 'availWidth', { get: () => FAKE_WIDTH, configurable: true });

            const originalClientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth').get;
            Object.defineProperty(Element.prototype, 'clientWidth', {
                get: function() {
                    if (this === document.documentElement || this === document.body) {
                        return FAKE_WIDTH;
                    }
                    return originalClientWidth.call(this);
                },
                configurable: true
            });

            console.log("🛠️ [油猴插件] 成功：宽度已伪装为 " + FAKE_WIDTH + "px");

            // ==========================================
            // 功能 2：屏蔽卡片鼠标悬停自动播放
            // ==========================================
            // 监听所有的鼠标滑动事件
            ['mouseover', 'mouseenter', 'mousemove'].forEach(eventName => {
                window.addEventListener(eventName, function(e) {
                    if (e.target && e.target.closest) {
                        // 利用您提供的 HTML 结构中的特征类名进行匹配
                        const isVideoCard = e.target.closest('.videoImage') ||
                                            e.target.closest('img[class*="discover-video-card-img"]');

                        if (isVideoCard) {
                            // 发现鼠标悬停在卡片上，立即阻断事件冒泡
                            // 这样抖音的 React 框架就接收不到 hover 信号，从而不会触发播放
                            e.stopPropagation();
                        }
                    }
                }, true); // true 表示在“捕获阶段”拦截，确保我们比抖音自带的脚本先拿到事件
            });

            console.log("🛠️ [油猴插件] 成功：已屏蔽卡片悬停自动播放");
        })();
    `;

    if (document.documentElement) {
        document.documentElement.appendChild(injectScript);
        injectScript.remove();
    }
})();
