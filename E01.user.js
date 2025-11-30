// ==UserScript==
// @name         S键映射 (防切换/防拖拽误触版)
// @namespace    http://tampermonkey.net/
// @version      34.0
// @description  1秒宽容度：2连击S，3连击H；修复切换视频、拖拽进度条自动触发S的问题
// @author       Gemini Helper
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. UI 系统 ---
    let counterBox = null;

    function initUI() {
        if (document.body) {
            counterBox = document.createElement('div');
            counterBox.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                font-size: 60px; font-weight: 900; color: rgba(255, 255, 255, 0.8);
                text-shadow: 0 0 10px #000; z-index: 2147483647; pointer-events: none;
                display: none; font-family: sans-serif; transition: transform 0.1s;
            `;
            document.body.appendChild(counterBox);
        } else {
            requestAnimationFrame(initUI);
        }
    }
    initUI();

    let counterHideTimer;
    function showCounter(num, color = '#fff') {
        if (!counterBox) return;
        counterBox.innerText = num;
        counterBox.style.color = color;
        counterBox.style.display = 'block';
        counterBox.style.transform = 'translate(-50%, -50%) scale(1.1)';
        
        setTimeout(() => counterBox.style.transform = 'translate(-50%, -50%) scale(1)', 50);

        clearTimeout(counterHideTimer);
        counterHideTimer = setTimeout(() => {
            counterBox.style.display = 'none';
        }, 500);
    }

    // --- 2. 键盘发射器 ---
    function triggerKey(keyName) {
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
        
        const targets = [document.activeElement, document.body, document.documentElement];
        targets.forEach(t => {
            if(t) {
                try {
                    t.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
                    t.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
                } catch(e) {}
            }
        });
    }

    // --- 3. 核心逻辑 (V34 增强版) ---
    let clickCount = 0;
    let actionTimer = null;
    let lastEventTime = 0;   
    let lastTriggerTime = 0; 
    let lastTarget = null; // 【新增】记录上一次操作的视频元素

    // 配置参数
    const WAIT_FOR_NEXT_CLICK = 1000; 
    const COOL_DOWN = 2000;           
    const EVENT_DEBOUNCE = 50;        

    function globalHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== 'VIDEO' && target.nodeName !== 'AUDIO')) return;

        // ---------------- 防误触检测区 ----------------
        
        // 1. 播放结束检测
        if (target.ended) return; 
        if (target.duration && Math.abs(target.currentTime - target.duration) < 0.5) return;

        // 2. 【核心修复】寻找进度(Seeking)检测
        // 如果视频正在调整进度（比如手动拖拽、代码跳转），seeking 属性为 true
        // 这时产生的 play/pause 事件应被忽略
        if (target.seeking) return;

        // --------------------------------------------

        if (e.type !== 'play' && e.type !== 'pause') return;

        const now = Date.now();

        // 0. 事件防抖
        if (now - lastEventTime < EVENT_DEBOUNCE) return;
        lastEventTime = now;
        
        // 1. 冷却期检查
        if (now - lastTriggerTime < COOL_DOWN) {
            clickCount = 0; 
            return;
        }

        // 2. 【核心修复】切换视频检测
        // 如果当前触发事件的视频元素，和上一次的不一样（说明切换了视频）
        // 则强制重置计数器，把它当作新的第一次点击
        if (lastTarget && lastTarget !== target) {
            clickCount = 0;
            if (actionTimer) {
                clearTimeout(actionTimer);
                actionTimer = null;
            }
        }
        lastTarget = target; // 更新记录

        // 3. 计数增加前清理旧定时器
        if (actionTimer) {
            clearTimeout(actionTimer);
            actionTimer = null;
        }

        // 4. 计数增加
        clickCount++;

        // 5. UI 反馈
        if (clickCount === 1) showCounter("1", "rgba(255,255,255,0.6)");
        if (clickCount === 2) showCounter("2", "rgba(255,255,255,0.8)");
        if (clickCount === 3) showCounter("3", "rgba(255,255,255,1.0)");

        // 6. 触发判定
        if (clickCount >= 3) {
            triggerKey('h');
            clickCount = 0;
            lastTriggerTime = now; 
        } else {
            actionTimer = setTimeout(() => {
                if (clickCount === 2) {
                    triggerKey('s');
                    lastTriggerTime = Date.now();
                }
                clickCount = 0; 
            }, WAIT_FOR_NEXT_CLICK);
        }
    }

    window.addEventListener('play', globalHandler, true);
    window.addEventListener('pause', globalHandler, true);

})();
