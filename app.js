// app.js
const miniShopPlugin = requirePlugin('mini-shop-plugin');
const migration = require('./utils/migration.js');

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

    // 启动数据迁移（在获取用户信息后执行）
    setTimeout(() => {
      this.startDataMigration()
    }, 2000)
  },

  /**
   * 启动数据迁移
   */
  async startDataMigration() {
    try {
      console.log('[App] 检查数据迁移...')
      const result = await migration.startMigration()

      if (result.success) {
        console.log('[App] 数据迁移成功:', result)
      } else {
        console.log('[App] 数据迁移未完成:', result.message)
        // 如果是因为未登录，等待用户登录后会自动重试
      }
    } catch (error) {
      console.error('[App] 数据迁移异常:', error)
    }
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
          // 首次使用，直接跳转到用户信息页
          console.log('首次使用，跳转到用户信息页')
          wx.reLaunch({
            url: '/pages/user-info/user-info'
          })
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
