// ==UserScript==
// @name              MissAV Enhanced Assistant
// @name:zh-CN        MissAV 增强小助手
// @description       去除广告|后台播放|自动播放|自定义快进时间|完整标题|更多功能...
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
// @license           MIT
// @version           2025.12.04.FixLayout
// ==/UserScript==

const url = window.location.href
if (/^https:\/\/(missav|thisav)\.com/.test(url)) {
    window.location.href = url.replace('missav.com', 'missav.live').replace('thisav.com', 'missav.live')
}

(() => {
    'use strict'
    const minute = 5 // 最大快进分钟数

    // ⚙️在此处修改设置
    const videoSettings = {
        // 【开关】背景色覆盖iPhone非安全区
        viewportFitCover: false,
        // 播放页面显示一键回到播放器
        playCtrlEnable: true,
        // 后台禁止自动暂停 (1: 禁止暂停, 0: 默认)
        autoPauseDisable: 1, 
        // 自动静音播放 (保持 true 以便自动播放)
        autoMutePlay: true,
        // 【修改】音量设置：设置具体的数字 (0.0 ~ 1.0) 代表强制音量；设置 null 代表"记忆上次音量"
        defaultVolume: null, // 👈 设为 null 就不再自动拉满音量了，设为 0.5 就是每次刷新都50%
        // 【修改】控制条向下移动的距离 (可以使用 px 或 rem)
        controlBarOffset: '1rem' // 👈 这里控制向下移动的距离，数字越大越往下
    };

    (() => {
        // 【沉浸式状态栏/网页主题色】
        var meta = document.createElement('meta')
        meta.name = 'theme-color'
        meta.content = '#090811'
        document.querySelector('head').appendChild(meta)
        // 【视口适配】
        if (videoSettings.viewportFitCover) {
            var viewport = document.querySelector('head > meta[name=viewport]')
            viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
        }
    })()

    var handle = () => {
        console.log('【视频控制条增强】开始...')
        // 【页面内容区域】获取元素
        var content = document.querySelector('body > div:nth-child(3) > div.sm\\:container > div > div.flex-1.order-first > div:first-child')
        // 【视频区域】样式调整
        var video = content.querySelector('div:first-child')
        video.id = 'video'
        video.classList.value = 'relative -mx-4 sm:m-0 mt-1'
        
        // 鼠标样式为手型
        video.style.cursor = 'pointer';

        // 【视频区域】设备横屏时自动锚点到视频
        window.addEventListener('orientationchange', () => { setTimeout(() => document.querySelector('#video').scrollIntoView(), 400) })

        // 获取播放器实例 DOM
        var player = document.querySelector('video.player')

        // 一键回到播放器按钮
        if (videoSettings.playCtrlEnable) {
            var div = document.createElement('div')
            div.innerHTML = '<button id="btnControl" onclick="video.scrollIntoView();" type="button" class="relative inline-flex items-center rounded-md bg-transparent pl-2 pr-2 py-2 font-medium text-white hover:bg-primary focus:z-10" style="position: fixed; top: 50%; right: 10px; transform: translateY(-50%); z-index: 1000; opacity: 1; background-color: transparent; border: 1px solid white; border-radius: 8px;border: none;width: 40px; height: 40px;">🔁</button>'
            document.body.appendChild(div)
        }

        // 🟢【修改点】控制条位置调整
        var bar = video.nextElementSibling;
        if (bar) {
            // 移除旧的布局类，使用 flex 居中
            bar.classList.value = 'flex -mx-4 sm:m-0 bg-black justify-center';
            // 强制应用顶部间距，实现"向下移动"
            bar.style.marginTop = videoSettings.controlBarOffset; 
            bar.style.position = 'relative'; // 确保它不会浮动在视频上
            bar.style.zIndex = '10';
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

                // 【音量修复逻辑】
                if (videoSettings.defaultVolume !== null) {
                    player.volume = videoSettings.defaultVolume; // 如果设置了具体数值，则强制设置
                } 
                // 如果是 null，则不操作 player.volume，保留用户上次的设置

                player.muted = false;
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
            // 忽略控制栏上的点击
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
            if (player.paused) {
                player.play();
            } else {
                player.pause();
            }
        }, { capture: true });

        // ==========================================

        //FIXME -  禁止播放规则
        let windowIsBlurred
        window.onblur = () => { windowIsBlurred = true }
        window.onfocus = () => { windowIsBlurred = false }
        player.onpause = () => {
            if (windowIsBlurred && videoSettings.autoPauseDisable === 1) {
                player.play()
            }
        }
        
        // 【女优头像加载逻辑】
        const links = document.querySelectorAll('.space-y-2 > div:nth-child(4) a')
        links.forEach(link => {
            const actressesLink = link.href
            fetch(actressesLink)
                .then(response => response.text())
                .then(html => {
                    const parser = new DOMParser()
                    const doc = parser.parseFromString(html, 'text/html')
                    const imgElement = doc.querySelector('.bg-norddark img')
                    const profile = doc.querySelector('.font-medium.text-lg.leading-6')
                    const saveBtn = profile.querySelector('div.hero-pattern button')
                    saveBtn.remove()
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
                    if (imgElement) {
                        profileDiv.innerHTML = `<img src="${imgElement.src.replace('-t', '')}" alt="I AM YOUR FATHER" class="object-cover object-top w-full h-full">`
                        link.innerHTML = `<img src="${imgElement.src}" width="20" height="20" style="display: inline-block; vertical-align: middle;">` + link.innerHTML
                    }
                    profileDiv.appendChild(profile)
                    link.parentElement.appendChild(profileDiv)
                    link.addEventListener('mouseenter', () => {
                        document.querySelectorAll('.ChinaGodMan').forEach(element => { element.style.display = 'none' })
                        profileDiv.style.display = 'block'
                        const rect = link.getBoundingClientRect()
                        profileDiv.style.top = `${rect.top + window.scrollY + rect.height - 20}px`
                        profileDiv.style.left = `${rect.left + window.scrollX}px`
                    })
                    profileDiv.addEventListener('mouseleave', () => { profileDiv.style.display = 'none' })
                })
                .catch(error => { console.error('🔍 ~ 获取页面失败:', error) })
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
            'div[class^="root"], ' +
            'div[class*="fixed"][class*="right-"][class*="bottom-"], ' +
            'div[class*="pt-"][class*="pb-"][class*="px-"]:not([class*="sm:"]), ' +
            'div[class*="lg:hidden"], ' +
            'div[class*="lg:block"], ' +
            'div.ts-outstream-video, ' +
            'iframe,' +
            'ul.mb-4.list-none.text-nord14,' +
            '.prose,' +
            'img[alt="MissAV takeover Fanza"]'
        )
        allElements.forEach(el => {
            if (el.tagName.toLowerCase() === 'iframe') {
                el.remove()
            } else {
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
                }
            }
        })
    }

    unsafeWindow.open = () => { }

    document.addEventListener('DOMContentLoaded', () => {
        GM_addStyle(`div.my-2.text-sm.text-nord4.truncate { white-space: normal;}`)
        const observer = new MutationObserver(throttle(() => {
            removeElements()
            toLink()
        }, 500))
        observer.observe(document, { childList: true, subtree: true })
    })

    document.addEventListener('ready', () => {
        const showMore = document.querySelector('a.text-nord13.font-medium.flex.items-center')
        if (showMore) { showMore.click() }

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
