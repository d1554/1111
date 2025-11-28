// ==UserScript==
// @name         S键映射 (终极降噪版)
// @namespace    http://tampermonkey.net/
// @version      20.0
// @description  忽略缓冲、拖动进度条引发的误判，只响应真正的人工连续操作
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- UI 提示 (帮你看到底发生了什么) ---
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed; top:15%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.8); color:#fff; font-size:16px; padding:10px 20px; border-radius:50px; display:none; z-index:999999; pointer-events:none; transition: opacity 0.2s;';
    document.body.appendChild(toast);

    let hideTimer;
    function showMsg(text, type = 'normal') {
        toast.innerHTML = text;
        toast.style.backgroundColor = type === 'trigger' ? 'rgba(200, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)';
        toast.style.display = 'block';
        toast.style.opacity = '1';
        
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.style.display = 'none', 200);
        }, 1000);
    }

    // --- S 键触发逻辑 ---
    function triggerS() {
        console.log("🚀 触发 S 键！");
        showMsg("⏭️ <b>触发 S 键</b>", "trigger");

        const eventConfig = {
            key: 's', code: 'KeyS', keyCode: 83, which: 83,
            bubbles: true, cancelable: true, view: window
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
                    t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
                } catch(e) {}
            }
        });
    }

    // --- 智能监控核心 ---
    let clickCount = 0;
    let resetTimer;
    let isSeeking = false; // 是否正在拖动进度条

    function monitor() {
        const media = document.querySelector('video') || document.querySelector('audio');
        if (!media) return;
        if (media.dataset.smartMode) return;
        media.dataset.smartMode = "true";
        
        showMsg("✅ 降噪监控已启动");

        // 1. 监听拖动进度条 (Seeking)
        // 拖动时会疯狂触发 pause/play，必须全部屏蔽
        media.addEventListener('seeking', () => { isSeeking = true; });
        media.addEventListener('seeked', () => { 
            // 拖动结束后，延迟一小会儿再恢复检测，防止结束瞬间的信号干扰
            setTimeout(() => { isSeeking = false; }, 500); 
        });

        // 2. 统一处理 Play 和 Pause 事件
        const handleEvent = (e) => {
            // 屏蔽规则 A: 正在拖动进度条 -> 忽略
            if (isSeeking) {
                console.log("忽略：正在拖动进度条");
                return;
            }

            // 屏蔽规则 B: 视频处于缓冲状态 (ReadyState < 3) -> 忽略
            // 这解决了网速不好导致视频自动暂停，被误判为人工操作的问题
            if (media.readyState < 3) {
                console.log("忽略：正在缓冲");
                // showMsg("⚠️ 缓冲中 (忽略信号)");
                return;
            }

            // --- 计数逻辑 ---
            clickCount++;

            // 如果已经有了计时器，清除它（说明还在连击窗口期内）
            clearTimeout(resetTimer);

            if (clickCount >= 2) {
                // 连续操作达到2次 -> 触发！
                triggerS();
                clickCount = 0; // 重置
            } else {
                // 这是第一次操作，显示提示
                let icon = e.type === 'play' ? '▶️' : '⏸️';
                showMsg(`${icon} 检测到操作 (1/2)`);
                
                // 开启 600ms 窗口期，如果在 600ms 内没有第二次操作，就重置计数
                resetTimer = setTimeout(() => {
                    clickCount = 0;
                    // showMsg("超时重置");
                }, 600);
            }
        };

        media.addEventListener('pause', handleEvent);
        media.addEventListener('play', handleEvent);
    }

    setInterval(monitor, 1000);

})();
