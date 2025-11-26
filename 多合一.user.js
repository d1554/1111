// ==UserScript==
// @name         安卓全能键 (V17.2 自定义键值版)
// @namespace    http://tampermonkey.net/
// @version      17.2
// @description  将遥控器的快退(227)/快进(228) 映射为 标准方向键，修复焦点劫持，代码逻辑对称。
// @author       Gemini
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    let pressCount = 0;
    let actionTimer = null;
    const DELAY = 350;

    // ==========================================
    // 1. UI 初始化
    // ==========================================
    let toastBox = null;

    function initUI() {
        if (toastBox && document.contains(toastBox)) return;

        toastBox = document.createElement('div');
        toastBox.style.cssText = `
            position: fixed; top: 20%; left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.85);
            color: #00ffea;
            padding: 15px 30px;
            border-radius: 50px;
            z-index: 2147483647;
            font-size: 28px;
            font-weight: bold;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            border: 1px solid rgba(0,255,234,0.3);
            white-space: nowrap;
        `;
        
        const root = document.fullscreenElement || document.documentElement || document.body;
        if (root) {
            root.appendChild(toastBox);
        }
    }

    setInterval(initUI, 1000);

    // ==========================================
    // 2. 显示提示
    // ==========================================
    let hideTimer = null;
    function showToast(text) {
        initUI();
        if(toastBox) {
            toastBox.innerText = text;
            toastBox.style.opacity = '1';
            
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = setTimeout(() => {
                toastBox.style.opacity = '0';
            }, 800);
        }
    }

    // ==========================================
    // 3. 模拟按键 (输出标准方向键信号)
    // ==========================================
    function simulateKey(keyName, codeName, keyCodeVal) {
        const eventProps = {
            key: keyName, code: codeName, keyCode: keyCodeVal, which: keyCodeVal,
            bubbles: true, cancelable: true, view: window
        };
        const target = document.activeElement || document.body;
        target.dispatchEvent(new KeyboardEvent('keydown', eventProps));
        target.dispatchEvent(new KeyboardEvent('keypress', eventProps));
        target.dispatchEvent(new KeyboardEvent('keyup', eventProps));
    }

    // ==========================================
    // 4. 核心监听
    // ==========================================
    window.addEventListener('keydown', function(e) {
        const code = e.keyCode || e.which;

        // -------------------------------------------------
        // 【方向映射逻辑 - 完美对称版】
        // 输入: 227/228 (遥控器) -> 输出: 37/39 (浏览器标准)
        // -------------------------------------------------
        
        // 1. 左键 (输入 227 -> 输出 37)
        if (code === 227) {
            if (!e.isTrusted) return; 
            
            e.preventDefault(); 
            e.stopPropagation();
            
            showToast('← 后退');
            simulateKey('ArrowLeft', 'ArrowLeft', 37);
            return; 
        }

        // 2. 右键 (输入 228 -> 输出 39)
        if (code === 228) {
            if (!e.isTrusted) return; 

            e.preventDefault(); 
            e.stopPropagation();
            
            showToast('→ 前进');
            simulateKey('ArrowRight', 'ArrowRight', 39);
            return;
        }

        // -------------------------------------------------
        // 【媒体键逻辑】 (保持不变)
        // -------------------------------------------------
        if (!e.isTrusted) return; 

        // 87 -> S
        if ((code === 87 || e.key === 'MediaTrackNext') && e.key !== 'w' && e.key !== 'W') {
            e.preventDefault(); e.stopPropagation();
            simulateKey('s', 'KeyS', 83);
            showToast('S (下一曲)');
            return;
        }

        // 88 -> W
        if (code === 88 || e.key === 'MediaTrackPrevious') {
            e.preventDefault(); e.stopPropagation();
            simulateKey('w', 'KeyW', 87);
            showToast('W (上一曲)');
            return;
        }

        // 85 -> 空格 / H
        if (code === 85 || e.key === 'MediaPlayPause') {
            e.preventDefault(); e.stopPropagation();
            pressCount++;
            if (actionTimer) clearTimeout(actionTimer);
            actionTimer = setTimeout(() => {
                if (pressCount === 1) {
                    simulateKey(' ', 'Space', 32);
                    showToast('⏯ 暂停/播放');
                } else if (pressCount >= 2) {
                    simulateKey('h', 'KeyH', 72);
                    showToast('H (双击)');
                }
                pressCount = 0;
            }, DELAY);
        }

    }, true);

})();
