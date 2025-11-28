// ==UserScript==
// @name         安卓按键代码测试
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  检测安卓设备按键代码
// @author       Gemini
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 创建一个悬浮窗显示按键信息
    const infoBox = document.createElement('div');
    infoBox.style.position = 'fixed';
    infoBox.style.top = '10px';
    infoBox.style.right = '10px';
    infoBox.style.background = 'rgba(0,0,0,0.7)';
    infoBox.style.color = '#fff';
    infoBox.style.padding = '10px';
    infoBox.style.zIndex = '99999';
    infoBox.style.fontSize = '14px';
    infoBox.innerText = '请按下一首键...';
    document.body.appendChild(infoBox);

    document.addEventListener('keydown', function(e) {
        // 显示按下的键的信息
        infoBox.innerText = `Key: ${e.key} | Code: ${e.code} | KeyCode: ${e.keyCode}`;
        console.log(`按键检测: Key: ${e.key}, Code: ${e.code}, KeyCode: ${e.keyCode}`);
    }, true);
})();
