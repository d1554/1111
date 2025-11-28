// ==UserScript==
// @name         安卓媒体键 - 焦点陷阱测试版
// @namespace    http://tampermonkey.net/
// @version      7.0
// @description  创建一个隐形输入框并强制聚焦，尝试捕获底层按键信号
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    //Configs: 替换你的按钮选择器
    const NEXT_SELECTOR = '.你的下一首按钮'; 
    const PREV_SELECTOR = '.你的上一首按钮';

    // 1. 创建调试面板 (红字)
    const debug = document.createElement('div');
    debug.style.cssText = 'position:fixed;top:0;left:0;z-index:999999;color:red;background:rgba(255,255,255,0.9);font-size:12px;padding:5px;pointer-events:none;max-width:100%;word-break:break-all;font-weight:bold;';
    debug.innerHTML = "等待激活...";
    document.body.appendChild(debug);

    function log(msg) {
        debug.innerHTML = msg + "<br>" + debug.innerHTML;
    }

    // 2. 创建“输入框陷阱”
    const trapInput = document.createElement('input');
    trapInput.type = 'text';
    // 设置为透明，但不能 display:none，否则无法聚焦
    trapInput.style.cssText = 'position:fixed; bottom:0; right:0; width:10px; height:10px; opacity:0.01; z-index:9999; border:none; background:transparent;';
    
    // 关键：禁止虚拟键盘弹出！否则手机打字盘会跳出来挡住屏幕
    trapInput.inputMode = 'none'; 
    trapInput.setAttribute('readonly', 'readonly'); // 有些浏览器需要这个
    
    document.body.appendChild(trapInput);

    // 3. 强制聚焦逻辑
    let isTrapped = false;

    function activateTrap() {
        if(isTrapped) return;
        
        trapInput.focus();
        isTrapped = true;
        log("✅ 陷阱已激活！焦点在隐形输入框中。");
        log("👉 请按遥控器/耳机的按键测试");
        
        // 持续保持焦点，防止点别的地方失效
        trapInput.addEventListener('blur', () => {
            setTimeout(() => {
                trapInput.focus();
                // log("自动夺回焦点"); 
            }, 50);
        });
    }

    // 4. 监听陷阱里的按键事件
    trapInput.addEventListener('keydown', (e) => {
        // 阻止默认行为
        e.preventDefault();
        e.stopPropagation();

        const code = e.code;
        const key = e.key;
        const keyCode = e.keyCode;

        log(`捕获: code=${code} key=${key} keyCode=${keyCode}`);

        // 匹配逻辑
        // 大部分安卓设备的下一首是 176 或 MediaTrackNext
        if (keyCode === 176 || code === 'MediaTrackNext' || key === 'MediaTrackNext') {
            clickBtn(NEXT_SELECTOR, "下一首");
        }
        else if (keyCode === 177 || code === 'MediaTrackPrevious' || key === 'MediaTrackPrevious') {
            clickBtn(PREV_SELECTOR, "上一首");
        }
        // 特殊情况：有些线控耳机是 HeadsetHook (keyCode 79)
        else if (keyCode === 79 || code === 'HeadsetHook') {
             // 这种键通常只有单键，可以定义为“下一首”或“暂停”
             clickBtn(NEXT_SELECTOR, "线控(HeadsetHook)");
        }
    });

    // 辅助点击函数
    function clickBtn(sel, source) {
        const btn = document.querySelector(sel);
        if (btn) {
            btn.click();
            log(`✅ 已触发点击: ${source}`);
        } else {
            log(`❌ 收到信号但找不到按钮: ${sel}`);
        }
    }

    // 用户点击页面任意处开始
    document.addEventListener('click', activateTrap);
    document.addEventListener('touchstart', activateTrap);

})();
