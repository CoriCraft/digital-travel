// app.js
App({
  onLaunch() {
    // 初始化 CloudBase
    wx.cloud.init({
      env: 'cultural-tourism-7fb138kf77a2cb2',
      traceUser: true
    })

    this.globalData.statusBarHeight = wx.getWindowInfo().statusBarHeight;
    this.globalData.navBarHeight = (wx.getMenuButtonBoundingClientRect().top - wx.getWindowInfo().statusBarHeight) * 2 + wx.getMenuButtonBoundingClientRect().height;
    console.log(wx.getMenuButtonBoundingClientRect().top, wx.getMenuButtonBoundingClientRect().height)

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 获取用户信息
    this.getUserInfo()
  },

  /**
   * 获取用户信息
   */
  getUserInfo() {
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: res => {
        console.log('用户信息获取成功:', res.result)
        this.globalData.userInfo = {
          openid: res.result.openid,
          unionid: res.result.unionid
        }
      },
      fail: err => {
        console.error('用户信息获取失败:', err)
      }
    })
  },

  globalData: {
    userInfo: null,
    statusBarHeight: 0,
    navBarHeight: 0,
  }
})
