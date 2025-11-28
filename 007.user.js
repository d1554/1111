// ==UserScript==
// @name         S键物理映射 (增强攻坚版)
// @namespace    http://tampermonkey.net/
// @version      16.0
// @description  修正焦点问题，向所有可能的元素发送 S 键，延长判定时间
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // === 1. 屏幕调试面板 (帮你确认脚本是否活着) ===
    const debugBox = document.createElement('div');
    debugBox.style.cssText = 'position:fixed; top:50px; left:10px; background:rgba(0,0,0,0.8); color:#0f0; padding:10px; z-index:999999; font-size:14px; border-radius:8px; pointer-events:none;';
    debugBox.innerHTML = "脚本已启动<br>等待物理暂停/播放...";
    document.body.appendChild(debugBox);

    function log(msg, color = '#0f0') {
        debugBox.innerHTML = `<span style="color:${color}">${msg}</span><br>` + debugBox.innerHTML;
    }

    // === 2. 模拟 S 键 (核心修复：地毯式发送) ===
    function simulateS() {
        log("🚀 正在发射 S 键信号...", "yellow");
        
        const eventObj = {
            key: 's',
            code: 'KeyS',
            keyCode: 83,
            which: 83,
            bubbles: true,      // 必须冒泡
            cancelable: true,
            composed: true,
            view: window
        };

        // 目标列表：视频本身、视频的上一级容器、文档主体
        const video = document.querySelector('video') || document.querySelector('audio');
        const targets = [
            video, 
            video ? video.parentElement : null, 
            document.activeElement, 
            document.body, 
            document.documentElement
        ];

        // 1. 先尝试强制聚焦到视频
        if(video) {
            video.focus(); 
            // 有些网站需要 click 一下才能聚焦
            // video.click(); // 如果会触发暂停就注释掉这行
        }

        // 2. 循环向所有目标发送 keydown/keypress/keyup
        let successCount = 0;
        targets.forEach(target => {
            if (!target) return;
            try {
                target.dispatchEvent(new KeyboardEvent('keydown', eventObj));
                target.dispatchEvent(new KeyboardEvent('keypress', eventObj));
                target.dispatchEvent(new KeyboardEvent('keyup', eventObj));
                successCount++;
            } catch (e) { console.error(e); }
        });

        log(`✅ 已向 ${successCount} 个目标发送 S 键`, "cyan");
    }

    // === 3. 物理按键监听 ===
    let lastPauseTime = 0;

    function attachListener() {
        const media = document.querySelector('video') || document.querySelector('audio');
        if (!media) {
            // log("❌ 未找到视频元素", "red");
            return;
        }
        if (media.dataset.mapped) return;
        
        media.dataset.mapped = "true";
        log("✅ 已锁定视频元素，准备就绪");

        // 监听暂停
        media.addEventListener('pause', () => {
            lastPauseTime = Date.now();
            log("检测到: 暂停 (等待播放...)", "orange");
        });

        // 监听播放
        media.addEventListener('play', () => {
            const now = Date.now();
            const diff = now - lastPauseTime;
            
            // 判定时间放宽到 50ms ~ 1200ms (1.2秒)
            if (diff > 50 && diff < 1200) {
                log(`⚡ 判定为双击操作 (${diff}ms)`, "magenta");
                simulateS();
            } else {
                log(`普通播放 (${diff}ms) - 无操作`, "#888");
            }
        });
    }

    // 持续扫描，防止网页动态加载视频
    setInterval(attachListener, 1500);

})();
