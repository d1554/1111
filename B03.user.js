// ==UserScript==
// @name         Media Key Remap (Double-Click Support)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  双击暂停键触发s，单击暂停键触发h，解决冲突问题
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ================= 配置区域 =================
    // 双击判定时间 (毫秒)。
    // 如果觉得单击反应太慢，调小这个值 (例如 200)
    // 如果觉得双击很难触发（老是变成两次单击），调大这个值 (例如 300)
    const DOUBLE_CLICK_DELAY = 250; 
    // ===========================================

    let playPauseTimer = null;

    // 模拟按键触发函数
    function simulateKey(keyChar) {
        const keyCodeMap = {
            's': 83,
            'h': 72
        };
        const codeMap = {
            's': 'KeyS',
            'h': 'KeyH'
        };

        const eventConfig = {
            key: keyChar,
            code: codeMap[keyChar],
            keyCode: keyCodeMap[keyChar],
            which: keyCodeMap[keyChar],
            bubbles: true,
            cancelable: true,
            view: window
        };

        // 触发 keydown
        document.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
        // 触发 keyup (可选，为了模拟更真实)
        document.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
        
        console.log(`[脚本] 已模拟触发按键: ${keyChar}`);
    }

    // 核心监听逻辑
    window.addEventListener('keydown', function(e) {
        // 监听播放/暂停键 (通常是耳机按钮或多媒体键盘)
        if (e.key === 'MediaPlayPause') {
            
            // 1. 阻止默认行为（防止网页自带的播放/暂停生效，也防止事件冒泡）
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (playPauseTimer) {
                // === 情况：双击 ===
                // 计时器存在，说明距离上次按下还不到设定时间
                console.log('[脚本] 检测到双击 -> 触发 s');
                
                // 关键步骤：清除还没执行的单击计时器！
                clearTimeout(playPauseTimer);
                playPauseTimer = null;

                // 立即执行双击动作
                simulateKey('s');

            } else {
                // === 情况：单击（可能是双击的第一下）===
                console.log('[脚本] 检测到第一次点击 -> 等待判断...');
                
                // 启动倒计时
                playPauseTimer = setTimeout(() => {
                    // 时间到了还没被清除，说明不是双击，是真单击
                    console.log('[脚本] 判定为单击 -> 触发 h');
                    simulateKey('h');
                    
                    // 重置计时器变量
                    playPauseTimer = null;
                }, DOUBLE_CLICK_DELAY);
            }
            
            return false;
        }
    }, true); // useCapture = true，确保在网页接收到事件前拦截

})();
