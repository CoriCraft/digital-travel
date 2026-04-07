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
    wx.navigateTo({ url: '/pages/legal/legal?type=privacy' })
  },

  /**
   * 用户协议
   */
  onUserAgreementTap() {
    wx.navigateTo({ url: '/pages/legal/legal?type=agreement' })
  },

  /**
   * 关于我们
   */
  onAboutTap() {
    wx.showModal({
      title: '关于我们',
      content: '"智见方境"小程序——你的文旅记忆共创平台\n\n以AI旅拍为入口，打造专属你的数字文旅体验。在线下旅拍机拍摄后，扫码即可获取高清电子写真，支持创意模板二次创作、一键下载与分享。平台汇聚景区服务推荐、文创电商推荐、电子相册等功能，记录每一次旅行的独特瞬间。我们致力于将乡村美景与文化转化为可留存、可传播的数字记忆，助力智慧文旅新体验。\n\n版本：1.0.8',
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
