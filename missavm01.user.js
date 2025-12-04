// ==UserScript==
// @name              MissAV Enhanced Assistant
// @name:zh-CN        MissAV 增强小助手
// @description       修复手机端显示|去除广告|后台播放|自动播放|完整标题
// @run-at            document-start
// @grant             unsafeWindow
// @grant             GM_addStyle
// @match             https://missav123.com/*
// @match             https://missav.ws/*
// @match             https://missav.live/*
// @match             https://missav.ai/*
// @match             https://missav.com/*
// @match             https://thisav.com/*
// @author            DonkeyBear, track no, mrhydra, iSwfe, ChinaGodMan
// @license           MIT
// @version           2025.12.04.MobileScaleFix
// ==/UserScript==

const url = window.location.href
if (/^https:\/\/(missav|thisav)\.com/.test(url)) {
    window.location.href = url.replace('missav.com', 'missav.live').replace('thisav.com', 'missav.live')
}

(() => {
    'use strict'

    const videoSettings = {
        viewportFitCover: false, // 是否覆盖刘海区
        playCtrlEnable: true,
        autoPauseDisable: 1,
        autoMutePlay: true,
        defaultVolume: null, // 保持 null，不修改音量
    };

    // 🟢【CSS 修复】手机端适配与画面完整显示
    GM_addStyle(`
        /* 1. 隐藏多余的绿色按钮栏 */
        div.flex.-mx-4.sm\\:m-0.mt-1.bg-black.justify-center {
            display: none !important;
        }

        /* 2. 【关键修复】强制视频包含在容器内，不裁剪 */
        video.player {
            object-fit: contain !important;
            width: 100% !important;
            height: auto !important;
            max-height: 85vh !important; /* 防止竖屏视频过高溢出 */
        }
        
        /* 修复容器高度，允许自适应 */
        .plyr__video-wrapper {
            height: auto !important;
            padding-bottom: 0 !important;
            background: #000;
        }
        
        /* 3. 修复视频区域边距，防止手机端溢出 */
        #video {
            margin-left: 0 !important;
            margin-right: 0 !important;
            width: 100% !important;
        }

        /* 4. 【非全屏】底部紧凑布局 */
        .plyr:not(.plyr--fullscreen-active) {
            padding-bottom: 0px !important;
            background-color: #000 !important;
        }

        /* 5. 强制控制栏显示 */
        .plyr__controls {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
            background: linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0));
            z-index: 10000 !important;
        }

        /* 6. 去除广告与杂项 */
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
        if (videoSettings.viewportFitCover) {
            var viewport = document.querySelector('head > meta[name=viewport]')
            viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
        }
    })()

    var handle = () => {
        console.log('【MissAV助手】初始化...')

        var content = document.querySelector('body > div:nth-child(3) > div.sm\\:container > div > div.flex-1.order-first > div:first-child')
        var videoDiv = content.querySelector('div:first-child')
        if (videoDiv) {
            videoDiv.id = 'video'
            // 🟢 修复：移除 tailwind 的负边距样式，改用 w-full
            videoDiv.classList.value = 'relative w-full sm:m-0 mt-1'
            videoDiv.style.cursor = 'pointer';
        }

        // 自动播放逻辑 (仅处理静音启动，不强制修改音量数值)
        if (videoSettings.autoMutePlay) {
            let autoPlayTimer = setInterval(() => {
                const player = document.querySelector('video.player');
                if (player) {
                    player.muted = true;
                    player.playsInline = true;
                    player.play().then(() => {
                        clearInterval(autoPlayTimer);
                    }).catch(e => {});

                    if (!player.hasAttribute('data-unmute-listener')) {
                        const unmute = () => {
                            if (player.muted) {
                                player.muted = false;
                                // 这里移除了 player.volume 的强制赋值
                                if (videoSettings.defaultVolume !== null) {
                                    player.volume = videoSettings.defaultVolume;
                                }
                            }
                            ['click', 'touchstart', 'keydown'].forEach(evt =>
                                document.removeEventListener(evt, unmute, { capture: true })
                            );
                        };
                        ['click', 'touchstart', 'keydown'].forEach(evt =>
                            document.addEventListener(evt, unmute, { capture: true })
                        );
                        player.setAttribute('data-unmute-listener', 'true');
                    }
                }
            }, 500);
            setTimeout(() => clearInterval(autoPlayTimer), 8000);
        }

        const player = document.querySelector('video.player');
        if (player) {
            player.addEventListener('seeked', () => {
                 if (player.paused) player.play().catch(() => {});
            });

            let isScrolling = false;
            if(videoDiv) {
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
            }

            let windowIsBlurred
            window.onblur = () => { windowIsBlurred = true }
            window.onfocus = () => { windowIsBlurred = false }
            player.onpause = () => {
                if (windowIsBlurred && videoSettings.autoPauseDisable === 1) {
                    player.play();
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
        return !!document.querySelector('body > div:nth-child(3) > div.sm\\:container > div > div.flex-1.order-first > div:first-child > div.relative')
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
