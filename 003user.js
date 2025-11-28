// ==UserScript==
// @name         暂停键改造：双击切歌
// @namespace    http://tampermonkey.net/
// @version      12.0
// @description  按一下暂停/播放，连按两下切换下一首
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 🔴 你的按钮选择器 (请务必修改)
    const NEXT_SELECTOR = '.你的下一首按钮'; 
    // const PLAY_PAUSE_SELECTOR = '.你的播放暂停按钮'; // 如果单击不生效，才需要填这个

    // 显示提示
    const toast = (msg) => {
        let div = document.createElement('div');
        div.style.cssText = 'position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:#fff;padding:15px;border-radius:10px;z-index:999999;font-size:18px;pointer-events:none;';
        div.innerText = msg;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 1000);
    };

    // 状态变量
    let pressCount = 0;
    let pressTimer = null;

    // 核心监听逻辑
    window.addEventListener('keydown', (e) => {
        const code = e.keyCode;
        
        // 179 是标准的 Play/Pause 键，79 是线控耳机键 (HeadsetHook)
        if (code === 179 || code === 79 || e.code === 'MediaPlayPause') {
            
            // 阻止浏览器默认的暂停行为，由我们要接管控制
            // 注意：如果脚本没运行，浏览器可能会自己暂停，这行很重要
            e.preventDefault();
            e.stopPropagation();

            pressCount++;

            if (pressCount === 1) {
                // 第一次按下，启动计时器
                pressTimer = setTimeout(() => {
                    // 时间到了没有第二次按，说明是单击 -> 执行暂停/播放
                    handleSingleClick();
                    pressCount = 0;
                }, 400); // 400毫秒判定时间
            } else if (pressCount === 2) {
                // 在计时器结束前按了第二次 -> 执行切歌
                clearTimeout(pressTimer);
                handleDoubleClick();
                pressCount = 0;
            }
        }
    }, true);

    // 单击处理：触发网页原本的播放/暂停
    function handleSingleClick() {
        console.log("检测到单击：执行暂停/播放");
        
        // 尝试触发网页的视频元素本身的点击（通常有效）
        const video = document.querySelector('video') || document.querySelector('audio');
        if (video) {
            if (video.paused) {
                video.play();
                toast("▶ 播放");
            } else {
                video.pause();
                toast("⏸ 暂停");
            }
        } else {
            // 如果没找到 video 标签，尝试点按钮
             // document.querySelector(PLAY_PAUSE_SELECTOR)?.click();
             toast("⚠️ 未找到媒体元素");
        }
    }

    // 双击处理：触发下一首
    function handleDoubleClick() {
        console.log("检测到双击：执行下一首");
        const nextBtn = document.querySelector(NEXT_SELECTOR);
        if (nextBtn) {
            nextBtn.click();
            toast("⏭ 下一首");
        } else {
            toast("❌ 未配置下一首按钮");
        }
    }
    
    console.log("✅ 暂停键双击脚本已加载");

})();
