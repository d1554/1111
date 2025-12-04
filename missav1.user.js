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
// @version           2025.12.04.MobileFitFixed
// ==/UserScript==

const url = window.location.href
if (/^https:\/\/(missav|thisav)\.com/.test(url)) {
    window.location.href = url.replace('missav.com', 'missav.live').replace('thisav.com', 'missav.live')
}

(() => {
    'use strict'

    const videoSettings = {
        // ✅ 已改为 true：强制让视口覆盖整个屏幕（针对刘海屏/全面屏优化）
        viewportFitCover: true, 
        playCtrlEnable: true,
        autoPauseDisable: 1,
        autoMutePlay: true,
        defaultVolume: null,
    };

    // 🟢【CSS 核心修复】包含：去除广告、常显控制栏、以及最重要的【手机端强制100%宽度】
    GM_addStyle(`
        /* ============================
           📱 手机端强制铺满屏幕修复 
           ============================ */
        @media screen and (max-width: 900px) {
            /* 1. 强制 Body 和 HTML 不允许水平滚动 */
            html, body {
                overflow-x: hidden !important;
                width: 100vw !important;
                position: relative !important;
                touch-action: pan-y !important; /* 优化滑动体验 */
            }

            /* 2. 暴力重置网页容器宽度，使其等于屏幕宽度 */
            .container, .sm\\:container, div[class*="container"] {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100vw !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
            }

            /* 3. 针对视频播放器外层容器的特殊处理 */
            div.flex-1.order-first {
                width: 100vw !important;
                max-width: 100vw !important;
            }
            
            /* 4. 修复视频区域的边距，防止左右溢出 */
            #video, .plyr {
                margin: 0 !important;
                width: 100vw !important;
            }
        }

        /* ============================
           原有功能：隐藏绿色按钮栏
           ============================ */
        div.flex.-mx-4.sm\\:m-0.mt-1.bg-black.justify-center {
            display: none !important;
        }

        /* ============================
           原有功能：非全屏播放器底部优化
           ============================ */
        .plyr:not(.plyr--fullscreen-active) {
            padding-bottom: 40px !important;
            background-color: #000 !important;
        }
        .plyr:not(.plyr--fullscreen-active) .plyr__controls {
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            height: 40px !important;
            padding: 0 10px !important;
            background: #090811 !important;
            z-index: 99999 !important;
        }

        /* ============================
           原有功能：强制显示控制栏
           ============================ */
        .plyr__controls,
        .plyr--hide-controls .plyr__controls,
        .plyr--video.plyr--hide-controls .plyr__controls,
        .plyr--fullscreen-active .plyr__controls {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
            transform: none !important;
            display: flex !important;
            transition: none !important;
        }

        /* 调整视频高度 */
        .plyr:not(.plyr--fullscreen-active) .plyr__video-wrapper {
            height: 100% !important;
            padding-bottom: 0 !important;
        }

        /* 去除广告 */
        div[class*="lg:hidden"], div.ts-outstream-video, iframe {
            display: none !important;
        }
        div.my-2.text-sm.text-nord4.truncate {
            white-space: normal !important;
        }
    `);

    (() => {
        var meta = document.createElement('meta')
        meta.name = 'theme-color'
        meta.content = '#090811'
        document.querySelector('head').appendChild(meta)
        // ✅ 强制重写 Viewport，确保手机端缩放比例正确
        if (videoSettings.viewportFitCover) {
            var viewport = document.querySelector('head > meta[name=viewport]');
            if (!viewport) {
                viewport = document.createElement('meta');
                viewport.name = 'viewport';
                document.head.appendChild(viewport);
            }
            // 关键：user-scalable=no 禁止手动缩放，width=device-width 强制等于设备宽
            viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover';
        }
    })()

    var handle = () => {
        console.log('【MissAV助手】初始化...')

        var content = document.querySelector('body > div:nth-child(3) > div.sm\\:container > div > div.flex-1.order-first > div:first-child')
        // 如果找不到特定的结构，尝试模糊查找
        if (!content) {
             content = document.querySelector('.plyr')?.parentElement;
        }

        if (content) {
            var videoDiv = content.querySelector('div:first-child')
            // 如果已经是 plyr 容器，就直接用
            if (!videoDiv || !videoDiv.classList.contains('plyr')) {
                 // 尝试修正
                 if(content.querySelector('#video')) videoDiv = content.querySelector('#video');
                 else videoDiv = content; 
            }
            
            videoDiv.id = 'video'
            // ✅ 强制移除 Tailwind 的负边距 (-mx-4)，这是导致手机端溢出的元凶之一
            videoDiv.classList.remove('-mx-4');
            videoDiv.classList.add('w-full'); // 添加全宽
            
            videoDiv.style.cursor = 'pointer';

            // 交互逻辑
            const player = document.querySelector('video.player');
            if (player) {
                // 自动播放
                if (videoSettings.autoMutePlay) {
                    let autoPlayTimer = setInterval(() => {
                        player.muted = true;
                        player.playsInline = true;
                        player.play().then(() => {
                            console.log("✅ 自动播放成功");
                            clearInterval(autoPlayTimer);
                        }).catch(e => {});

                        if (!player.hasAttribute('data-unmute-listener')) {
                            const unmute = () => {
                                if (player.muted) {
                                    player.muted = false;
                                    if (videoSettings.defaultVolume !== null) player.volume = videoSettings.defaultVolume;
                                }
                                ['click', 'touchstart', 'keydown'].forEach(evt => document.removeEventListener(evt, unmute, { capture: true }));
                            };
                            ['click', 'touchstart', 'keydown'].forEach(evt => document.addEventListener(evt, unmute, { capture: true }));
                            player.setAttribute('data-unmute-listener', 'true');
                        }
                    }, 500);
                    setTimeout(() => clearInterval(autoPlayTimer), 8000);
                }

                player.addEventListener('seeked', () => {
                     if (player.paused) player.play().catch(() => {});
                });

                let isScrolling = false;
                videoDiv.addEventListener('touchmove', () => { isScrolling = true; }, {passive: true});
                videoDiv.addEventListener('touchstart', () => { isScrolling = false; }, {passive: true});

                const togglePlay = (e) => {
                    if (isScrolling) return;
                    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.plyr__controls') || e.target.closest('input')) {
                        return;
                    }
                    e.stopPropagation();
                    if (player.paused) player.play(); else player.pause();
                };

                videoDiv.addEventListener('touchend', togglePlay, { capture: true, passive: false });
                videoDiv.addEventListener('click', togglePlay, { capture: true });

                let windowIsBlurred
                window.onblur = () => { windowIsBlurred = true }
                window.onfocus = () => { windowIsBlurred = false }
                player.onpause = () => {
                    if (windowIsBlurred && videoSettings.autoPauseDisable === 1) {
                        player.play();
                    }
                }
            }
        }
        loadActressInfo();
    }

    function loadActressInfo() {
        const links = document.querySelectorAll('.space-y-2 > div:nth-child(4) a')
        links.forEach(link => {
            const actressesLink = link.href
            fetch(actressesLink).then(res => res.text()).then(html => {
                const doc = new DOMParser().parseFromString(html, 'text/html')
                const imgElement = doc.querySelector('.bg-norddark img')
                const profile = doc.querySelector('.font-medium.text-lg.leading-6')
                if (profile) {
                    const saveBtn = profile.querySelector('div.hero-pattern button')
                    if (saveBtn) saveBtn.remove()

                    const profileDiv = document.createElement('div')
                    profileDiv.className = 'ChinaGodMan-preview'
                    Object.assign(profileDiv.style, {
                        display: 'none', position: 'absolute', backgroundColor: 'rgba(0,0,0,0.8)',
                        color: '#fff', padding: '10px', borderRadius: '5px', zIndex: '1000', whiteSpace: 'nowrap'
                    });

                    if (imgElement) {
                        profileDiv.innerHTML = `<img src="${imgElement.src.replace('-t', '')}" style="max-height: 200px; max-width: 200px; display: block; margin-bottom: 5px;">`
                        link.innerHTML = `<img src="${imgElement.src}" width="20" height="20" style="vertical-align: middle; margin-right: 4px;">` + link.innerText
                    }
                    profileDiv.appendChild(profile)
                    link.parentElement.appendChild(profileDiv)

                    link.addEventListener('mouseenter', () => {
                        profileDiv.style.display = 'block'
                        const rect = link.getBoundingClientRect()
                        profileDiv.style.top = `${rect.bottom + window.scrollY}px`
                        profileDiv.style.left = `${rect.left + window.scrollX}px`
                    })
                    link.addEventListener('mouseleave', () => { profileDiv.style.display = 'none' })
                }
            }).catch(() => {})
        })
    }

    var trigger = () => {
        return !!document.querySelector('.plyr') || !!document.querySelector('video');
    }

    var interval = setInterval(() => {
        if (trigger()) {
            clearInterval(interval)
            handle()
        }
    }, 200)

    setTimeout(() => clearInterval(interval), 10000)

    function cleanupPage() {
        document.querySelectorAll('iframe, div[class*="lg:hidden"], div.ts-outstream-video').forEach(el => el.remove());
        const origin = window.location.origin
        document.querySelectorAll('div.flex-1.min-w-0 h2').forEach(h2 => {
            if (!h2.querySelector('a') && h2.innerText) {
                const text = h2.innerText
                h2.innerHTML = `<a href="${origin}/genres/${text}">${text}</a>`
            }
        })
    }

    unsafeWindow.open = () => { }

    document.addEventListener('DOMContentLoaded', () => {
        const observer = new MutationObserver(() => cleanupPage())
        observer.observe(document, { childList: true, subtree: true })
    })

    document.addEventListener('ready', () => {
        const showMore = document.querySelector('a.text-nord13.font-medium.flex.items-center')
        if (showMore) showMore.click()
    })
})()
