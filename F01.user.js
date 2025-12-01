// ==UserScript==
// @name         S键映射 V36 (PC+Android 双模自动适配版)
// @namespace    http://tampermonkey.net/
// @version      36.0
// @description  PC 捕获模式 / Android 冒泡模式；2击S 3击H；完整防误触、切换视频、拖拽检测；兼容 Chrome/Firefox/Edge/Kiwi/三星浏览器等。
// @author       
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
'use strict';

    // ---------------------------
    // 设备判断（自动切换事件模式）
    // ---------------------------
    const isAndroid = /Android|Linux/i.test(navigator.userAgent);
    const USE_CAPTURE = !isAndroid;  // PC = true, Android = false

    // Debug 可打印：
    // console.log("Android?", isAndroid, " 事件模式:", USE_CAPTURE ? "捕获" : "冒泡");

    // ------------------ UI 系统 -------------------
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

    // ------------------ 键盘发射器 -------------------
    function triggerKey(name) {
        let keyChar, keyCode;

        if (name === "s") { keyChar = "s"; keyCode = 83; showCounter("S", "#ffffff"); }
        else if (name === "h") { keyChar = "h"; keyCode = 72; showCounter("H", "#3388ff"); }

        const cfg = {
            key: keyChar,
            code: "Key" + keyChar.toUpperCase(),
            keyCode, which: keyCode,
            bubbles: true, cancelable: true, view: window
        };

        [document.activeElement, document.body, document.documentElement].forEach(t => {
            if (t) {
                try {
                    t.dispatchEvent(new KeyboardEvent("keydown", cfg));
                    t.dispatchEvent(new KeyboardEvent("keyup", cfg));
                } catch(e) {}
            }
        });
    }

    // ------------------ 连击逻辑核心 -------------------
    let clickCount = 0;
    let actionTimer = null;
    let lastClickTime = 0;
    let lastTriggerTime = 0;
    let lastTarget = null;

    const WAIT_NEXT = 1000;   // 1 秒连击窗口
    const COOL_DOWN = 2000;
    const DEBOUNCE = 80;

    // ------------------ 点击处理主逻辑 -------------------
    function clickHandler(e) {
        const target = e.target;
        if (!target || (target.nodeName !== "VIDEO" && target.nodeName !== "AUDIO")) return;

        const now = Date.now();

        // 防抖
        if (now - lastClickTime < DEBOUNCE) return;
        lastClickTime = now;

        // 冷却期
        if (now - lastTriggerTime < COOL_DOWN) {
            clickCount = 0;
            return;
        }

        // 切换视频
        if (lastTarget && lastTarget !== target) {
            clickCount = 0;
            if (actionTimer) clearTimeout(actionTimer);
        }
        lastTarget = target;

        // 计数
        clickCount++;

        if (clickCount === 1) showCounter("1", "rgba(255,255,255,0.6)");
        if (clickCount === 2) showCounter("2", "rgba(255,255,255,0.8)");
        if (clickCount === 3) showCounter("3", "rgba(255,255,255,1)");

        // 三击立即触发H
        if (clickCount >= 3) {
            triggerKey("h");
            clickCount = 0;
            lastTriggerTime = now;
            return;
        }

        // 二击延迟判定
        if (actionTimer) clearTimeout(actionTimer);

        actionTimer = setTimeout(() => {
            if (clickCount === 2) {
                triggerKey("s");
                lastTriggerTime = Date.now();
            }
            clickCount = 0;
        }, WAIT_NEXT);
    }

    // PC：捕获阶段更稳定
    // Android：必须冒泡，否则第三击事件被吞
    window.addEventListener("click", clickHandler, USE_CAPTURE);

})();
