// ==UserScript==
// @name         安卓媒体键强制映射 (MediaSession版)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  利用 MediaSession API 和静音音频 Hack，强制安卓浏览器响应耳机/蓝牙的"下一首"按键
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ================= 配置区域 =================
    // 请在这里把引号里的内容换成你目标网站的按钮选择器
    // 如果你不知道怎么找，请截图告诉我页面长什么样
    const NEXT_BTN_SELECTOR = '.btn-next, .icon-next, [title="下一首"]'; 
    const PREV_BTN_SELECTOR = '.btn-prev, .icon-prev, [title="上一首"]';
    // ===========================================

    console.log("👉 媒体键脚本已加载，等待用户交互以激活...");

    // 1. 定义点击逻辑
    function triggerClick(selector, actionName) {
        const btn = document.querySelector(selector);
        if (btn) {
            console.log(`✅ 收到 [${actionName}] 指令，正在点击按钮:`, btn);
            btn.click();
            showToast(`已触发: ${actionName}`); // 简单的屏幕提示
        } else {
            console.error(`❌ 收到 [${actionName}] 指令，但找不到按钮: ${selector}`);
            showToast(`失败: 找不到 ${actionName} 按钮`);
        }
    }

    // 2. 注册 MediaSession 处理器 (核心)
    function setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                triggerClick(NEXT_BTN_SELECTOR, '下一首');
            });
            
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                triggerClick(PREV_BTN_SELECTOR, '上一首');
            });

            // 劫持暂停/播放以防脚本停止
            navigator.mediaSession.setActionHandler('pause', () => console.log('阻止系统暂停'));
            navigator.mediaSession.setActionHandler('play', () => console.log('阻止系统播放'));

            console.log("✅ MediaSession 监听器已注册");
        }
    }

    // 3. 静音音频 Hack (骗过浏览器自动休眠)
    // 安卓浏览器策略：用户不交互（点击页面），不允许脚本自动播放声音。
    // 所以我们需要监听一次点击来启动这个"幽灵播放器"。
    let isActivated = false;

    function activateAudioHack() {
        if (isActivated) return;
        
        // 创建一个极其短的静音音频
        const audio = document.createElement('audio');
        audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAgZGF0YQQAAAAAAA==';
        audio.loop = true;
        audio.volume = 0.01; // 保持微小音量，防止被系统杀后台

        audio.play().then(() => {
            isActivated = true;
            console.log("🔊 静音守卫已启动！现在耳机按键应该生效了。");
            showToast("媒体键控制已激活");

            // 设置通知栏信息
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: "网页控制中",
                    artist: "自定义脚本",
                    album: "Media Control"
                });
            }
            
            setupMediaSession();
        }).catch(err => {
            console.error("启动失败，可能需要再次点击页面:", err);
        });
    }

    // 监听任意点击以激活
    document.addEventListener('click', activateAudioHack, { once: true });
    document.addEventListener('touchstart', activateAudioHack, { once: true });

    // --- 辅助功能：简单的屏幕提示 ---
    function showToast(msg) {
        let div = document.createElement('div');
        div.style.cssText = 'position:fixed;top:10%;left:50%;transform:translate(-50%,0);background:rgba(0,0,0,0.7);color:white;padding:10px 20px;border-radius:20px;z-index:99999;font-size:14px;pointer-events:none;';
        div.innerText = msg;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 2000);
    }

})();
