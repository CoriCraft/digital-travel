// pages/my/my.js
const app = getApp()
const { checkImageSecurity, checkOperationLimit, recordOperationTime, getRemainingTime } = require('../../utils/util.js')

Page({

  /**
   * 页面的初始数据
   */
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    userAvatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23E8F5E9"/%3E%3Cpath d="M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 5c-13.807 0-25 11.193-25 25v10h50V75c0-13.807-11.193-25-25-25z" fill="%233ECE79"/%3E%3C/svg%3E',
    userName: '微信用户',
    userPhone: '',
    templateCount: 0,
    experienceCount: 0,
    unreadCount: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    })

    // 加载用户信息
    this.loadUserInfo()
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({
        userName: userInfo.nickName || '微信用户',
        userAvatar: userInfo.avatarUrl || this.data.userAvatar
      })
    }

    // 加载统计数据
    this.loadStatistics()

    // 延迟加载未读消息数量，避免阻塞页面渲染
    setTimeout(() => {
      this.loadUnreadCount()
    }, 500)
  },

  /**
   * 加载统计数据
   */
  loadStatistics() {
    const userInfo = app.globalData.userInfo
    if (!userInfo || !userInfo.openid) {
      console.log('用户信息未加载，跳过统计')
      return
    }

    const db = wx.cloud.database()

    // 统计创建的模板数量
    db.collection('templates')
      .where({
        creatorId: userInfo.openid
      })
      .count()
      .then(res => {
        this.setData({
          templateCount: res.total
        })
      })
      .catch(err => {
        console.error('统计模板失败:', err)
      })

    // 统计打卡的体验地点数量
    db.collection('check_ins')
      .where({
        userId: userInfo.openid
      })
      .count()
      .then(res => {
        this.setData({
          experienceCount: res.total
        })
      })
      .catch(err => {
        console.error('统计体验失败:', err)
      })
  },

  /**
   * 选择头像
   */
  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    console.log('选择头像:', avatarUrl)

    // 检查更换频率（24小时内只能更换一次）
    const canChange = checkOperationLimit('lastAvatarChangeTime', 1440)
    if (!canChange) {
      const remaining = getRemainingTime('lastAvatarChangeTime', 1440)
      wx.showModal({
        title: '操作限制',
        content: `为了防止频繁更换头像，24小时内只能更换一次。距离下次可更换还需 ${remaining}`,
        showCancel: false
      })
      return
    }

    wx.showLoading({ title: '审核中...' })

    try {
      // 图片内容安全审核
      const checkResult = await checkImageSecurity(avatarUrl)

      if (!checkResult.success) {
        wx.hideLoading()
        wx.showModal({
          title: '审核失败',
          content: checkResult.errMsg,
          showCancel: false
        })
        return
      }

      // 审核通过，上传头像到云存储
      wx.showLoading({ title: '上传中...' })

      const cloudPath = `avatars/${app.globalData.userInfo.openid}_${Date.now()}.jpg`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: avatarUrl
      })

      console.log('头像上传成功:', uploadRes.fileID)

      // 更新本地显示
      this.setData({
        userAvatar: avatarUrl
      })

      // 更新全局用户信息
      app.updateUserProfile(this.data.userName, uploadRes.fileID)

      // 记录更换时间
      recordOperationTime('lastAvatarChangeTime')

      wx.hideLoading()
      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      })
    } catch (err) {
      console.error('头像上传失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '头像上传失败',
        icon: 'none'
      })
    }
  },

  /**
   * 修改昵称
   */
  onEditNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入昵称',
      content: this.data.userName,
      success: res => {
        if (res.confirm && res.content) {
          const newName = res.content.trim()
          if (newName) {
            this.setData({
              userName: newName
            })

            // 更新全局用户信息
            app.updateUserProfile(newName, app.globalData.userInfo.avatarUrl)

            wx.showToast({
              title: '昵称更新成功',
              icon: 'success'
            })
          }
        }
      }
    })
  },

  /**
   * 导航到作品页面
   */
  navigateToProducts() {
    wx.navigateTo({
      url: '/pages/my-works/my-works'
    })
  },

  /**
   * 导航到收藏页面
   */
  navigateToCollect() {
    wx.navigateTo({
      url: '/pages/my-favorites/my-favorites'
    })
  },

  /**
   * 加载未读消息数量
   */
  async loadUnreadCount() {
    try {
      // 检查用户信息是否已加载
      const userInfo = app.globalData.userInfo
      if (!userInfo || !userInfo.openid) {
        console.log('用户信息未加载，跳过加载未读消息数量')
        return
      }

      // 设置超时保护
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          resolve({ timeout: true })
        }, 5000) // 5秒超时
      })

      const callFunctionPromise = wx.cloud.callFunction({
        name: 'getUnreadCount'
      })

      const res = await Promise.race([callFunctionPromise, timeoutPromise])

      if (res.timeout) {
        console.log('获取未读消息数量超时，使用默认值')
        return
      }

      if (res.result && res.result.success) {
        this.setData({
          unreadCount: res.result.count
        })
      }
    } catch (err) {
      console.error('加载未读消息数量失败:', err)
      // 失败时不影响页面显示，静默处理
    }
  },

  /**
   * 导航到消息中心
   */
  navigateToMessages() {
    wx.navigateTo({
      url: '/pages/messages/messages'
    })
  },

  /**
   * 导航到帮助中心
   */
  navigateToHelp() {
    wx.navigateTo({
      url: '/pages/help-center/help-center'
    })
  },

  /**
   * 导航到服务改进
   */
  navigateToService() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    })
  },

  /**
   * 导航到设置
   */
  navigateToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === 'function') {
      const tabBar = this.getTabBar();
      tabBar.setData({
        value: 'my',
      });
    }

    // 每次显示页面时重新加载用户信息
    this.loadUserInfo()
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})