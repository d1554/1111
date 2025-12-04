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
// @version           2025.12.04.FinalClean
// ==/UserScript==

const url = window.location.href
if (/^https:\/\/(missav|thisav)\.com/.test(url)) {
    window.location.href = url.replace('missav.com', 'missav.live').replace('thisav.com', 'missav.live')
}

(() => {
    'use strict'

    const videoSettings = {
        viewportFitCover: false,
        playCtrlEnable: true,
        autoPauseDisable: 1,
        autoMutePlay: true,
        // 🟢【修改】音量策略：代码里已改为"自动判断"，此处配置仅作备用
        defaultVolume: 1.0,
    };

    // 🟢【CSS 布局与清理】
    GM_addStyle(`
        /* 1. 隐藏多余的绿色按钮栏、以及你提到的循环控制条(Loop) */
        div.flex.-mx-4.sm\\:m-0.mt-1.bg-black.justify-center, /* 绿色按钮栏 */
        div[class*="items-center"][class*="justify-between"] > button:last-child /* 尝试通过CSS隐藏Loop栏(辅助) */
        {
            display: none !important;
        }

        /* 2. 【非全屏】底部挤出 40px 空间 */
        .plyr:not(.plyr--fullscreen-active) {
            padding-bottom: 40px !important;
            background-color: #000 !important;
        }

        /* 3. 【非全屏】控件钉死在底部，常显 */
        .plyr:not(.plyr--fullscreen-active) .plyr__controls {
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            height: 40px !important;
            padding: 0 10px !important;
            background: #090811 !important;
            z-index: 99999 !important;

            /* 强制常显 */
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
            transform: none !important;
        }

        /* 4. 全屏/隐藏状态下也强制常显 */
        .plyr--hide-controls .plyr__controls,
        .plyr--fullscreen-active .plyr__controls {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
        }

        /* 5. 调整视频高度 */
        .plyr:not(.plyr--fullscreen-active) .plyr__video-wrapper {
            height: 100% !important;
            padding-bottom: 0 !important;
        }

        /* 6. 去广告 */
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
        videoDiv.id = 'video'
        videoDiv.classList.value = 'relative -mx-4 sm:m-0 mt-1'
        videoDiv.style.cursor = 'pointer';

        // 🟢【自动播放 + 智能音量】
        if (videoSettings.autoMutePlay) {
            let autoPlayTimer = setInterval(() => {
                const player = document.querySelector('video.player');
                if (player) {
                    player.muted = true;
                    player.playsInline = true;
                    player.play().then(() => {
                        console.log("✅ 自动播放成功");
                        clearInterval(autoPlayTimer);
                    }).catch(e => {});

                    // 交互后：解除静音 + 应用音量逻辑
                    if (!player.hasAttribute('data-unmute-listener')) {
                        const unmute = () => {
                            if (player.muted) {
                                player.muted = false;
                                console.log("🔊 当前音量:", player.volume);

                                // 🔥【逻辑核心】如果音量太小(小于5%)，说明没有记忆或默认静音，强制拉到 100%
                                // 否则，保留播放器自己记忆的音量
                                if (player.volume < 0.05) {
                                    player.volume = 1.0;
                                    console.log("🔊 音量过小，已强制设置为 100%");
                                } else {
                                    console.log("🔊 保持记忆音量");
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
            setTimeout(() => clearInterval(autoPlayTimer), 10000);
        }

        // 一键回看按钮
        if (videoSettings.playCtrlEnable) {
            var div = document.createElement('div')
            div.innerHTML = '<button id="btnControl" onclick="video.scrollIntoView();" type="button" class="relative inline-flex items-center rounded-md bg-transparent pl-2 pr-2 py-2 font-medium text-white hover:bg-primary focus:z-10" style="position: fixed; top: 50%; right: 10px; transform: translateY(-50%); z-index: 1000; opacity: 1; background-color: transparent; border: 1px solid white; border-radius: 8px;border: none;width: 40px; height: 40px;">🔁</button>'
            document.body.appendChild(div)
        }

        // 交互逻辑
        const player = document.querySelector('video.player');
        if (player) {
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

    // 🟢【JS 强力去除 Loop 按钮】
    function removeLoopBar() {
        // 查找所有按钮，如果包含"ループ"或"Loop"文本，则隐藏其父级容器
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            if (btn.innerText.includes('ループ') || btn.innerText.includes('Loop')) {
                // 向上找几层，找到那个黑色的条 (通常是 flex 容器)
                const container = btn.closest('.flex.items-center.justify-between') || btn.closest('div[class*="bg-black"]');
                if (container) {
                    container.style.display = 'none';
                    // console.log("已隐藏 Loop 控制条");
                }
            }
        });
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

        // 持续检测并移除 Loop 按钮
        removeLoopBar();

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
