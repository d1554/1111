// ==UserScript==
// @name         S键映射 (回归暴力监工版)
// @namespace    http://tampermonkey.net/
// @version      22.0
// @description  放弃复杂判定，每500ms强制检查页面元素，确保换视频也能识别；纯粹基于时间间隔的双击检测
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- UI 提示 (确保你看得见) ---
    let toast = null;
    let hideTimer;

    function showMsg(text, color = '#fff') {
        // 每次都检查 UI 是否存在，不在就重建 (不死鸟逻辑)
        if (!toast || !document.body.contains(toast)) {
            toast = document.createElement('div');
            toast.style.cssText = 'position:fixed; top:20%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.8); font-size:20px; padding:15px 30px; border-radius:10px; display:none; z-index:999999; pointer-events:none; font-weight:bold; box-shadow:0 0 10px rgba(0,0,0,0.5);';
            document.body.appendChild(toast);
        }
        
        toast.innerText = text;
        toast.style.color = color;
        toast.style.display = 'block';
        
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            toast.style.display = 'none';
        }, 800);
    }

    // --- 触发 S 键 ---
    function triggerS() {
        console.log("🚀 [S键] 触发！");
        showMsg("⏭️ 触发 S 键", "#ff3333"); // 红色

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

    // --- 核心逻辑 ---
    let lastActionTime = 0;
    let currentBoundVideo = null; // 记录当前正在监控的是哪个视频元素

    function handleStateChange(e) {
        // 过滤掉进度条拖动 (Seeking)
        // 只有当用户真的点击 暂停/播放 时才算
        const media = e.target;
        if (media.seeking) {
            console.log("忽略拖动");
            return;
        }

        const now = Date.now();
        const diff = now - lastActionTime;

        // 1. 过滤机器抖动 (<100ms)
        // 很多播放器点击一下会触发好几次事件，必须忽略极短间隔
        if (diff < 100) {
            return;
        }

        // 2. 有效双击区间 (100ms ~ 600ms)
        if (diff >= 100 && diff <= 600) {
            triggerS();
            lastActionTime = 0; // 触发后清零，防止连击误判
        } 
        // 3. 超时或第一次点击
        else {
            lastActionTime = now;
            showMsg("Waiting...", "#00ff00"); // 绿色提示，表示检测到了第一次
        }
    }

    // --- 监工：死循环检查 ---
    function watchdog() {
        const media = document.querySelector('video') || document.querySelector('audio');
        
        // 如果页面没视频，或者找到的视频就是我们正在监控的那个，就休息
        if (!media || media === currentBoundVideo) return;

        // --- 发现新视频！(或者是页面刷新后的视频) ---
        console.log("✅ 发现新视频元素，正在挂载监听器...");
        showMsg("脚本已挂载", "#aaa");

        // 移除旧的（如果还有残留），虽然后面会被覆盖，但好习惯
        if (currentBoundVideo) {
            currentBoundVideo.removeEventListener('play', handleStateChange);
            currentBoundVideo.removeEventListener('pause', handleStateChange);
        }

        // 绑定新的
        media.addEventListener('play', handleStateChange);
        media.addEventListener('pause', handleStateChange);
        
        // 更新记录
        currentBoundVideo = media;
    }

    // 每 500ms 巡逻一次，确保换视频也能抓到
    setInterval(watchdog, 500);

})();
