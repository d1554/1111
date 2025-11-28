// ==UserScript==
// @name         按键诊断 (Key Diagnosis)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  检测所有按键事件
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function logKey(e) {
        // 在页面上直接显示，方便手机查看
        let msg = `监测到按键: code=${e.code}, key=${e.key}, keyCode=${e.keyCode}`;
        console.log(msg);

        // 创建或更新一个悬浮框来显示结果
        let box = document.getElementById('debug-box');
        if (!box) {
            box = document.createElement('div');
            box.id = 'debug-box';
            box.style.cssText = 'position:fixed; top:10px; left:10px; z-index:99999; background:red; color:white; padding:10px; font-size:16px; pointer-events:none;';
            document.body.appendChild(box);
        }
        box.innerText = msg;
    }

    // 使用 true (Capture Phase) 试图在事件冒泡前捕获
    window.addEventListener('keydown', logKey, true);
    window.addEventListener('keyup', logKey, true);
    
    // 监听媒体会话API (如果是媒体键问题)
    if ('mediaSession' in navigator) {
        console.log("MediaSession API 存在");
        // 尝试重写 handler 看是否触发
        ['previoustrack', 'nexttrack', 'play', 'pause'].forEach(action => {
            try {
                navigator.mediaSession.setActionHandler(action, () => {
                    let msg = `MediaSession 触发: ${action}`;
                    console.log(msg);
                    let box = document.getElementById('debug-box');
                    if(box) box.innerText = msg;
                });
            } catch(err) {
                console.log(`无法设置 ${action}: ${err}`);
            }
        });
    }
})();
