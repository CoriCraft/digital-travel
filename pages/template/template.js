// pages/template/template.js
const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    location: "定位中...",
    statusBarHeight: 0,
    navBarHeight: 0,
    currentTemplateFilter: 0,
    templateFilterList: [
      { label: '全部', value: 0 },
      { label: '景区主题', value: 1 },
      { label: '风格分类', value: 2 },
      { label: '场景打卡', value: 3 },
    ],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log(app.globalData);
    this.setData({
      location: "北京市·朝阳区",
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === "function") {
      const tabBar = this.getTabBar();
      tabBar.setData({
        value: "template",
      });
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {},

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {},

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {},

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {},

  onLocationTap() {
    // 以后这里可以跳转到“城市选择页”
    wx.showToast({
      title: "点击了定位",
      icon: "none",
    });
  },

  onTabChange(e) {
    const { value } = e.detail;
    this.setData({
      currentTemplateFilter: value,
    })
  },

  onSearch () {
    console.log('search button click!')
  }
});
