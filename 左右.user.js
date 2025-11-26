// ==UserScript==
// @name         安卓方向键修复 (21->PC左 / 22->PC右)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  将安卓原生方向键值 21/22 转换为 PC 标准方向键值 37/39，解决网页不识别安卓遥控器方向键的问题
// @author       Gemini
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 提示框 (方便调试，确认按键已生效)
    function showToast(text) {
        let existing = document.getElementById('dpad-toast');
        if (existing) existing.remove();

        let div = document.createElement('div');
        div.id = 'dpad-toast';
        div.style = "position:fixed; top:85%; left:50%; transform:translate(-50%, -50%); background:rgba(0,100,255,0.8); color:#fff; padding:6px 12px; border-radius:4px; z-index:2147483647; font-size:14px; pointer-events:none; transition: opacity 0.2s;";
        div.innerText = text;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 800);
    }

    // 模拟按键函数
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
        
        console.log(`已将安卓键转换为: ${keyName} (${keyCodeVal})`);
    }

    document.addEventListener('keydown', function(e) {
        // 防止脚本模拟的按键再次触发自己 (尽管方向键通常不会死循环，但为了安全加上)
        if (!e.isTrusted) return;

        // =================================================
        // 1. 安卓左键 (21) -> 映射为 PC ArrowLeft (37)
        // =================================================
        if (e.keyCode === 21) {
            e.preventDefault();
            e.stopPropagation(); // 阻止原生 21 事件传播
            simulateKey('ArrowLeft', 'ArrowLeft', 37);
            showToast('⬅️ PC左键');
        }

        // =================================================
        // 2. 安卓右键 (22) -> 映射为 PC ArrowRight (39)
        // =================================================
        if (e.keyCode === 22) {
            e.preventDefault();
            e.stopPropagation(); // 阻止原生 22 事件传播
            simulateKey('ArrowRight', 'ArrowRight', 39);
            showToast('➡️ PC右键');
        }

    }, true); // 使用捕获模式 (true) 确保最先执行

})();
