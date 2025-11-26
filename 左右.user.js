// ==UserScript==
// @name         安卓方向键独立映射 (21->左 / 22->右) - 强力版
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  基于 v7.1 架构，专门修复安卓 21/22 键值无法控制网页的问题
// @author       Gemini
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 核心工具函数 (与之前的代码保持完全一致) ---

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

        // 尝试获取焦点元素，如果没有则默认 body
        const target = document.activeElement || document.body;

        // 模拟完整的按键生命周期
        target.dispatchEvent(new KeyboardEvent('keydown', eventProps));
        target.dispatchEvent(new KeyboardEvent('keypress', eventProps));
        target.dispatchEvent(new KeyboardEvent('keyup', eventProps));

        console.log(`[映射生效] 原键被拦截，模拟按键: ${keyName} (${keyCodeVal})`);
    }

    // 提示框
    function showToast(text) {
        let existing = document.getElementById('dpad-key-toast');
        if (existing) existing.remove();

        let div = document.createElement('div');
        div.id = 'dpad-key-toast';
        div.style = "position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(0,0,0,0.6); color:#fff; padding:10px 20px; border-radius:8px; z-index:999999; font-size:18px; pointer-events:none; transition: opacity 0.2s;";
        div.innerText = text;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 600);
    }

    // --- 监听逻辑 ---

    document.addEventListener('keydown', function(e) {
        // 【关键保护】忽略脚本自己模拟出来的按键，防止死循环
        if (!e.isTrusted) return;

        // 调试日志：如果您按了键没反应，打开F12看控制台这里输出了什么
        // console.log("捕获到按键:", e.keyCode, e.key);

        // =================================================
        // 1. 监听 21 (安卓左键) -> 映射为 PC ArrowLeft (37)
        // =================================================
        if (e.keyCode === 21 || e.key === 'DPadLeft') {
            e.preventDefault();     // 阻止安卓原生行为
            e.stopPropagation();    // 阻止事件继续向上传播
            e.stopImmediatePropagation(); // 立即阻止当前节点其他监听器

            simulateKey('ArrowLeft', 'ArrowLeft', 37);
            showToast('⬅️');
            return;
        }

        // =================================================
        // 2. 监听 22 (安卓右键) -> 映射为 PC ArrowRight (39)
        // =================================================
        if (e.keyCode === 22 || e.key === 'DPadRight') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            simulateKey('ArrowRight', 'ArrowRight', 39);
            showToast('➡️');
            return;
        }

    }, true); // useCapture = true，确保在网页其他脚本之前捕获

})();
