// ==UserScript==
// @name         S键映射 (V52 深度侦探版)
// @namespace    http://tampermonkey.net/
// @version      52.0
// @description  带有即时日志记录系统，用于诊断安卓Firefox下按键失效的根本原因
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 1. 简易屏幕调试控制台 (Debug Console)
    // ==========================================
    let debugBox = null;
    function initDebug() {
        if (!document.body) return requestAnimationFrame(initDebug);
        debugBox = document.createElement('div');
        debugBox.style.cssText = `
            position: fixed; bottom: 0; left: 0; width: 100%; height: 40vh;
            background: rgba(0,0,0,0.9); color: #0f0; font-size: 12px; line-height: 1.4;
            overflow-y: auto; z-index: 2147483647; padding: 10px;
            border-top: 2px solid #fff; font-family: monospace; pointer-events: none;
        `;
        document.body.appendChild(debugBox);
        log(">>> 侦探系统 V52 已启动", "#fff");
        log(">>> 请尝试：双击(S) 或 三击(H)", "#fff");
        log("----------------------------------", "#888");
    }
    
    function log(msg, color = '#0f0') {
        if (!debugBox) return;
        const line = document.createElement('div');
        const time = new Date().toLocaleTimeString().split(' ')[0] + '.' + new Date().getMilliseconds();
        line.innerHTML = `<span style="color:#888">[${time}]</span> <span style="color:${color}">${msg}</span>`;
        debugBox.appendChild(line);
        debugBox.scrollTop = debugBox.scrollHeight;
    }
    initDebug();

    // ==========================================
    // 2. 环境监听 (验证按键是否真的发出去了)
    // ==========================================
    // 监听 window 上的按键，看看脚本发的键是不是被浏览器吞了
    window.addEventListener('keydown', (e) => {
        // 区分是人按的还是脚本发的 (isTrusted)
        const src = e.isTrusted ? "【物理按键】" : "【脚本模拟】";
        const info = `Key:${e.key} | Code:${e.code} | keyCode:${e.keyCode} | charCode:${e.charCode}`;
        log(`👂 系统监听到 ${src}: ${info}`, "#ff00ff");
    }, true);

    // ==========================================
    // 3. CSS 防手势 (排除干扰)
    // ==========================================
    function injectAntiGestureStyle() {
        const css = `
            video, audio, button, .video-wrapper, .control-bar {
                touch-action: manipulation !important; 
            }
        `;
        const style = document.createElement('style');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
        log(">>> CSS防手势装甲已注入", "#888");
    }
    injectAntiGestureStyle();

    // ==========================================
    // 4. 键盘发射器 (V51 混合版逻辑)
    // ==========================================
    function triggerKey(keyName, originalTarget) {
        log(`🚀 准备发射按键: ${keyName.toUpperCase()}`, "orange");
        
        // 打印当前的焦点元素，看看是不是焦点跑了
        const active = document.activeElement;
        const activeName = active ? (active.tagName + (active.className ? "."+active.className : "")) : "null";
        log(`👀 当前焦点在: ${activeName}`, "#ccc");

        // 目标：优先发给视频，没有就发给body
        const targets = [originalTarget || document.body, document];

        if (keyName === 's') {
            // S键：V34 原始逻辑
            const keyCode = 83;
            targets.forEach(t => {
                if(!t) return;
                try {
                    let e = new KeyboardEvent('keydown', {
                        key: 's', code: 'KeyS', keyCode: keyCode, which: keyCode,
                        bubbles: true, cancelable: true, view: window
                    });
                    t.dispatchEvent(e);
                    // 补全 keyup
                    let eUp = new KeyboardEvent('keyup', {
                        key: 's', code: 'KeyS', keyCode: keyCode, which: keyCode,
                        bubbles: true, cancelable: true, view: window
                    });
                    t.dispatchEvent(eUp);
                    log(`   -> S键已发送给 <${t.tagName}>`);
                } catch(e) { log(`ERROR: ${e.message}`, "red"); }
            });
        }

        if (keyName === 'h') {
            // H键：Firefox 增强补丁
            const keyCode = 72;  // H
            const charCode = 104; // h
            
            targets.forEach(t => {
                if(!t) return;
                // KeyDown
                try {
                    let e = new KeyboardEvent('keydown', {
                        key: 'h', code: 'KeyH', keyCode: keyCode, which: keyCode,
                        bubbles: true, cancelable: true, view: window
                    });
                    Object.defineProperty(e, 'keyCode', { get: () => keyCode });
                    Object.defineProperty(e, 'which', { get: () => keyCode });
                    Object.defineProperty(e, 'charCode', { get: () => 0 });
                    t.dispatchEvent(e);
                } catch(err) {}

                // KeyPress
                try {
                    let e = new KeyboardEvent('keypress', {
                        key: 'h', code: 'KeyH', keyCode: 0, which: charCode,
                        bubbles: true, cancelable: true, view: window
                    });
                    Object.defineProperty(e, 'keyCode', { get: () => 0 });
                    Object.defineProperty(e, 'charCode', { get: () => charCode });
                    Object.defineProperty(e, 'which', { get: () => charCode });
                    t.dispatchEvent(e);
                    log(`   -> H键(Press)已发送给 <${t.tagName}>`);
                } catch(err) {}
            });
        }
    }

    // ==========================================
    // 5. 核心逻辑 (V34 Play/Pause 监听)
    // ==========================================
    let clickCount = 0;
    let actionTimer = null;
    let lastEventTime = 0;   
    let lastTriggerTime = 0;
