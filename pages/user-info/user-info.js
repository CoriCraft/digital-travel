// pages/user-info/user-info.js
const app = getApp()

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    userAvatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23E8F5E9"/%3E%3Cpath d="M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 5c-13.807 0-25 11.193-25 25v10h50V75c0-13.807-11.193-25-25-25z" fill="%233ECE79"/%3E%3C/svg%3E',
    userName: '',
    canSubmit: false
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    })
  },

  /**
   * 选择头像
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    console.log('选择头像:', avatarUrl)

    this.setData({
      userAvatar: avatarUrl
    })

    this.checkCanSubmit()
  },

  /**
   * 输入昵称
   */
  onNicknameInput(e) {
    const userName = e.detail.value
    this.setData({ userName })
    this.checkCanSubmit()
  },

  /**
   * 昵称输入失焦
   */
  onNicknameBlur(e) {
    const userName = e.detail.value
    this.setData({ userName: userName.trim() })
    this.checkCanSubmit()
  },

  /**
   * 检查是否可以提交
   */
  checkCanSubmit() {
    const { userName, userAvatar } = this.data
    const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23E8F5E9"/%3E%3Cpath d="M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 5c-13.807 0-25 11.193-25 25v10h50V75c0-13.807-11.193-25-25-25z" fill="%233ECE79"/%3E%3C/svg%3E'

    const canSubmit = userName.trim() !== '' && userAvatar !== defaultAvatar
    this.setData({ canSubmit })
  },

  /**
   * 提交用户信息
   */
  async onSubmit() {
    const { userName, userAvatar, canSubmit } = this.data

    if (!canSubmit) {
      wx.showToast({
        title: '请完善信息',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      // 上传头像到云存储
      const cloudPath = `avatars/${app.globalData.userInfo.openid}_${Date.now()}.jpg`
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: userAvatar
      })

      console.log('头像上传成功:', uploadResult.fileID)

      // 更新全局用户信息
      app.updateUserProfile(userName.trim(), uploadResult.fileID)

      wx.hideLoading()
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 1500
      })

      // 标记需要选择位置
      wx.setStorageSync('need_choose_location_after_login', true)

      // 延迟跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/template/template'
        })
      }, 1500)

    } catch (err) {
      console.error('保存失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  /**
   * 跳过设置
   */
  onSkip() {
    wx.showModal({
      title: '提示',
      content: '跳过后可以在"我的"页面设置头像和昵称',
      confirmText: '跳过',
      cancelText: '继续设置',
      success: res => {
        if (res.confirm) {
          wx.switchTab({
            url: '/pages/template/template'
          })
        }
      }
    })
  }
})
