// pages/settings/settings.js
const app = getApp()

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    notificationEnabled: true,
    interactionEnabled: true,
    cacheSize: '0 MB',
    version: '1.0.0'
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    })

    // 加载设置
    this.loadSettings()
    // 计算缓存大小
    this.calculateCacheSize()
  },

  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack()
  },

  /**
   * 加载设置
   */
  loadSettings() {
    const notificationEnabled = wx.getStorageSync('notificationEnabled')
    const interactionEnabled = wx.getStorageSync('interactionEnabled')

    this.setData({
      notificationEnabled: notificationEnabled !== false,
      interactionEnabled: interactionEnabled !== false
    })
  },

  /**
   * 系统通知开关
   */
  onNotificationChange(e) {
    const enabled = e.detail.value
    this.setData({ notificationEnabled: enabled })
    wx.setStorageSync('notificationEnabled', enabled)

    wx.showToast({
      title: enabled ? '已开启系统通知' : '已关闭系统通知',
      icon: 'success'
    })
  },

  /**
   * 互动消息开关
   */
  onInteractionChange(e) {
    const enabled = e.detail.value
    this.setData({ interactionEnabled: enabled })
    wx.setStorageSync('interactionEnabled', enabled)

    wx.showToast({
      title: enabled ? '已开启互动消息' : '已关闭互动消息',
      icon: 'success'
    })
  },

  /**
   * 隐私政策
   */
  onPrivacyTap() {
    wx.showModal({
      title: '隐私政策',
      content: '我们非常重视您的隐私保护。本应用仅收集必要的用户信息用于提供服务，不会将您的个人信息用于其他用途或与第三方共享。详细内容请访问我们的官网查看完整隐私政策。',
      showCancel: false
    })
  },

  /**
   * 用户协议
   */
  onUserAgreementTap() {
    wx.showModal({
      title: '用户协议',
      content: '欢迎使用数字文旅小程序。使用本应用即表示您同意遵守我们的用户协议。详细内容请访问我们的官网查看完整用户协议。',
      showCancel: false
    })
  },

  /**
   * 计算缓存大小
   */
  calculateCacheSize() {
    try {
      const info = wx.getStorageInfoSync()
      const sizeKB = info.currentSize
      const sizeMB = (sizeKB / 1024).toFixed(2)
      this.setData({
        cacheSize: `${sizeMB} MB`
      })
    } catch (err) {
      console.error('获取缓存大小失败:', err)
    }
  },

  /**
   * 清除缓存
   */
  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '清除缓存后，部分数据需要重新加载。确定要清除吗？',
      confirmText: '清除',
      confirmColor: '#FF4444',
      success: res => {
        if (res.confirm) {
          wx.showLoading({ title: '清除中...' })

          // 保留重要数据
          const userInfo = wx.getStorageSync('userInfo')
          const notificationEnabled = wx.getStorageSync('notificationEnabled')
          const interactionEnabled = wx.getStorageSync('interactionEnabled')

          // 清除所有缓存
          wx.clearStorage({
            success: () => {
              // 恢复重要数据
              wx.setStorageSync('userInfo', userInfo)
              wx.setStorageSync('notificationEnabled', notificationEnabled)
              wx.setStorageSync('interactionEnabled', interactionEnabled)

              wx.hideLoading()
              wx.showToast({
                title: '清除成功',
                icon: 'success'
              })

              // 重新计算缓存大小
              this.calculateCacheSize()
            },
            fail: () => {
              wx.hideLoading()
              wx.showToast({
                title: '清除失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  /**
   * 关于我们
   */
  onAboutTap() {
    wx.showModal({
      title: '关于我们',
      content: '数字文旅小程序\n版本：1.0.0\n\n致力于为用户提供优质的旅游体验和创意模板服务。\n\n如有问题，请联系客服：\n电话：400-123-4567\n邮箱：support@example.com',
      showCancel: false
    })
  },

  /**
   * 检查更新
   */
  onCheckUpdate() {
    wx.showLoading({ title: '检查中...' })

    // 检查小程序更新
    const updateManager = wx.getUpdateManager()

    updateManager.onCheckForUpdate(res => {
      wx.hideLoading()
      if (res.hasUpdate) {
        wx.showModal({
          title: '发现新版本',
          content: '发现新版本，是否立即更新？',
          success: modalRes => {
            if (modalRes.confirm) {
              wx.showLoading({ title: '下载中...' })
              updateManager.onUpdateReady(() => {
                wx.hideLoading()
                wx.showModal({
                  title: '更新提示',
                  content: '新版本已准备好，是否重启应用？',
                  success: restartRes => {
                    if (restartRes.confirm) {
                      updateManager.applyUpdate()
                    }
                  }
                })
              })

              updateManager.onUpdateFailed(() => {
                wx.hideLoading()
                wx.showToast({
                  title: '更新失败',
                  icon: 'none'
                })
              })
            }
          }
        })
      } else {
        wx.showToast({
          title: '已是最新版本',
          icon: 'success'
        })
      }
    })

    updateManager.onCheckForUpdate(() => {
      wx.hideLoading()
    })
  },

  /**
   * 退出登录
   */
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      confirmColor: '#FF4444',
      success: res => {
        if (res.confirm) {
          // 清除用户信息
          wx.removeStorageSync('userInfo')
          app.globalData.userInfo = null
          app.globalData.userInfoPromise = null

          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })

          // 返回首页
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/template/template'
            })
          }, 1500)
        }
      }
    })
  }
})
