// pages/purchase/purchase.js
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 顶部导航栏
    statusBarHeight: 0,
    navBarHeight: 0,

    // 推荐产品轮播
    current: 0,
    autoplay: true,
    duration: 500,
    interval: 5000,

    // 推荐图片列表
    recommendList: [
      '/static/pages/purchase/rec1.png',
      '/static/pages/purchase/rec2.png',
      '/static/pages/purchase/rec3.png',
      '/static/pages/purchase/rec4.png'
    ],

    // 产品列表
    goodsList: [],
    enable: false,

    leftList: [],
    rightList: [],
    leftHeight: 0,
    rightHeight: 0,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      goodsList: this.mockGoodsList(),
    });
    this.buildWaterfall(this.data.goodsList);
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onShow() {
    console.log("------------purchase");
    if (typeof this.getTabBar === "function") {
      const tabBar = this.getTabBar();
      tabBar.setData({
        value: "purchase",
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

  // 左上角home键
  onHomeTap() {
    wx.switchTab({
      url: '/pages/template/template',
    })
  },

  //推荐产品轮播
  onSwiperChange(e) {
    const { current, source } = e.detail
    this.setData({ current })
    console.log('swiper:', current, source)
  },

  //搜索按钮
  onSearch () {
    console.log('search button click!')
  },

  //产品分类
  onTabsChange(e) {
    this.setData({
      goodsList: this.mockGoodsList(),
    })
    console.log('change:', e.detail.value)
  },

  onTabsClick(e) {
    console.log('click:', e.detail.value)
  },

  //产品列表
  buildWaterfall(goodsList) {
    let {
      leftList,
      rightList,
      leftHeight,
      rightHeight,
    } = this.data

    goodsList.forEach((item) => {
      // 根据图片比例预估高度（核心）
      const cardWidth = 340 // rpx，与你 swiper 一致
      const imgHeight =
        (cardWidth * item.imgHeight) / item.imgWidth

      const cardHeight = imgHeight + 160 // 图片 + 文本区域估算

      if (leftHeight <= rightHeight) {
        leftList.push(item)
        leftHeight += cardHeight
      } else {
        rightList.push(item)
        rightHeight += cardHeight
      }
    })

    this.setData({
      leftList,
      rightList,
      leftHeight,
      rightHeight,
    })
  },

  onGoodsTap(e) {
    const item = e.currentTarget.dataset.item
    console.log('点击商品：', item)

    wx.navigateTo({
      url: `/pages/good-info/good-info?id=${item.id}`
    })
  },

  mockGoodsList() {
    const base = {
      name: '云南高山咖啡豆',
      tags: ['爆款', '热卖'],
      sold: 500,
      imgWidth: 750,
      imgHeight: 1000,
    }
  
    return Array.from({ length: 10 }).map((_, index) => ({
      id: index + 1,
      ...base,
      img: `/static/pages/purchase/rec${(index % 4) + 1}.png`,
    }))
  }

});
