// ==UserScript==
// @name         安卓媒体键多功能映射 (空格/S/H)
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  播放键映射：单击=空格，双击=S，三击=H
// @author       Gemini
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    let pressCount = 0;
    let actionTimer = null;
    
    // 判定延迟 (毫秒)
    // 350ms 是一个比较平衡的值。如果你手速很快，可以改成 250
    const DELAY = 350; 

    // 通用的按键模拟函数
    function simulateKey(keyName, codeName, keyCodeVal) {
        const eventProps = {
            key: keyName,
            code: codeName,
            keyCode: keyCodeVal,
            which: keyCodeVal,
            bubbles: true,      // 必须冒泡
            cancelable: true,
            view: window
        };

        const target = document.activeElement || document.body;

        // 模拟完整的按键动作
        target.dispatchEvent(new KeyboardEvent('keydown', eventProps));
        target.dispatchEvent(new KeyboardEvent('keypress', eventProps));
        target.dispatchEvent(new KeyboardEvent('keyup', eventProps));
        
        console.log(`已模拟按键: ${keyName}`);
    }

    // 提示框 (让你知道脚本触发了什么)
    function showToast(text) {
        let div = document.createElement('div');
        div.style = "position:fixed; top:10%; left:50%; transform:translate(-50%, -50%); background:rgba(0,0,0,0.7); color:white; padding:5px 12px; border-radius:50px; z-index:999999; font-size:14px; pointer-events:none; transition: opacity 0.2s;";
        div.innerText = text;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 800);
    }

    document.addEventListener('keydown', function(e) {
        // 监听 179 (播放/暂停)
        if (e.keyCode === 179 || e.key === 'MediaPlayPause' || e.code === 'MediaPlayPause') {
            
            // 1. 绝对拦截：阻止系统默认的暂停行为，完全由脚本接管
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            pressCount++;

            // 2. 清除之前的计时器，重新计时
            if (actionTimer) {
                clearTimeout(actionTimer);
            }

            // 3. 设置延迟执行逻辑
            actionTimer = setTimeout(() => {
                if (pressCount === 1) {
                    // === 单击 -> 空格 (Space) ===
                    // Space: keyCode 32
                    simulateKey(' ', 'Space', 32); 
                    showToast('⎵ 空格');
                } 
                else if (pressCount === 2) {
                    // === 双击 -> S 键 ===
                    // S: keyCode 83
                    simulateKey('s', 'KeyS', 83);
                    showToast('S');
                } 
                else if (pressCount >= 3) {
                    // === 三击 (或更多) -> H 键 ===
                    // H: keyCode 72
                    simulateKey('h', 'KeyH', 72);
                    showToast('H');
                }

                // 重置计数器
                pressCount = 0;
            }, DELAY);
        }
    }, true);

})();