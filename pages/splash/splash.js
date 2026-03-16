Page({
  onLoad() {
    // 1.3秒后自动跳转
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/template/template'
      });
    }, 1300);
  }
});
