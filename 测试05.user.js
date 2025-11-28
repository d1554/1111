// ==UserScript==
// @name         安卓按键强制捕获 (键盘锁模式)
// @namespace    http://tampermonkey.net/
// @version      8.0
// @description  利用 Keyboard Lock API 和全屏模式，强制浏览器独占所有按键
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    //Configs: 你的按钮选择器
    const NEXT_SELECTOR = '.你的下一首按钮选择器'; 
    const PREV_SELECTOR = '.你的上一首按钮选择器';

    // 创建控制面板
    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;top:10px;left:10px;z-index:999999;background:rgba(0,0,0,0.8);color:#0f0;padding:10px;border-radius:8px;font-size:14px;max-width:300px;';
    panel.innerHTML = `
        <div id="logbox">准备就绪...</div>
        <button id="startBtn" style="margin-top:10px;padding:5px 15px;background:#f00;color:#fff;border:none;border-radius:4px;">1. 点击这里进入全屏</button>
    `;
    document.body.appendChild(panel);

    const logBox = document.getElementById('logbox');
    const startBtn = document.getElementById('startBtn');

    function log(msg) {
        logBox.innerHTML = msg + '<br>' + logBox.innerHTML;
        console.log('[KeyLock]', msg);
    }

    // 点击按钮逻辑
    startBtn.onclick = async () => {
        try {
            // 1. 请求全屏 (安卓浏览器通常只在全屏下才允许锁定键盘)
            await document.documentElement.requestFullscreen();
            log("✅ 已进入全屏");
            startBtn.style.display = 'none'; // 隐藏按钮

            // 2. 启动音频 (保活，确保后台播放特性被激活)
            startAudioKeepAlive();

            // 3. 请求键盘锁 (核心步骤)
            if ('keyboard' in navigator && 'lock' in navigator.keyboard) {
                // 尝试锁定所有常见的媒体键
                const keysToLock = [
                    "MediaTrackNext", 
                    "MediaTrackPrevious", 
                    "MediaPlayPause", 
                    "ArrowRight", 
                    "ArrowLeft",
                    "VolumeUp",
                    "VolumeDown"
                ];
                
                await navigator.keyboard.lock(keysToLock);
                log("🔒 键盘锁已激活！浏览器强制独占按键。");
                log("👉 现在尝试按你的物理按键");
            } else {
                log("⚠️ 你的浏览器不支持 Keyboard Lock API");
                log("尝试回退到普通监听...");
            }

        } catch (err) {
            log("❌ 启动失败: " + err.message);
        }
    };

    // 监听按键
    document.addEventListener('keydown', (e) => {
        log(`捕获: ${e.code} / ${e.key} / ${e.keyCode}`);
        
        // 匹配逻辑
        if (e.code === 'MediaTrackNext' || e.key === 'MediaTrackNext' || e.keyCode === 176) {
            triggerClick(NEXT_SELECTOR, '下一首');
        }
        else if (e.code === 'MediaTrackPrevious' || e.key === 'MediaTrackPrevious' || e.keyCode === 177) {
            triggerClick(PREV_SELECTOR, '上一首');
        }
    });

    // 简单的音频保活
    function startAudioKeepAlive() {
        const audio = new Audio('https://raw.githubusercontent.com/anars/blank-audio/master/10-seconds-of-silence.mp3');
        audio.loop = true;
        audio.volume = 0.05;
        audio.play().then(() => log("🔊 后台音频已启动")).catch(e => log("音频启动失败"));
    }

    function triggerClick(sel, action) {
        const btn = document.querySelector(sel);
        if(btn) {
            btn.click();
            log(`✅ 点击: ${action}`);
        } else {
            log(`❌ 找不到按钮: ${sel}`);
        }
    }

})();
