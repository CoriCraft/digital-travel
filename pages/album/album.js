// pages/album/album.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    statusBarHeight: 20, // 状态栏高度
    navBarHeight: 44,    // 导航栏内容高度
    albumList: [],
    loading: false
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

    // 加载用户相册
    this.loadUserAlbums();
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

    // 刷新相册列表
    this.loadUserAlbums();
  },

  /**
   * 加载用户相册
   */
  loadUserAlbums() {
    if (this.data.loading) return;

    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });

    const db = wx.cloud.database();
    // 查询当前用户的相册（数据库权限已限制，这里显式过滤更清晰）
    db.collection('user_albums')
      .where({
        _openid: '{openid}' // 小程序端会自动替换为当前用户的 openid
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        const albumList = res.data.map(album => {
          // 封面优先使用 coverPhoto，否则使用第一张照片
          let coverImage = album.coverPhoto;
          if (!coverImage && album.photos && album.photos.length > 0) {
            const firstPhoto = album.photos[0];
            coverImage = firstPhoto.fileID || firstPhoto.url || firstPhoto;
          }

          return {
            id: album._id,
            orderId: album.orderId,
            title: album.title,
            date: this.formatDate(album.createTime),
            photoCount: album.totalCount || album.photos?.length || 0,
            coverImage: coverImage,
            photos: album.photos
          };
        });

        // 获取所有封面的临时URL
        const fileIDs = albumList.map(album => album.coverImage).filter(id => id && id.startsWith('cloud://'));

        if (fileIDs.length > 0) {
          wx.cloud.getTempFileURL({
            fileList: fileIDs
          }).then(tempRes => {
            const urlMap = {};
            tempRes.fileList.forEach(file => {
              urlMap[file.fileID] = file.tempFileURL;
            });

            // 替换为临时URL
            albumList.forEach(album => {
              if (urlMap[album.coverImage]) {
                album.coverImage = urlMap[album.coverImage];
              }
            });

            this.setData({ albumList, loading: false });
            wx.hideLoading();
          }).catch(err => {
            console.error('获取临时URL失败:', err);
            this.setData({ albumList, loading: false });
            wx.hideLoading();
          });
        } else {
          this.setData({ albumList, loading: false });
          wx.hideLoading();
        }
      })
      .catch(err => {
        console.error('加载相册失败:', err);
        this.setData({ loading: false });
        wx.hideLoading();
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      });
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
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