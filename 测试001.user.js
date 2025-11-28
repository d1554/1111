// ==UserScript==
// @name         安卓全能键 (V17.5 终极侦探版)
// @namespace    http://tampermonkey.net/
// @version      17.5
// @description  车机专用检测工具：同时监听 键盘事件、游戏手柄(Gamepad) 和 鼠标滚轮，用于提取键值。
// @author       Gemini
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 1. 创建显示面板
    // ==========================================
    const logBox = document.createElement('div');
    logBox.style.cssText = `
        position: fixed; top: 10px; right: 10px;
        width: 300px; height: 400px;
        background: rgba(0,0,0,0.9);
        color: #00ff00;
        z-index: 999999;
        overflow-y: auto;
        padding: 10px;
        font-family: monospace;
        font-size: 14px;
        border: 2px solid #00ff00;
        pointer-events: none; /* 让点击穿透 */
    `;
    document.documentElement.appendChild(logBox);

    function log(type, msg) {
        const line = document.createElement('div');
        line.style.borderBottom = '1px solid #333';
        line.innerHTML = `<span style="color:yellow">[${type}]</span> ${msg}`;
        logBox.insertBefore(line, logBox.firstChild);
        // 保持只有20行
        if (logBox.children.length > 20) {
            logBox.removeChild(logBox.lastChild);
        }
        console.log(`[${type}] ${msg}`);
    }

    log('SYSTEM', '侦探脚本已启动，请按键...');

    // ==========================================
    // 2. 监听 键盘事件 (Keyboard)
    // ==========================================
    // 捕获阶段监听，防止网页阻止
    window.addEventListener('keydown', (e) => {
        log('KEY', `code:${e.code} | key:${e.key} | keyCode:${e.keyCode}`);
    }, true);
    
    window.addEventListener('keyup', (e) => {
        // 仅记录 keyup 作为辅助，防止刷屏
        // log('KEY_UP', `keyCode:${e.keyCode}`);
    }, true);

    // ==========================================
    // 3. 监听 游戏手柄 (Gamepad API)
    // ==========================================
    // 很多车机方向盘被识别为 Gamepad
    let lastButtons = [];
    
    function scanGamepad() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        
        for (let i = 0; i < gamepads.length; i++) {
            const gp = gamepads[i];
            if (!gp) continue;

            // 初始化状态记录
            if (!lastButtons[i]) lastButtons[i] = [];

            // 检查每一个按钮
            for (let b = 0; b < gp.buttons.length; b++) {
                const pressed = gp.buttons[b].pressed;
                
                // 状态发生改变（按下）
                if (pressed && !lastButtons[i][b]) {
                    log('GAMEPAD', `Index:${i} | Button:${b} PRESSED`);
                }
                
                lastButtons[i][b] = pressed;
            }
            
            // 检查轴（方向盘有时候是轴）
            // 忽略微小漂移
            for (let a = 0; a < gp.axes.length; a++) {
                if (Math.abs(gp.axes[a]) > 0.5) {
                    // 只有当值变动很大时才log，避免刷屏，这里简化处理
                    // log('AXIS', `Index:${i} | Axis:${a} | Val:${gp.axes[a].toFixed(2)}`);
                }
            }
        }
        requestAnimationFrame(scanGamepad);
    }
    
    window.addEventListener("gamepadconnected", (e) => {
        log('SYSTEM', `发现手柄: ${e.gamepad.id}`);
    });
    
    // 启动循环扫描
    scanGamepad();

    // ==========================================
    // 4. 监听 鼠标/滚轮 (Mouse/Wheel)
    // ==========================================
    // 有些旋钮是滚轮事件
    window.addEventListener('wheel', (e) => {
        log('WHEEL', `DeltaY: ${e.deltaY}`);
    }, true);
    
    window.addEventListener('mousedown', (e) => {
        // log('MOUSE', `Button: ${e.button}`);
    }, true);

})();
