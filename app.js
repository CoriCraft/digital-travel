// app.js
const miniShopPlugin = requirePlugin('mini-shop-plugin');

App({
  onLaunch() {
    // 初始化微信小店插件
    miniShopPlugin.initApp(this, wx);

    // 初始化 CloudBase
    wx.cloud.init({
      env: 'cultural-tourism-7fb138kf77a2cb2',
      traceUser: true
    })

    // 获取系统信息
    const systemInfo = wx.getWindowInfo();
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();

    this.globalData.statusBarHeight = systemInfo.statusBarHeight;
    this.globalData.navBarHeight = (menuButtonInfo.top - systemInfo.statusBarHeight) * 2 + menuButtonInfo.height;

    // 计算胶囊按钮右侧到屏幕右边缘的距离，用于导航栏右侧按钮避让
    this.globalData.menuButtonRight = systemInfo.windowWidth - menuButtonInfo.left;

    console.log('导航栏配置:', {
      statusBarHeight: this.globalData.statusBarHeight,
      navBarHeight: this.globalData.navBarHeight,
      menuButtonRight: this.globalData.menuButtonRight
    })

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
    // 先获取 openid
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: res => {
        console.log('用户 openid 获取成功:', res.result)
        this.globalData.userInfo = {
          openid: res.result.openid,
          unionid: res.result.unionid,
          nickName: '微信用户', // 默认昵称
          avatarUrl: '' // 默认头像
        }

        // 尝试从本地存储获取用户信息
        const storedUserInfo = wx.getStorageSync('userProfile')
        if (storedUserInfo) {
          this.globalData.userInfo.nickName = storedUserInfo.nickName || '微信用户'
          this.globalData.userInfo.avatarUrl = storedUserInfo.avatarUrl || ''
          console.log('从本地存储恢复用户信息:', this.globalData.userInfo)
        } else {
          // 首次使用，引导用户完善信息
          console.log('首次使用，用户可稍后完善信息')
          // 不自动跳转，避免干扰用户正常使用
        }
      },
      fail: err => {
        console.error('用户信息获取失败:', err)
        // 设置默认用户信息
        this.globalData.userInfo = {
          openid: '',
          nickName: '微信用户',
          avatarUrl: ''
        }
      }
    })
  },

  /**
   * 更新用户资料（昵称和头像）
   */
  updateUserProfile(nickName, avatarUrl) {
    if (this.globalData.userInfo) {
      this.globalData.userInfo.nickName = nickName || '微信用户'
      this.globalData.userInfo.avatarUrl = avatarUrl || ''

      // 保存到本地存储
      wx.setStorageSync('userProfile', {
        nickName: this.globalData.userInfo.nickName,
        avatarUrl: this.globalData.userInfo.avatarUrl
      })

      console.log('用户资料已更新:', this.globalData.userInfo)
    }
  },

  globalData: {
    userInfo: null,
    statusBarHeight: 0,
    navBarHeight: 0,
    menuButtonRight: 0, // 胶囊按钮右侧到屏幕右边缘的距离
  }
})
