// ==UserScript==
// @name         安卓全能键 (V17.4 严谨防误触版)
// @namespace    http://tampermonkey.net/
// @version      17.4
// @description  全键位统一处理，修复了X键误触问题。所有逻辑完全对称且安全。
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
    // 3. 模拟按键
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
        // 【方向映射逻辑】
        // 输入: 227/228 (遥控器) -> 输出: 37/39 (标准方向)
        // -------------------------------------------------
        
        // 1. 左键 (输入 227 -> 输出 37)
        if (code === 227) {
            if (!e.isTrusted) return; 
            e.preventDefault(); e.stopPropagation();
            
            showToast('← 后退');
            simulateKey('ArrowLeft', 'ArrowLeft', 37);
            return; 
        }

        // 2. 右键 (输入 228 -> 输出 39)
        if (code === 228) {
            if (!e.isTrusted) return; 
            e.preventDefault(); e.stopPropagation();
            
            showToast('→ 前进');
            simulateKey('ArrowRight', 'ArrowRight', 39);
            return;
        }

        // -------------------------------------------------
        // 【媒体映射逻辑】
        // 输入: 87/88/85 (遥控器) -> 输出: S/W/空格 (标准键)
        // -------------------------------------------------

        // 3. 下一曲 (输入 87 -> 输出 S)
        if (code === 87 || e.key === 'MediaTrackNext') {
            // 排除真实的键盘 W 按键 (W键码是87)
            if (e.key === 'w' || e.key === 'W') return;
            if (!e.isTrusted) return; 

            e.preventDefault(); e.stopPropagation();
            
            showToast('S (下一曲)');
            simulateKey('s', 'KeyS', 83);
            return;
        }

        // 4. 上一曲 (输入 88 -> 输出 W)
        if (code === 88 || e.key === 'MediaTrackPrevious') {
            // 排除真实的键盘 X 按键 (X键码是88)
            if (e.key === 'x' || e.key === 'X') return;
            if (!e.isTrusted) return; 

            e.preventDefault(); e.stopPropagation();
            
            showToast('W (上一曲)');
            simulateKey('w', 'KeyW', 87);
            return;
        }

        // 5. 暂停/播放 (输入 85 -> 输出 空格/H)
        if (code === 85 || e.key === 'MediaPlayPause') {
            if (!e.isTrusted) return; 
            e.preventDefault(); e.stopPropagation();

            pressCount++;
            if (actionTimer) clearTimeout(actionTimer);
            actionTimer = setTimeout(() => {
                if (pressCount === 1) {
                    showToast('⏯ 暂停/播放');
                    simulateKey(' ', 'Space', 32);
                } else if (pressCount >= 2) {
                    showToast('H (双击)');
                    simulateKey('h', 'KeyH', 72);
                }
                pressCount = 0;
            }, DELAY);
            return;
        }

    }, true);

})();
