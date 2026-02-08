// pages/photoset-detail/photoset-detail.js
const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    photoSetId: '',
    photoSet: null,
    currentIndex: 0,
    isLiked: false,
    statusBarHeight: 0,
    navBarHeight: 0,
    formattedTime: '',
    defaultAvatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23E8F5E9"/%3E%3Cpath d="M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 5c-13.807 0-25 11.193-25 25v10h50V75c0-13.807-11.193-25-25-25z" fill="%233ECE79"/%3E%3C/svg%3E'
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { id } = options;
    this.setData({
      photoSetId: id,
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    });

    this.loadPhotoSetDetail();
    this.checkLikeStatus();
    this.updateViewCount();
  },

  /**
   * 加载照片集详情
   */
  loadPhotoSetDetail() {
    const db = wx.cloud.database();
    db.collection('photoSets')
      .doc(this.data.photoSetId)
      .get()
      .then(res => {
        console.log('照片集详情:', res.data);
        this.setData({
          photoSet: res.data,
          formattedTime: this.formatTime(res.data.createTime)
        });
      })
      .catch(err => {
        console.error('加载照片集详情失败:', err);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      });
  },

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    if (!timestamp) return '未知时间';

    // 处理数据库时间戳格式
    let date;
    if (timestamp.$date) {
      date = new Date(timestamp.$date);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      return '未知时间';
    }

    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else if (days > 0) {
      return `${days}天前`;
    } else if (hours > 0) {
      return `${hours}小时前`;
    } else if (minutes > 0) {
      return `${minutes}分钟前`;
    } else {
      return '刚刚';
    }
  },

  /**
   * 检查点赞状态
   */
  checkLikeStatus() {
    const likedPhotoSets = wx.getStorageSync('likedPhotoSets') || [];
    const isLiked = likedPhotoSets.includes(this.data.photoSetId);
    this.setData({ isLiked });
  },

  /**
   * 更新浏览次数
   */
  updateViewCount() {
    wx.cloud.callFunction({
      name: 'updateViewCount',
      data: {
        photoSetId: this.data.photoSetId
      }
    })
      .then(res => {
        if (res.result.success) {
          console.log('浏览次数+1');
        }
      })
      .catch(err => {
        console.error('调用云函数失败:', err);
      });
  },

  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack();
  },

  /**
   * 照片切换事件
   */
  onSwiperChange(e) {
    this.setData({
      currentIndex: e.detail.current
    });
  },

  /**
   * 点赞/取消点赞
   */
  onToggleLike() {
    const { isLiked, photoSetId } = this.data;

    wx.cloud.callFunction({
      name: 'updateViewCount',
      data: {
        photoSetId: photoSetId,
        action: 'like',
        increment: isLiked ? -1 : 1
      }
    })
      .then(res => {
        if (res.result.success) {
          let likedPhotoSets = wx.getStorageSync('likedPhotoSets') || [];
          if (isLiked) {
            likedPhotoSets = likedPhotoSets.filter(id => id !== photoSetId);
          } else {
            likedPhotoSets.push(photoSetId);
          }
          wx.setStorageSync('likedPhotoSets', likedPhotoSets);

          this.setData({
            isLiked: !isLiked,
            'photoSet.likeCount': (this.data.photoSet.likeCount || 0) + (isLiked ? -1 : 1)
          });

          wx.showToast({
            title: isLiked ? '已取消点赞' : '点赞成功',
            icon: 'success',
            duration: 1500
          });
        } else {
          throw new Error(res.result.message);
        }
      })
      .catch(err => {
        console.error('点赞操作失败:', err);
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
      });
  },

  /**
   * 保存照片到相册
   */
  onSavePhoto() {
    const { photoSet, currentIndex } = this.data;
    if (!photoSet || !photoSet.photos || !photoSet.photos[currentIndex]) {
      wx.showToast({
        title: '照片不存在',
        icon: 'none'
      });
      return;
    }

    const photoUrl = photoSet.photos[currentIndex];
    wx.showLoading({ title: '保存中...' });

    wx.cloud.downloadFile({
      fileID: photoUrl,
      success: res => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading();
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            });
          },
          fail: err => {
            wx.hideLoading();
            if (err.errMsg.indexOf('auth deny') !== -1) {
              wx.showModal({
                title: '提示',
                content: '需要您授权保存相册',
                success: modalRes => {
                  if (modalRes.confirm) {
                    wx.openSetting();
                  }
                }
              });
            } else {
              wx.showToast({
                title: '保存失败',
                icon: 'none'
              });
            }
          }
        });
      },
      fail: err => {
        wx.hideLoading();
        console.error('下载照片失败:', err);
        wx.showToast({
          title: '下载失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 查看模板详情
   */
  onViewTemplate() {
    const { photoSet } = this.data;
    if (!photoSet || !photoSet.templateId) return;

    wx.navigateTo({
      url: `/pages/template-detail/template-detail?id=${photoSet.templateId}`
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {},

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
  onPullDownRefresh() {
    this.loadPhotoSetDetail();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: this.data.photoSet?.title || '精美照片集',
      path: `/pages/photoset-detail/photoset-detail?id=${this.data.photoSetId}`,
      imageUrl: this.data.photoSet?.coverPhoto || ''
    };
  }
})
