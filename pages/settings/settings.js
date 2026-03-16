// pages/settings/settings.js
const app = getApp()

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    version: '1.0.8' // 手动维护版本号，每次发布时更新
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    })
  },

  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack()
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
   * 关于我们
   */
  onAboutTap() {
    wx.showModal({
      title: '关于我们',
      content: '智见方境\n版本：1.0.8\n\n致力于为用户提供优质的旅游体验和创意模板服务。',
      showCancel: false
    })
  },

  /**
   * 检查更新
   */
  onCheckUpdate() {
    const updateManager = wx.getUpdateManager()

    wx.showLoading({ title: '检查中...' })

    updateManager.onCheckForUpdate(res => {
      wx.hideLoading()

      if (res.hasUpdate) {
        wx.showModal({
          title: '发现新版本',
          content: '发现新版本，是否立即更新？',
          success: modalRes => {
            if (modalRes.confirm) {
              wx.showLoading({ title: '下载中...' })
            } else {
              wx.hideLoading()
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

    updateManager.onUpdateReady(() => {
      wx.hideLoading()
      wx.showModal({
        title: '更新提示',
        content: '新版本已准备好，是否重启应用？',
        success: res => {
          if (res.confirm) {
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
})
