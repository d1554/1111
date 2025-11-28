// ==UserScript==
// @name         S键映射 (v24.0 天网拦截版)
// @namespace    http://tampermonkey.net/
// @version      24.0
// @description  放弃抓取特定元素，使用全局事件捕获 (Capture Phase)，响应页面上任何位置的视频操作
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. UI 提示 (不死鸟机制) ---
    let toast = null;
    let hideTimer;

    function showMsg(text, type = 'normal') {
        if (!toast || !document.body.contains(toast)) {
            toast = document.createElement('div');
            toast.style.cssText = 'position:fixed; top:15%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.8); color:#fff; font-size:16px; padding:10px 20px; border-radius:50px; display:none; z-index:2147483647; pointer-events:none; font-weight:bold; white-space:nowrap;';
            document.body.appendChild(toast);
        }
        
        toast.innerHTML = text;
        toast.style.backgroundColor = type === 'trigger' ? 'rgba(255, 50, 50, 0.95)' : 'rgba(0, 0, 0, 0.8)';
        toast.style.transform = type === 'trigger' ? 'translate(-50%,-50%) scale(1.2)' : 'translate(-50%,-50%) scale(1)';
        toast.style.display = 'block';
        toast.style.opacity = '1';
        
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.style.display = 'none', 200);
        }, 800);
    }

    // --- 2. 模拟 S 键 ---
    function triggerS() {
        console.log("🚀 [天网] 触发 S 键！");
        showMsg("⚡ <b>触发 S 键</b>", "trigger");

        const eventConfig = {
            key: 's', code: 'KeyS', keyCode: 83, which: 83,
            bubbles: true, cancelable: true, view: window
        };

        // 既然找不到具体的视频，就往网页最核心的地方发按键
        const targets = [
            document.activeElement, // 当前聚焦点
            document.body,
            document.documentElement
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

    // --- 3. 核心：全局拦截逻辑 ---
    let clickCount = 0;
    let resetTimer = null;
    let isSeeking = false;

    // 这是一个“门卫”，所有进出的事件都要经过这里
    function globalHandler(e) {
        // 过滤1：只关心 video 和 audio 标签发出的声音
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) {
            return;
        }

        // 过滤2：处理进度条拖动 (Seeking)
        // 你的截图显示有大量 seeking 事件，必须屏蔽
        if (e.type === 'seeking') {
            isSeeking = true;
            // showMsg("拖动中..."); 
            return;
        }
        if (e.type === 'seeked') {
            // 拖动结束 0.5秒后才恢复检测
            setTimeout(() => { isSeeking = false; }, 500);
            return;
        }

        // 核心判定：Pause 或 Play
        if (e.type === 'pause' || e.type === 'play') {
            if (isSeeking) return; // 拖动期间的信号全部扔掉

            // 计数逻辑 (双击检测)
            clickCount++;

            if (resetTimer) clearTimeout(resetTimer);

            if (clickCount >= 2) {
                // --- 成功双击 ---
                triggerS();
                clickCount = 0;
            } else {
                // --- 第一次点击 ---
                // 你的需求：显示提示，并且不要有速度限制
                // 我设置了 600ms 的等待窗口。意味着你只要在 0.6秒内按两下都算。
                const icon = e.type === 'play' ? '▶️' : '⏸️';
                showMsg(`${icon} 检测到操作 (1/2)`);
                
                resetTimer = setTimeout(() => {
                    clickCount = 0; // 超时重置
                }, 600);
            }
        }
    }

    // --- 4. 启动天网 (Capture = true) ---
    // 最后的 'true' 是精髓，表示在捕获阶段拦截，谁也跑不掉
    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);
    window.addEventListener('seeking', globalHandler, true);
    window.addEventListener('seeked', globalHandler, true);

    console.log("✅ [S键映射] 天网拦截模式已启动");
    showMsg("✅ 脚本已启动 (全局模式)");

})();
