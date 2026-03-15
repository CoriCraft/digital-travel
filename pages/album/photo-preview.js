// pages/album/photo-preview.js
Page({
  data: {
    photos: [],
    currentIndex: 0,
    showToolbar: true,
    statusBarHeight: 20
  },

  onLoad(options) {
    const { index } = options;

    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();

    // 从缓存读取照片列表
    const photos = wx.getStorageSync('albumPreviewPhotos') || [];

    if (photos.length === 0) {
      wx.showToast({
        title: '照片数据错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      photos,
      currentIndex: parseInt(index) || 0,
      statusBarHeight: systemInfo.statusBarHeight
    });
  },

  /**
   * 轮播切换
   */
  onSwiperChange(e) {
    this.setData({
      currentIndex: e.detail.current
    });
  },

  /**
   * 切换工具栏显示
   */
  toggleToolbar() {
    this.setData({
      showToolbar: !this.data.showToolbar
    });
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  },

  /**
   * 下载照片
   */
  onDownload() {
    const { photos, currentIndex } = this.data;
    const photo = photos[currentIndex];
    const url = photo.url;

    wx.showLoading({ title: '下载中...' });

    wx.downloadFile({
      url: url,
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading();
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            });
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            });
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({
          title: '下载失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 点击缩略图
   */
  onClickThumb(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentIndex: index
    });
  },

  /**
   * 分享
   */
  onShare() {
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    });
  },

  /**
   * 删除
   */
  onDelete() {
    wx.showToast({
      title: '删除功能开发中',
      icon: 'none'
    });
  },

  onUnload() {
    // 清理缓存
    wx.removeStorageSync('albumPreviewPhotos');
  }
});
