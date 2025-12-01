// ==UserScript==
// @name         S键映射 (V36 顽固Debug版)
// @namespace    http://tampermonkey.net/
// @version      36.0
// @description  强制显示Debug窗口，包含“不死鸟”机制，防止被网页清除
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    console.log(">>> V36 脚本已注入 - 等待页面加载...");

    // ==========================================
    // --- UI 守护进程 (不死鸟机制) ---
    // ==========================================
    let debugPanel = null;
    let counterBox = null;

    function ensureUI() {
        // 1. 检查/创建 Debug 窗口
        if (!document.getElementById('gemini-debug-panel')) {
            if (document.body) {
                debugPanel = document.createElement('div');
                debugPanel.id = 'gemini-debug-panel';
                debugPanel.style.cssText = `
                    position: fixed; top: 100px; right: 20px; width: 300px; max-height: 80vh;
                    background: rgba(0, 0, 0, 0.85); color: #0f0; font-family: monospace;
                    font-size: 13px; z-index: 2147483647; overflow-y: auto;
                    padding: 10px; border: 2px solid #fff; border-radius: 5px;
                    pointer-events: auto; user-select: text; box-shadow: 0 0 15px rgba(0,0,0,0.8);
                `;
                // 插入一个标题
                const title = document.createElement('div');
                title.innerText = "=== V36 Debug 监视器 ===";
                title.style.borderBottom = "1px solid #fff";
                title.style.marginBottom = "5px";
                debugPanel.appendChild(title);
                
                document.body.appendChild(debugPanel);
                log("UI 重建成功 (页面可能刷新过)");
            }
        } else {
            // 如果存在，重新获取引用，防止引用丢失
            debugPanel = document.getElementById('gemini-debug-panel');
        }

        // 2. 检查/创建 计数器
        if (!document.getElementById('gemini-counter-box')) {
            if (document.body) {
                counterBox = document.createElement('div');
                counterBox.id = 'gemini-counter-box';
                counterBox.style.cssText = `
                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    font-size: 80px; font-weight: 900; color: rgba(255, 255, 255, 0.9);
                    text-shadow: 0 0 10px #000; z-index: 2147483647; pointer-events: none;
                    display: none; font-family: sans-serif; transition: transform 0.1s;
                `;
                document.body.appendChild(counterBox);
            }
        } else {
            counterBox = document.getElementById('gemini-counter-box');
        }
    }

    // 每1秒检查一次UI是否健在
    setInterval(ensureUI, 1000);

    // ==========================================
    // --- 日志系统 (屏幕 + F12控制台) ---
    // ==========================================
    function log(msg) {
        const time = new Date().toISOString().split('T')[1].slice(0, -1);
        const fullMsg = `[${time}] ${msg}`;
        
        // 1. 输出到 F12 控制台 (防止屏幕UI挂掉看不到)
        console.log(`🔷脚本日志: ${msg}`);

        // 2. 输出到屏幕 Debug 窗口
        if (debugPanel) {
            const line = document.createElement('div');
            line.style.borderBottom = "1px solid #333";
            line.style.padding = "2px 0";
            line.innerText = fullMsg;
            // 插入到标题下方
            if (debugPanel.children.length > 1) {
                debugPanel.insertBefore(line, debugPanel.children[1]);
            } else {
                debugPanel.appendChild(line);
            }
            // 保持日志长度
            if (debugPanel.children.length > 40) {
                debugPanel.removeChild(debugPanel.lastChild);
            }
        }
    }

    // ==========================================
    // --- 计数器显示 ---
    // ==========================================
    let counterHideTimer;
    function showCounter(num, color = '#fff') {
        if (!counterBox) ensureUI(); // 确保存在
        if (!counterBox) return;

        counterBox.innerText = num;
        counterBox.style.color = color;
        counterBox.style.display = 'block';
        counterBox.style.transform = 'translate(-50%, -50%) scale(1.2)';
        
        setTimeout(() => {
            if(counterBox) counterBox.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 50);

        clearTimeout(counterHideTimer);
        counterHideTimer = setTimeout(() => {
            if(counterBox) counterBox.style.display = 'none';
        }, 500);
    }

    // ==========================================
    // --- 键盘发射器 ---
    // ==========================================
    function triggerKey(keyName) {
        log(`【发射】 >>> 模拟按键: ${keyName.toUpperCase()}`);
        let keyChar, keyCode;
        
        if (keyName === 's') {
            keyChar = 's'; keyCode = 83;
        } else if (keyName === 'h') {
            keyChar = 'h'; keyCode = 72;
            showCounter("H", "#3388ff");
        }

        const eventConfig = {
            key: keyChar, 
            code: 'Key' + keyChar.toUpperCase(),
            keyCode: keyCode, 
            which: keyCode,
            bubbles: true, cancelable: true, view: window
        };
        
        const targets = [document.activeElement, document.body];
        targets.forEach(t => {
            if(t) {
                try {
                    t.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
                    t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
                } catch(e) {}
            }
        });
    }

    // ==========================================
    // --- 核心逻辑 ---
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

        // 过滤无关事件
        if (e.type !== 'play' && e.type !== 'pause') return;

        // --- Log 状态 ---
        const eventInfo = `Evt:${e.type}|Seek:${target.seeking}`;

        // 1. 特殊状态拦截
        if (target.ended) { log(`${eventInfo}->Ended(跳过)`); return; }
        if (target.seeking) { log(`${eventInfo}->Seeking(跳过)`); return; }

        const now = Date.now();
        
        // 2. 防抖
        if (now - lastEventTime < EVENT_DEBOUNCE) {
            // log(`${eventInfo}->防抖(跳过)`); // 减少刷屏
            return;
        }
        lastEventTime = now;

        // 3. 冷却
        if (now - lastTriggerTime < COOL_DOWN) {
            clickCount = 0;
            log(`${eventInfo}->冷却中(跳过)`);
            return;
        }

        // 4. 视频源切换检测
        if (lastTarget && lastTarget !== target) {
            log(`!!! 视频源变了，重置 !!!`);
            clickCount = 0;
            if (actionTimer) clearTimeout(actionTimer);
        }
        lastTarget = target;

        // 5. 逻辑处理
        if (actionTimer) {
            clearTimeout(actionTimer);
            actionTimer = null;
        }

        clickCount++;
        log(`>>> 点击有效! Count: ${clickCount}`);
        showCounter(clickCount.toString(), "rgba(255,255,255,0.8)");

        if (clickCount >= 3) {
            log(`!!! 满足3连击 -> 触发 H !!!`);
            triggerKey('h');
            clickCount = 0;
            lastTriggerTime = now;
        } else {
            log(`...等待下一次点击 (${WAIT_FOR_NEXT_CLICK}ms)`);
            actionTimer = setTimeout(() => {
                log(`⏰ 超时结算: 共 ${clickCount} 击`);
                if (clickCount === 2) {
                    log(`>>> 触发 S (双击)`);
                    triggerKey('s');
                    lastTriggerTime = Date.now();
                }
                clickCount = 0;
            }, WAIT_FOR_NEXT_CLICK);
        }
    }

    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);
    
    // 立即运行一次UI检查
    ensureUI();

})();
