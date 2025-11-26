// ==UserScript==
// @name         安卓方向键映射 (21->左 / 22->右)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  将安卓遥控器/手柄的左键(21)映射为PC左方向键(37)，右键(22)映射为PC右方向键(39)
// @author       Gemini
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

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

        // 模拟键盘事件
        target.dispatchEvent(new KeyboardEvent('keydown', eventProps));
        target.dispatchEvent(new KeyboardEvent('keypress', eventProps));
        target.dispatchEvent(new KeyboardEvent('keyup', eventProps));

        console.log(`[方向键映射] 已模拟: ${keyName} (${keyCodeVal})`);
    }

    // 简易提示框
    function showToast(text) {
        let existing = document.getElementById('dir-key-toast');
        if (existing) existing.remove();

        let div = document.createElement('div');
        div.id = 'dir-key-toast';
        div.style = "position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(0,0,0,0.7); color:#fff; padding:10px 20px; border-radius:8px; z-index:2147483647; font-size:24px; font-weight:bold; pointer-events:none; transition: opacity 0.2s;";
        div.innerText = text;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 600);
    }

    document.addEventListener('keydown', function(e) {
        // 防止脚本模拟的按键再次触发自己 (死循环保护)
        if (!e.isTrusted) return;

        // === 监听 21 (安卓向左) -> 映射为 ArrowLeft (37) ===
        if (e.keyCode === 21) {
            e.preventDefault();
            e.stopPropagation();
            simulateKey('ArrowLeft', 'ArrowLeft', 37);
            showToast('←');
            return;
        }

        // === 监听 22 (安卓向右) -> 映射为 ArrowRight (39) ===
        if (e.keyCode === 22) {
            e.preventDefault();
            e.stopPropagation();
            simulateKey('ArrowRight', 'ArrowRight', 39);
            showToast('→');
            return;
        }

    }, true); // 捕获模式，确保最先执行

})();
