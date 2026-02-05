// pages/my/my.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    openid: '',
    loading: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadUserInfo()
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const app = getApp()

    // 从全局数据获取用户信息
    const globalUserInfo = app.globalData.userInfo

    if (globalUserInfo && globalUserInfo.openid) {
      this.setData({
        userInfo: globalUserInfo,
        openid: globalUserInfo.openid,
        loading: false
      })
    } else {
      // 如果全局数据还没有,等待一段时间后重试
      setTimeout(() => {
        const retryUserInfo = app.globalData.userInfo
        if (retryUserInfo && retryUserInfo.openid) {
          this.setData({
            userInfo: retryUserInfo,
            openid: retryUserInfo.openid,
            loading: false
          })
        } else {
          // 仍然没有,手动调用云函数获取
          this.fetchUserInfo()
        }
      }, 1000)
    }
  },

  /**
   * 手动调用云函数获取用户信息
   */
  fetchUserInfo() {
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: res => {
        console.log('用户信息获取成功:', res.result)
        const userInfo = {
          openid: res.result.openid,
          unionid: res.result.unionid
        }

        // 更新全局数据
        getApp().globalData.userInfo = userInfo

        // 更新页面数据
        this.setData({
          userInfo: userInfo,
          openid: res.result.openid,
          loading: false
        })
      },
      fail: err => {
        console.error('用户信息获取失败:', err)
        this.setData({
          loading: false
        })
      }
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