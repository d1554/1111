// ==UserScript==
// @name         媒体键映射：下一首->S，上一首->H (全平台通用)
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  将“下一首”映射为“S”键，“上一首”映射为“H”键，支持 Win/Android
// @author       Gemini
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. 屏幕提示 (调试用) ---
    function showToast(text) {
        const div = document.createElement('div');
        div.textContent = text;
        div.style.cssText = `
            position: fixed; top: 10%; left: 50%; transform: translate(-50%, 0);
            background: rgba(0,0,0,0.8); color: #00ff00; padding: 8px 16px;
            border-radius: 4px; z-index: 999999; font-size: 14px; pointer-events: none;
            font-family: monospace; border: 1px solid #fff;
        `;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 1500);
    }

    // --- 2. 通用按键模拟函数 ---
    // keyChar: 字符 (如 's'), keyCodeVal: 数字码 (如 83), codeStr: 物理键码 (如 'KeyS')
    function simulateKey(keyChar, keyCodeVal, codeStr) {
        showToast(`媒体指令 -> 模拟 ${keyChar.toUpperCase()} 键`);
        console.log(`Mapping Media Key -> ${keyChar.toUpperCase()}`);

        const keyInfo = {
            key: keyChar,
            code: codeStr,
            keyCode: keyCodeVal,
            which: keyCodeVal,
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window
        };

        // 获取当前焦点元素，如果没有则默认发给 body
        const target = document.activeElement || document.body;

        // 发送完整的按键事件序列
        target.dispatchEvent(new KeyboardEvent('keydown', keyInfo));
        target.dispatchEvent(new KeyboardEvent('keypress', keyInfo));
        target.dispatchEvent(new KeyboardEvent('keyup', keyInfo));
    }

    // 定义具体的映射动作
    const triggerS = () => simulateKey('s', 83, 'KeyS'); // 下一首 -> S
    const triggerH = () => simulateKey('h', 72, 'KeyH'); // 上一首 -> H

    // --- 3. Media Session 劫持 (核心) ---
    function hijackMediaSession() {
        if (!navigator.mediaSession) return;

        try {
            // 注册“下一首”
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                triggerS();
            });

            // 注册“上一首”
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                triggerH();
            });

            // 注册播放/暂停 (防止按键穿透去启动系统播放器，这里我们只占位不执行具体操作)
            navigator.mediaSession.setActionHandler('play', () => console.log('play block'));
            navigator.mediaSession.setActionHandler('pause', () => console.log('pause block'));
        } catch (e) {
            console.error('MediaSession setup failed:', e);
        }
    }

    // --- 4. 键盘备用监听 (针对 Windows 旧键盘) ---
    // 有些键盘不走 MediaSession API，而是直接发特殊键码
    window.addEventListener('keydown', (e) => {
        if (e.key === 'MediaTrackNext') {
            e.preventDefault(); // 阻止系统默认行为
            triggerS();
        } else if (e.key === 'MediaTrackPrevious') {
            e.preventDefault();
            triggerH();
        }
    }, true);

    // --- 5. 激活“幽灵音频” (抢夺系统媒体焦点) ---
    function initGhostAudio() {
        // 创建一个静音音频
        const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAgZGF0YQQAAAAAAA==');
        audio.loop = true;
        audio.volume = 0.001; // 极小音量

        const activate = () => {
            audio.play().then(() => {
                console.log('Media Focus Acquired');
                showToast('媒体控制已接管 (S/H)');
                hijackMediaSession();
                // 成功后移除监听，避免每次点击都触发
                ['click', 'keydown', 'touchstart'].forEach(evt =>
                    document.removeEventListener(evt, activate)
                );
            }).catch(e => console.warn('Autoplay blocked', e));
        };

        // 需要用户交互才能播放音频
        ['click', 'keydown', 'touchstart'].forEach(evt =>
            document.addEventListener(evt, activate)
        );
    }

    // --- 6. 启动 ---
    if (document.readyState === 'complete') {
        initGhostAudio();
    } else {
        window.addEventListener('load', initGhostAudio);
    }

})();