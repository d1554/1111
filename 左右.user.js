// ... 在监听函数中 ...

// 左键 (兼容 21 和 37) -> 映射为您想要的功能
if (e.keyCode === 21 || e.keyCode === 37) {
    // 您的逻辑
    showToast('左键');
}

// 右键 (兼容 22 和 39) -> 映射为您想要的功能
if (e.keyCode === 22 || e.keyCode === 39) {
    // 您的逻辑
    showToast('右键');
}