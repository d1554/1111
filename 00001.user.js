// ==UserScript==
// @name              MissAV Enhanced Assistant
// @name              MissAV Enhancer
// @name:zh           MissAV 增强小助手 (纯净常显版)
// @name:zh-CN        MissAV 增强小助手 (纯净常显版)
// @name:zh-HK        MissAV 增強小助手 (純淨常顯版)
// @name:zh-TW        MissAV 增強小助手 (純淨常顯版)
// @description:zh    原生控制栏常显(不自动隐藏) | 去除广告 | 后台播放 | 自动播放 | 完整标题
// @description:zh-CN 原生控制栏常显(不自动隐藏) | 去除广告 | 后台播放 | 自动播放 | 完整标题
// @description:zh-HK 原生控制欄常顯(不自動隱藏) | 去除廣告 | 後台播放 | 自動播放 | 完整標題
// @description:zh-TW 原生控制欄常顯(不自動隱藏) | 去除廣告 | 後台播放 | 自動播放 | 完整標題
// @run-at            document-start
// @grant             unsafeWindow
// @grant             GM_addStyle
// @match             https://missav123.com/*
// @match             https://missav.ws/*
// @match             https://missav.live/*
// @match             https://missav.ai/*
// @match             https://missav.com/*
// @match             https://thisav.com/*
// @author            DonkeyBear,track no,mrhydra,iSwfe,人民的勤务员 <china.qinwuyuan@gmail.com>
// @namespace         https://github.com/ChinaGodMan/UserScripts
// @supportURL        https://github.com/ChinaGodMan/UserScripts/issues
// @homepageURL       https://github.com/ChinaGodMan/UserScripts
// @license           MIT
// @icon              https://raw.githubusercontent.com/ChinaGodMan/UserScriptsHistory/main/scriptsIcon/missav-auto-login-helper.png
// @compatible        chrome
// @compatible        firefox
// @compatible        edge
// @compatible        opera
// @compatible        safari
// @compatible        kiwi
// @version           2025.04.27.1345
// @created           2025-03-07 21:14:34
// @modified          2025-03-07 21:14:34
// @downloadURL https://update.greasyfork.org/scripts/529125/MissAV%20Enhanced%20Assistant.user.js
// @updateURL https://update.greasyfork.org/scripts/529125/MissAV%20Enhanced%20Assistant.meta.js
// ==/UserScript==

const url = window.location.href
if (/^https:\/\/(missav|thisav)\.com/.test(url)) {
    window.location.href = url.replace('missav.com', 'missav.live').replace('thisav.com', 'missav.live')
}

// ==========================================
// 【核心修改：强制控制栏常显】
// ==========================================
GM_addStyle(`
    /* 1. 强制播放器控制栏永远不透明（一直显示） */
    .plyr--video .plyr__controls {
        opacity: 1 !important;
        visibility: visible !important;
        transform: translate(0, 0) !important; /* 防止它向下位移隐藏 */
        pointer-events: auto !important; /* 确保一直可以点击 */
        background: linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.75)) !important; /* 加深底部阴影，保证白色文字清晰可见 */
        padding-bottom: 10px !important; /* 稍微增加底部间距，防止贴底太紧 */
    }

    /* 2. 针对移动端/iPad，防止系统自动隐藏类生效 */
    .plyr--hide-controls .plyr__controls {
        opacity: 1 !important;
        visibility: visible !important;
    }

    /* 3. 优化视频标题样式（如果需要） */
    div.my-2.text-sm.text-nord4.truncate { 
        white-space: normal; 
    }
`);

(() => {
    'use strict'
    const videoSettings = {
        // 【开关】背景色覆盖iPhone非安全区
        viewportFitCover: false,
        // 后台禁止自动暂停模式
        autoPauseDisable: 1, // 0:默认模式, 1:禁止所有暂停播放
        // 自动静音播放 (保持 true 以确保起播)
        autoMutePlay: true
    };

    (() => {
        // 【沉浸式状态栏/网页主题色】
        var meta = document.createElement('meta')
        meta.name = 'theme-color'
        meta.content = '#090811'
        document.querySelector('head').appendChild(meta)
        // 【横屏左右沉浸式背景色】
        if (videoSettings.viewportFitCover) {
            var viewport = document.querySelector('head > meta[name=viewport]')
            viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
        }
    })()

    var handle = () => {
        console.log('【视频控制条增强】开始...')
        // 【页面内容区域】
        var content = document.querySelector('body > div:nth-child(3) > div.sm\\:container > div > div.flex-1.order-first > div:first-child')
        // 【视频区域】
        var video = content.querySelector('div:first-child')
        video.id = 'video'
        video.classList.value = 'relative -mx-4 sm:m-0 mt-1'
        
        // 设置鼠标手势为点击状，提示可点击
        video.style.cursor = 'pointer';

        // 设备横屏时自动锚点到视频
        window.addEventListener('orientationchange', () => { setTimeout(() => document.querySelector('#video').scrollIntoView(), 400) })
        
        // 获取播放器实例
        var player = document.querySelector('video.player')

        // ==========================================
        // 【清理残留UI：强制删除之前的按钮】
        // ==========================================
        // 检查是否已经存在之前的自定义控制栏，如果有，直接删掉
        var oldCustomBar = document.getElementById('missav-custom-controls');
        if (oldCustomBar) {
            oldCustomBar.remove();
        }
        var bar = video.nextElementSibling;
        if (bar) {
            var insertedButtons = bar.querySelectorAll('span.isolate.inline-flex.rounded-md.shadow-sm');
            insertedButtons.forEach(btn => btn.remove());
        }

        // ==========================================
        // 【1. 全平台无死角解除静音】
        // ==========================================
        if (videoSettings.autoMutePlay) {
            // 强制静音启动
            player.muted = true;
            player.play().catch(e => console.error("静音启动失败:", e));

            var aggressiveUnmute = (e) => {
                if (!player.muted) return;
                console.log(`👆 检测到交互 (${e.type}) -> 解除静音`);
                player.muted = false;
                player.volume = 1.0;
                if (player.muted) player.muted = false; 
            };
            const eventTypes = ['click', 'mousedown', 'mouseup', 'mousemove', 'wheel', 'touchstart', 'touchend', 'touchmove', 'pointerdown', 'keydown', 'scroll'];
            eventTypes.forEach(evt => {
                document.addEventListener(evt, aggressiveUnmute, { capture: true });
                player.addEventListener(evt, aggressiveUnmute, { capture: true });
            });
        }

        // ==========================================
        // 【2. 进度条拖拽优化：松手后强制自动播放】
        // ==========================================
        player.addEventListener('seeked', () => {
             if (player.paused) {
                 console.log("⏩ 进度条拖动结束 -> 自动继续播放");
                 player.play().catch(e => console.log("自动续播被阻拦:", e));
             }
        });

        // ==========================================
        // 【3. 强力修复：iPad/PC 单次点击即暂停】
        // ==========================================
        let isScrolling = false;
        video.addEventListener('touchmove', () => { isScrolling = true; }, {passive: true});
        video.addEventListener('touchstart', () => { isScrolling = false; }, {passive: true});

        video.addEventListener('touchend', (e) => {
            if (isScrolling) return;

            // 忽略控制栏上的点击 (按钮, 链接, input进度条)
            if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.plyr__controls') || e.target.closest('input')) {
                return;
            }

            e.stopPropagation(); 
            e.stopImmediatePropagation();
            e.preventDefault();

            if (player.paused) {
                player.play();
            } else {
                player.pause();
            }
        }, { capture: true, passive: false });

        video.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.plyr__controls') || e.target.closest('input')) return;
            e.stopPropagation();
            player.togglePlay();
        }, { capture: true });

        // ==========================================

        //FIXME -  禁止播放规则1,就这样写了,有空改改.
        let windowIsBlurred
        window.onblur = () => { windowIsBlurred = true }
        window.onfocus = () => { windowIsBlurred = false }
        player.onpause = () => {
            if (windowIsBlurred && videoSettings.autoPauseDisable === 1) {
                player.play()
            }
        }

        const links = document.querySelectorAll('.space-y-2 > div:nth-child(4) a')

        links.forEach(link => {
            // 获取当前 link 的地址
            const actressesLink = link.href

            fetch(actressesLink)
                .then(response => response.text())
                .then(html => {
                    const parser = new DOMParser()
                    const doc = parser.parseFromString(html, 'text/html')
                    const imgElement = doc.querySelector('.bg-norddark img')
                    const profile = doc.querySelector('.font-medium.text-lg.leading-6')
                    // 收藏按钮
                    const saveBtn = profile.querySelector('div.hero-pattern button')
                    //直接删除按钮,不然会直接保存当前页面的影片
                    saveBtn.remove()
                    //名字转链接.
                    profile.querySelector('h4').innerHTML = `<a href="${actressesLink}">${profile.querySelector('h4').textContent}</a>`
                    const profileDiv = document.createElement('div')
                    profileDiv.classList.add('font-medium', 'text-lg', 'leading-6', 'ChinaGodMan')
                    profileDiv.style.display = 'none'
                    profileDiv.style.position = 'absolute'
                    profileDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
                    profileDiv.style.color = '#fff'
                    profileDiv.style.padding = '10px'
                    profileDiv.style.borderRadius = '5px'
                    profileDiv.style.zIndex = '1000'
                    profileDiv.style.whiteSpace = 'nowrap'
                    // 如果女优的图片存在
                    if (imgElement) {
                        //显示大图片
                        profileDiv.innerHTML = `<img src="${imgElement.src.replace('-t', '')}" alt="I AM YOUR FATHER" class="object-cover object-top w-full h-full">`
                        //显示小图片
                        link.innerHTML = `<img src="${imgElement.src}" width="20" height="20" style="display: inline-block; vertical-align: middle;">` + link.innerHTML
                    } else {
                        console.log('🔍 ~ 未找到图片,不添加这个女优.')
                    }
                    saveBtn.remove()
                    profileDiv.appendChild(profile)
                    link.parentElement.appendChild(profileDiv)
                    link.addEventListener('mouseenter', () => {
                        document.querySelectorAll('.ChinaGodMan').forEach(element => {
                            element.style.display = 'none'
                        })
                        profileDiv.style.display = 'block'
                        const rect = link.getBoundingClientRect()
                        profileDiv.style.top = `${rect.top + window.scrollY + rect.height - 20}px`
                        profileDiv.style.left = `${rect.left + window.scrollX}px`

                    })
                    saveBtn.addEventListener('click', () => {
                        alert('尚未完成添加操作,敬请期待')
                    })

                    profileDiv.addEventListener('mouseleave', () => {
                        profileDiv.style.display = 'none'
                    })

                })
                .catch(error => {
                    console.error('🔍 ~ 获取页面失败:', error)
                })
        })

        console.log('【视频控制条增强】完成。')
    }
    var trigger = () => {
        return !!document.querySelector('body > div:nth-child(3) > div.sm\\:container > div > div.flex-1.order-first > div:first-child > div.relative')
    }
    var interval
    var timeout
    interval = setInterval(() => {
        if (trigger()) {
            clearInterval(interval)
            clearTimeout(timeout)
            handle()
            return
        }
    }, 200)
    timeout = setTimeout(() => {
        clearInterval(interval)
        console.log('【视频控制条增强】触发条件匹配超时，已取消。')
    }, 10 * 1000)

    //LINK - 删除广告
    function removeElements() {
        document.querySelectorAll('div[class*="lg:hidden"]')
        const allElements = document.querySelectorAll(
            'div[class^="root"], ' +//右下角弹出窗
            'div[class*="fixed"][class*="right-"][class*="bottom-"], ' +
            'div[class*="pt-"][class*="pb-"][class*="px-"]:not([class*="sm:"]), ' +
            'div[class*="lg:hidden"], ' +//视频下方广告
            'div[class*="lg:block"], ' +
            'div.ts-outstream-video, ' +//页面底部广告
            'iframe,' +
            'ul.mb-4.list-none.text-nord14,' +//视频下面跳官方广告telegram,和一些其他的广告
            '.prose,' +//石床澪
            'img[alt="MissAV takeover Fanza"]'//石床澪图片
        )
        //  console.log(`[missav页面修改] 找到 ${allElements.length} 个需要处理的元素`)
        allElements.forEach(el => {
            if (el.tagName.toLowerCase() === 'iframe') {
                console.log(`[missav页面修改] 正在移除的 iframe 元素`)
                el.remove()
            } else {
                //  console.log(`[missav页面修改] 正在隐藏的 div 元素，class 属性: ${el.className}`)
                el.style.display = 'none'
            }
        })
    }
    //LINK - 节流函数
    function throttle(fn, delay) {
        let lastCall = 0
        return function (...args) {
            const now = new Date().getTime()
            if (now - lastCall < delay) {
                return
            }
            lastCall = now
            return fn(...args)
        }
    }

    function toLink() {
        const origin = window.location.origin
        const allDivs = document.querySelectorAll('div.my-2.text-sm.text-nord4.truncate, div.flex-1.min-w-0')
        // console.log(`[missav页面修改] 找到 ${allDivs.length} 个需要处理的元素`)
        allDivs.forEach(div => {
            if (div.matches('div.flex-1.min-w-0')) {
                const h2 = div.querySelector('h2')
                if (h2) {
                    const text = h2.innerText
                    const link = document.createElement('a')
                    link.href = `${origin}/genres/${text}`
                    link.innerText = text
                    h2.innerHTML = ''
                    h2.appendChild(link)
                    console.log(`[missav页面修改] 已经将文本 "${text}" 转换为链接`)
                }
            }
        })
    }

    // 取消打开新窗口行为
    unsafeWindow.open = () => { }

    //LINK - 页面加载之后执行操作
    document.addEventListener('DOMContentLoaded', () => {

        GM_addStyle(`div.my-2.text-sm.text-nord4.truncate { white-space: normal;}`)
        const observer = new MutationObserver(throttle(() => {
            removeElements()
            toLink()

        }, 500))
        observer.observe(document, { childList: true, subtree: true })
    })

    document.addEventListener('ready', () => {
        //自动点击视频`显示更多`
        const showMore = document.querySelector('a.text-nord13.font-medium.flex.items-center')
        if (showMore) { showMore.click() }

        // 取消页面没焦点自动暂停
        const pause = unsafeWindow.player.pause
        if (videoSettings.autoPauseDisable == 0) {
            unsafeWindow.player.pause = () => {
                if (document.hasFocus()) {
                    pause()
                }
            }
        }
    })

})()
