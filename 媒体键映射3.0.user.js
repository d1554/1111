// ==UserScript==
// @name         安卓媒体键多功能映射 (87->S / 88->W / 85双击->H)
// @namespace    http://tampermonkey.net/
// @version      7.0
// @description  87=S, 88=W, 85单击=空格, 85双击=H
// @author       Gemini
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    let pressCount = 0;
    let actionTimer = null;

    // 判定双击的延迟 (毫秒)
    const DELAY = 350;

    // 通用的按键模拟函数
    function simulateKey(keyName, codeName, keyCodeVal) {
        const eventProps = {
            key: keyName,
            code: codeName,
            keyCode: keyCodeVal,
            which: keyCodeVal,
            bubbles: true,
            cancelable: true,
            view: window
        };

        const target = document.activeElement || document.body;

        target.dispatchEvent(new KeyboardEvent('keydown', eventProps));
        target.dispatchEvent(new KeyboardEvent('keypress', eventProps));
        target.dispatchEvent(new KeyboardEvent('keyup', eventProps));

        console.log(`已模拟按键: ${keyName} (Code: ${keyCodeVal})`);
    }

    // 提示框
    function showToast(text) {
        let existing = document.getElementById('my-key-toast');
        if (existing) existing.remove();

        let div = document.createElement('div');
        div.id = 'my-key-toast';
        div.style = "position:fixed; top:10%; left:50%; transform:translate(-50%, -50%); background:rgba(0,0,0,0.8); color:#00ffea; padding:8px 16px; border-radius:50px; z-index:2147483647; font-size:16px; font-weight:bold; pointer-events:none; box-shadow: 0 2px 10px rgba(0,0,0,0.5); transition: opacity 0.2s;";
        div.innerText = text;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 800);
    }

    document.addEventListener('keydown', function(e) {
        // =================================================
        // 1. 监听 87 (通常是下一曲) -> 映射为 S
        // =================================================
        if (e.keyCode === 87 || e.key === 'MediaTrackNext') {
            e.preventDefault();
            e.stopPropagation();
            simulateKey('s', 'KeyS', 83);
            showToast('S');
            return; // 立即结束，不走下面的逻辑
        }

        // =================================================
        // 2. 监听 88 (通常是上一曲) -> 映射为 W
        // =================================================
        if (e.keyCode === 88 || e.key === 'MediaTrackPrevious') {
            e.preventDefault();
            e.stopPropagation();
            simulateKey('w', 'KeyW', 87);
            showToast('W');
            return; // 立即结束
        }

        // =================================================
        // 3. 监听 85 (播放/暂停) -> 单击空格 / 双击 H
        // =================================================
        if (e.keyCode === 85 || e.key === 'MediaPlayPause') {
            e.preventDefault();
            e.stopPropagation();

            pressCount++;

            if (actionTimer) {
                clearTimeout(actionTimer);
            }

            actionTimer = setTimeout(() => {
                if (pressCount === 1) {
                    // === 单击 -> 空格 ===
                    simulateKey(' ', 'Space', 32);
                    showToast('⎵ 空格');
                }
                else if (pressCount >= 2) {
                    // === 双击 (或更多) -> H ===
                    simulateKey('h', 'KeyH', 72);
                    showToast('H');
                }

                // 重置
                pressCount = 0;
            }, DELAY);
        }
    }, true); // 使用捕获模式，确保优先处理

})();