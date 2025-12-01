// ==UserScript==
// @name         安卓Firefox耳机键映射 (2击S, 3击H)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  监听暂停/播放键：2次模拟S键，3次模拟H键，1.5秒宽容度，带屏幕计数提示
// @author       Gemini Assistant
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // === 配置区域 ===
    const KEY_TOLERANCE = 1500; // 宽容度 1.5秒 (毫秒)
    const TARGET_KEY_CODE = 179; // 大多数安卓播放/暂停键的键值 (MediaPlayPause)
    // 如果你的按键没反应，可能需要修改上面的键值。可以在脚本运行时的提示中看到当前按键的Code

    // === 变量初始化 ===
    let keyPressCount = 0;
    let timer = null;
    let feedbackBox = null;

    // === 创建屏幕显示的计数器 (UI) ===
    function createFeedbackUI() {
        feedbackBox = document.createElement('div');
        feedbackBox.style.position = 'fixed';
        feedbackBox.style.top = '10%';
        feedbackBox.style.left = '50%';
        feedbackBox.style.transform = 'translate(-50%, -50%)';
        feedbackBox.style.padding = '10px 20px';
        feedbackBox.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        feedbackBox.style.color = '#fff';
        feedbackBox.style.fontSize = '20px';
        feedbackBox.style.borderRadius = '5px';
        feedbackBox.style.zIndex = '999999';
        feedbackBox.style.pointerEvents = 'none'; // 让它不阻挡点击
        feedbackBox.style.display = 'none';
        document.body.appendChild(feedbackBox);
    }

    // 显示计数提示
    function showFeedback(text) {
        if (!feedbackBox) createFeedbackUI();
        feedbackBox.innerText = text;
        feedbackBox.style.display = 'block';
    }

    // 隐藏计数提示
    function hideFeedback() {
        if (feedbackBox) {
            feedbackBox.style.display = 'none';
        }
    }

    // === 核心：模拟键盘按键函数 ===
    function simulateKey(keyChar, keyCodeVal) {
        console.log(`[脚本] 正在模拟按键: ${keyChar}`);
        showFeedback(`触发模拟: ${keyChar.toUpperCase()} 键`);

        // 模拟一整套按键流程：keydown -> keypress -> keyup
        // 这是为了最大程度兼容不同的网页侦测方式
        const eventOptions = {
            key: keyChar,
            code: `Key${keyChar.toUpperCase()}`,
            keyCode: keyCodeVal,
            which: keyCodeVal,
            bubbles: true,
            cancelable: true
        };

        document.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
        document.dispatchEvent(new KeyboardEvent('keypress', eventOptions));
        document.dispatchEvent(new KeyboardEvent('keyup', eventOptions));

        // 1秒后隐藏提示
        setTimeout(hideFeedback, 1000);
    }

    // === 核心：监听物理按键 ===
    window.addEventListener('keydown', function(e) {
        // 调试用：你可以看到你按下的键是什么代码
        // console.log("Detected Key:", e.code, e.keyCode);

        // 侦测是否为播放/暂停键 (通常是 MediaPlayPause 或 keyCode 179)
        if (e.key === 'MediaPlayPause' || e.keyCode === TARGET_KEY_CODE) {
            
            // 尝试阻止默认行为（比如阻止音乐播放器启动），但在安卓上不一定总是有效
            // e.preventDefault(); 
            // e.stopPropagation();

            keyPressCount++;
            
            // 更新屏幕提示
            showFeedback(`按键计数: ${keyPressCount}`);

            // 清除之前的定时器，重新计时
            if (timer) clearTimeout(timer);

            // 设置新的定时器
            timer = setTimeout(() => {
                // 1.5秒后执行判断逻辑
                if (keyPressCount === 2) {
                    // 模拟 Windows S 键 (KeyCode 83)
                    simulateKey('s', 83);
                } else if (keyPressCount === 3) {
                    // 模拟 Windows H 键 (KeyCode 72)
                    simulateKey('h', 72);
                } else {
                    // 次数不对，重置
                    showFeedback(`超时: 计数 ${keyPressCount} (无动作)`);
                    setTimeout(hideFeedback, 1000);
                }

                // 归零计数器
                keyPressCount = 0;
                timer = null;

            }, KEY_TOLERANCE);
        }
    }, true); // 使用捕获模式优先截获事件

    // 初始化UI
    if (document.body) {
        createFeedbackUI();
    } else {
        window.addEventListener('DOMContentLoaded', createFeedbackUI);
    }

})();
