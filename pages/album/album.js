// pages/album/album.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    statusBarHeight: 20, // 状态栏高度
    navBarHeight: 44,    // 导航栏内容高度
    albumList: [
      {
        id: 1,
        title: '山西歪歪',
        location: '方山县',
        date: '2026.01.11',
        views: 2,
        coverImage: '/static/album/cover1.svg'
      },
      {
        id: 2,
        title: '方山县特产',
        location: '方山县',
        date: '2026.01.11',
        views: 2,
        coverImage: '/static/album/cover2.svg'
      },
      {
        id: 3,
        title: '古建之美',
        location: '方山县',
        date: '2026.01.10',
        views: 5,
        coverImage: '/static/album/cover3.svg'
      }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 获取系统信息以适配自定义导航栏
    const systemInfo = wx.getSystemInfoSync();
    // 获取胶囊按钮的位置信息
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    
    // 计算导航栏高度：(胶囊顶部 - 状态栏高度) * 2 + 胶囊高度
    const navBarHeight = (menuButtonInfo.top - systemInfo.statusBarHeight) * 2 + menuButtonInfo.height;

    this.setData({
      statusBarHeight: systemInfo.statusBarHeight,
      navBarHeight: navBarHeight
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === 'function') {
      const tabBar = this.getTabBar();
      tabBar.setData({
        value: 'album',
      });
    }
  },

  /**
   * 返回首页
   */
  goHome: function() {
    wx.switchTab({
      url: '/pages/template/template'
    });
  },

  /**
   * 返回上一页或首页
   */
  goBack: function() {
    wx.navigateBack({
      fail: () => {
        wx.reLaunch({ url: '/pages/index/index' });
      }
    });
  },

  /**
   * 查看相册详情
   */
  viewAlbum: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/album/detail?id=${id}`
    });
  },

  /**
   * 搜索与更多功能占位
   */
  showSearch: function() {
    wx.showToast({ title: '搜索功能开发中', icon: 'none' });
  },

  showMore: function() {
    wx.showActionSheet({
      itemList: ['分享相册', '管理相册', '设置'],
      success: (res) => {
        console.log('点击了第' + (res.tapIndex + 1) + '个按钮');
      }
    });
  },

  /**
   * 点击帮助按钮
   */
  onHelpTap: function() {
    wx.navigateTo({
      url: '/pages/help-center/help-center'
    });
  }
})