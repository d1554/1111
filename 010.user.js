// ==UserScript==
// @name         S键映射 (全局捕获不死鸟版)
// @namespace    http://tampermonkey.net/
// @version      21.0
// @description  利用事件捕获机制监控全局，无论网页如何切换视频元素都能响应；修复提示框消失问题
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- UI 模块 (不死鸟机制) ---
    let toast = null;
    let hideTimer;

    function initToast() {
        if (toast && document.body.contains(toast)) return; // 还在就不管
        
        // 如果不存在或被网页删了，就重新造一个
        toast = document.createElement('div');
        toast.style.cssText = 'position:fixed; top:15%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.8); color:#fff; font-size:16px; padding:10px 20px; border-radius:50px; display:none; z-index:2147483647; pointer-events:none; transition: opacity 0.2s; font-family: sans-serif;';
        document.body.appendChild(toast);
    }

    function showMsg(text, type = 'normal') {
        initToast(); // 每次显示前都确保 UI 存在
        toast.innerHTML = text;
        toast.style.backgroundColor = type === 'trigger' ? 'rgba(220, 20, 60, 0.95)' : 'rgba(0, 0, 0, 0.8)';
        toast.style.display = 'block';
        toast.style.opacity = '1';
        
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.style.display = 'none', 200);
        }, 1000);
    }

    // --- 模拟按键 ---
    function triggerS() {
        console.log("🚀 [S键映射] 触发 S 键！");
        showMsg("⏭️ <b>触发跳过 (S)</b>", "trigger");

        const eventConfig = {
            key: 's', code: 'KeyS', keyCode: 83, which: 83,
            bubbles: true, cancelable: true, view: window
        };

        // 尝试发给多个可能的目标
        const targets = [
            document.activeElement,
            document.querySelector('video'),
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

    // --- 核心逻辑 ---
    let clickCount = 0;
    let resetTimer;
    let isSeeking = false;

    // 处理全局事件
    function handleGlobalEvent(e) {
        // 1. 只有 video 或 audio 触发的事件我们才关心
        const target = e.target;
        if (!target || (target.tagName !== 'VIDEO' && target.tagName !== 'AUDIO')) return;

        // 2. 过滤掉进度条拖动 (Seeking)
        if (e.type === 'seeking') {
            isSeeking = true;
            return;
        }
        if (e.type === 'seeked') {
            setTimeout(() => { isSeeking = false; }, 500); // 拖动完冷却一下
            return;
        }

        // 3. 核心判定 (Pause/Play)
        if (e.type === 'play' || e.type === 'pause') {
            // 规则：正在拖动进度条 -> 忽略
            if (isSeeking) return;

            // 规则：视频还没准备好 (缓冲中) -> 忽略
            // readyState < 3 意味着当前帧的数据还没完全下载好
            if (target.readyState < 3) {
                // showMsg("缓冲中...");
                return;
            }

            // --- 计数器逻辑 ---
            clickCount++;
            clearTimeout(resetTimer);

            if (clickCount >= 2) {
                // 连击成功
                triggerS();
                clickCount = 0;
            } else {
                // 第一次点击
                const icon = e.type === 'play' ? '▶️' : '⏸️';
                showMsg(`${icon} 检测到操作 (1/2)`);
                
                // 600ms 内不操作，重置
                resetTimer = setTimeout(() => {
                    clickCount = 0;
                }, 600);
            }
        }
    }

    // --- 启动全局捕获 ---
    // 第三个参数 true (UseCapture) 是关键！
    // 这意味着我们在事件下沉阶段就拦截，无论元素藏多深，无论元素是不是新创建的，都逃不掉。
    document.addEventListener('play', handleGlobalEvent, true);
    document.addEventListener('pause', handleGlobalEvent, true);
    document.addEventListener('seeking', handleGlobalEvent, true);
    document.addEventListener('seeked', handleGlobalEvent, true);

    console.log("✅ [S键映射] 全局捕获模式已启动");

})();
