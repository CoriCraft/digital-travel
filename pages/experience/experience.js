// pages/experience/experience.js
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    location: "方山风景区",
    currentCategory: 0,
    categoryList: [
      { label: '关注', value: 0 },
      { label: '推荐', value: 1 },
      { label: '购近', value: 2 },
      { label: '美食', value: 3 },
      { label: '出片点', value: 4 },
      { label: '乐玩', value: 5 },
    ],
    // 热门景点列表
    hotScenes: [
      {
        id: 1,
        title: '休闲玩乐',
        badge: 'HOT',
        images: [
          { url: '', title: '景点1' },
          { url: '', title: '景点2' }
        ]
      },
      {
        id: 2,
        title: '景点游玩',
        badge: '生活最佳',
        images: [
          { url: '', title: '景点3' }
        ]
      }
    ],
    // 酒店民宿列表
    hotels: [
      {
        id: 1,
        title: '酒店民宿',
        images: [
          { url: '', title: '酒店1' },
          { url: '', title: '酒店2' }
        ]
      },
      {
        id: 2,
        title: '特色客栈',
        images: [
          { url: '', title: '客栈1' },
          { url: '', title: '客栈2' }
        ]
      }
    ],
    // 推荐景点卡片
    recommendPlace: {
      id: 1,
      name: '方山风景区',
      address: '山西省吕梁市方山县',
      description: '国家级旅游景区，拥有独特的人文景观...',
      rating: 4.8,
      tags: ['景色秀美', '文化底蕴'],
      image: ''
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    });
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
        value: 'experience',
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

  },

  /**
   * 切换分类标签
   */
  onCategoryChange(e) {
    const { value } = e.detail;
    this.setData({
      currentCategory: value,
    })
  },

  /**
   * 点击位置切换
   */
  onLocationTap() {
    console.log('切换位置');
  },

  /**
   * 查看景点详情
   */
  onViewDetail() {
    console.log('查看景点详情');
  }
})