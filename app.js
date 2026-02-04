// app.js
App({
  onLaunch() {
    this.globalData.statusBarHeight = wx.getWindowInfo().statusBarHeight;
    this.globalData.navBarHeight = (wx.getMenuButtonBoundingClientRect().top - wx.getWindowInfo().statusBarHeight) * 2 + wx.getMenuButtonBoundingClientRect().height;
    console.log(wx.getMenuButtonBoundingClientRect().top, wx.getMenuButtonBoundingClientRect().height)
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },
  globalData: {
    userInfo: null,
    statusBarHeight: 0,
    navBarHeight: 0,
  }
})
