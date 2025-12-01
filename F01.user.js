// ==UserScript==
// @name         S键映射 (调试专用版 V40)
// @namespace    http://tampermonkey.net/
// @version      40.0
// @description  屏幕右下角显示日志，诊断三连击H键为何失效
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
            position: fixed; bottom: 10px; right: 10px; width: 60%; height: 200px;
            background: rgba(0,0,0,0.85); color: #0f0; font-size: 12px;
            overflow-y: auto; z-index: 2147483647; padding: 5px;
            border: 1px solid #fff; pointer-events: none; font-family: monospace;
        `;
        document.body.appendChild(debugBox);
        log(">>> 调试器已启动 (V40)");
        log(">>> 等待播放操作...");
    }
    
    function log(msg, color = '#0f0') {
        if (!debugBox) return;
        const line = document.createElement('div');
        const time = new Date().toLocaleTimeString().split(' ')[0];
        line.innerText = `[${time}] ${msg}`;
        line.style.color = color;
        line.style.borderBottom = "1px solid #333";
        debugBox.appendChild(line);
        debugBox.scrollTop = debugBox.scrollHeight;
    }
    initDebug();

    // ==========================================
    // 2. 键盘事件嗅探器 (Global Sniffer)
    // 用于验证：我们发出的键，浏览器到底收到了没？
    // ==========================================
    window.addEventListener('keydown', (e) => {
        // 如果是脚本模拟的，isTrusted 通常为 false
        const src = e.isTrusted ? "真实按键" : "脚本模拟";
        const color = e.key.toLowerCase() === 'h' ? '#ff00ff' : '#fff';
        log(`【监听捕获】${src}: Key=${e.key} | Code=${e.keyCode}`, color);
    }, true); // 使用捕获模式(true)，确保最先听到

    // ==========================================
    // 3. UI 计数显示 (Counter)
    // ==========================================
    let counterBox = null;
    function initUI() {
        if (document.body) {
            counterBox = document.createElement('div');
            counterBox.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                font-size: 60px; font-weight: 900; color: rgba(255, 255, 255, 0.8);
                text-shadow: 0 0 10px #000; z-index: 2147483646; pointer-events: none;
                display: none;
            `;
            document.body.appendChild(counterBox);
        }
    }
    initUI();

    function showCounter(num) {
        if (!counterBox) return;
        counterBox.innerText = num;
        counterBox.style.display = 'block';
        setTimeout(() => counterBox.style.display = 'none', 500);
    }

    // ==========================================
    // 4. 键盘发射器 (Trigger)
    // ==========================================
    function triggerKey(keyName, originalTarget) {
        log(`>>> 准备发射: ${keyName.toUpperCase()} 键`, "#ffa500");
        
        setTimeout(() => {
            let keyChar = keyName;
            let keyCode = (keyName === 's') ? 83 : 72;

            const eventConfig = {
                key: keyChar, 
                code: 'Key' + keyChar.toUpperCase(),
                keyCode: keyCode, 
                which: keyCode,
                bubbles: true, cancelable: true, view: window
            };

            // 目标列表：视频本身 + 它的父级 + document + window
            let targets = [window, document, document.body];
            if (originalTarget) {
                targets.push(originalTarget); // 视频元素
                if (originalTarget.parentElement) targets.push(originalTarget.parentElement); // 父级
            }
            targets = [...new Set(targets)]; // 去重

            let successCount = 0;
            targets.forEach(t => {
                if(t) {
                    try {
                        let evt = new KeyboardEvent('keydown', eventConfig);
                        // 强制改写属性以骗过 Firefox
                        Object.defineProperty(evt, 'keyCode', { get: () => keyCode });
                        Object.defineProperty(evt, 'which', { get: () => keyCode });
                        
                        t.dispatchEvent(evt);
                        t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
                        
                        // 只有发给 window 或 body 时才记录日志，避免刷屏
                        if (t === window || t === document.body) {
                            // log(`   -> 发送给 ${t.nodeName || 'Window'}`);
                        }
                        successCount++;
                    } catch(e) {
                        log(`   -> 发送失败: ${e.message}`, "red");
                    }
                }
            });
            log(`>>> 发射完成，覆盖 ${successCount} 个目标`, "#ffa500");

        }, 250); // 延迟250ms
    }

    // ==========================================
    // 5. 核心逻辑
    // ==========================================
    let clickCount = 0;
    let actionTimer = null;
    let lastEventTime = 0;   
    let lastTriggerTime = 0; 
    let lastTarget = null; 

    const WAIT_FOR_NEXT_CLICK = 1000; 
    const COOL_DOWN = 2000;           
    const EVENT_DEBOUNCE = 50;        

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;

        // 这里的日志用来确认脚本是否“活着”
        // log(`事件: ${e.type}`, "#888");

        if (target.ended || target.seeking) return;
        if (target.duration && Math.abs(target.currentTime - target.duration) < 0.5) return;

        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();
        if (now - lastEventTime < EVENT_DEBOUNCE) return;
        lastEventTime = now;
        
        if (now - lastTriggerTime < COOL_DOWN) {
            log("冷却中...", "#888");
            clickCount = 0; 
            return;
        }

        if (lastTarget && lastTarget !== target) {
            clickCount = 0;
            if (actionTimer) clearTimeout(actionTimer);
        }
        lastTarget = target; 

        if (actionTimer) clearTimeout(actionTimer);

        clickCount++;
        log(`点击计数: ${clickCount}`, "#0ff");
        showCounter(clickCount);

        if (clickCount >= 3) {
            log("!!! 触发三连击逻辑 !!!", "#ff0");
            triggerKey('h', target); 
            clickCount = 0;
            lastTriggerTime = now; 
        } else {
            actionTimer = setTimeout(() => {
                if (clickCount === 2) {
                    log("!!! 触发双击逻辑 !!!", "#ff0");
                    triggerKey('s', target);
                    lastTriggerTime = Date.now();
                }
                clickCount = 0; 
            }, WAIT_FOR_NEXT_CLICK);
        }
    }

    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
