// ==UserScript==
// @name         S键映射 (防抖诊断版)
// @namespace    http://tampermonkey.net/
// @version      19.0
// @description  过滤掉小于100ms的系统抖动，只响应 100ms-1000ms 之间的人工连按
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- UI 显示模块 (调试用) ---
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed; top:15%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.85); color:#fff; font-size:18px; padding:12px 20px; border-radius:8px; display:none; z-index:999999; pointer-events:none; text-align:center; min-width: 200px;';
    document.body.appendChild(toast);

    let hideTimer;
    function showMsg(html, isAction = false) {
        toast.innerHTML = html;
        toast.style.border = isAction ? '2px solid #ff3333' : '1px solid #666'; 
        toast.style.display = 'block';
        
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            toast.style.display = 'none';
        }, 1500); // 稍微显示久一点方便看清
    }

    // --- 模拟 S 键 ---
    function triggerS() {
        console.log("🚀 触发 S 键");
        // 显示红色提示，表示触发了
        showMsg("⚡ <b>触发 S 键!</b><br><span style='font-size:14px;color:#aaa'>切换下一条</span>", true);

        const eventConfig = {
            key: 's',
            code: 'KeyS',
            keyCode: 83,
            which: 83,
            bubbles: true,
            cancelable: true,
            view: window
        };

        const targets = [
            document.activeElement,
            document.querySelector('video'),
            document.body
        ];

        targets.forEach(t => {
            if(t) {
                try {
                    t.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
                    t.dispatchEvent(new KeyboardEvent('keypress', eventConfig));
                    t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
                } catch(e) {}
            }
        });
    }

    // --- 状态记录 ---
    let lastActionTime = 0;
    
    // 配置：
    // JITTER_LIMIT: 过滤掉小于 100ms 的操作（这是机器造成的，不是人手）
    // DOUBLE_CLICK_LIMIT: 大于 1000ms (1秒) 就视为单纯的暂停/播放，不算连按
    const JITTER_LIMIT = 100;
    const DOUBLE_CLICK_LIMIT = 1000;

    function monitor() {
        const media = document.querySelector('video') || document.querySelector('audio');
        if (!media) return;
        if (media.dataset.antiJitterMode) return;
        media.dataset.antiJitterMode = "true";
        
        showMsg("✅ 脚本已加载<br>等待操作...", false);

        const handleStateChange = (e) => {
            const now = Date.now();
            const diff = now - lastActionTime;
            const eventType = e.type; // 'play' 或 'pause'

            // 情况1：间隔太短 (<100ms) -> 系统自动触发的抖动，忽略
            if (diff > 0 && diff < JITTER_LIMIT) {
                console.log(`忽略抖动: ${diff}ms`);
                return; 
            }

            // 情况2：在有效区间内 (100ms - 1000ms) -> 认为是人工连按
            if (diff >= JITTER_LIMIT && diff <= DOUBLE_CLICK_LIMIT) {
                triggerS();
                lastActionTime = 0; // 触发后重置，避免三连击触发两次
            } 
            // 情况3：间隔很久 -> 视为一次新的操作开始
            else {
                lastActionTime = now;
                
                // 给用户反馈，让你知道脚本检测到了什么
                let icon = eventType === 'play' ? '▶️' : '⏸️';
                showMsg(`${icon} <b>检测到 ${eventType}</b><br><span style='font-size:14px;color:#aaa'>等待连按 (间隔: ${diff > 10000 ? '>10s' : diff + 'ms'})</span>`, false);
            }
        };

        media.addEventListener('pause', handleStateChange);
        media.addEventListener('play', handleStateChange);
    }

    setInterval(monitor, 1000);

})();
