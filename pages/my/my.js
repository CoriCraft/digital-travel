// pages/my/my.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    userAvatar: '/static/images/default-avatar.png',
    userName: '爱旅拍的小女孩',
    userPhone: '13887906785',
    templateCount: 5,
    experienceCount: 1
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const app = getApp()
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    })
  },

  /**
   * 导航到订单页面
   */
  navigateToOrders() {
    wx.showToast({
      title: '订单功能开发中',
      icon: 'none'
    })
  },

  /**
   * 导航到作品页面
   */
  navigateToProducts() {
    wx.showToast({
      title: '作品功能开发中',
      icon: 'none'
    })
  },

  /**
   * 导航到收藏页面
   */
  navigateToCollect() {
    wx.showToast({
      title: '收藏功能开发中',
      icon: 'none'
    })
  },

  /**
   * 导航到帮助中心
   */
  navigateToHelp() {
    wx.showToast({
      title: '帮助中心开发中',
      icon: 'none'
    })
  },

  /**
   * 导航到服务改进
   */
  navigateToService() {
    wx.showToast({
      title: '服务改进开发中',
      icon: 'none'
    })
  },

  /**
   * 导航到设置
   */
  navigateToSettings() {
    wx.showToast({
      title: '设置功能开发中',
      icon: 'none'
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