// pages/photoset-detail/photoset-detail.js
const app = getApp()
const { getThumbnailUrl } = require('../../utils/util.js')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    photoSetId: '',
    photoSet: null,
    currentIndex: 0,
    isLiked: false,
    isFavorite: false,
    statusBarHeight: 0,
    navBarHeight: 0,
    menuButtonRight: 0, // 胶囊按钮右侧距离
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
      navBarHeight: app.globalData.navBarHeight,
      menuButtonRight: app.globalData.menuButtonRight
    });

    this.loadPhotoSetDetail();
    this.checkLikeStatus();
    this.checkFavoriteStatus();
    this.updateViewCount();
  },

  /**
   * 加载照片集详情
   */
  loadPhotoSetDetail() {
    const { photoSetId } = this.data;
    const cacheKey = `photoset_cache_${photoSetId}`;
    const cachedData = wx.getStorageSync(cacheKey);
    const now = Date.now();
    const cacheExpire = 5 * 60 * 1000; // 缓存5分钟

    // 如果有缓存且未过期，使用缓存数据
    if (cachedData && cachedData.timestamp && (now - cachedData.timestamp < cacheExpire)) {
      console.log('使用缓存的照片集数据');
      this.setData({
        photoSet: cachedData.data,
        formattedTime: this.formatTime(cachedData.data.createTime)
      });
      return;
    }

    // 缓存过期或不存在，从数据库加载
    console.log('从数据库加载照片集数据');
    const db = wx.cloud.database();
    db.collection('photoSets')
      .doc(photoSetId)
      .get()
      .then(res => {
        console.log('照片集详情:', res.data);

        // 为照片添加缩略图URL
        const photoSet = {
          ...res.data,
          photoThumbnails: res.data.photos.map(photo => getThumbnailUrl(photo, 600))
        };

        this.setData({
          photoSet: photoSet,
          formattedTime: this.formatTime(res.data.createTime)
        });

        // 保存到缓存
        wx.setStorageSync(cacheKey, {
          data: photoSet,
          timestamp: now
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
    const { photoSetId } = this.data;
    const storageKey = `photoset_view_${photoSetId}`;
    const lastViewTime = wx.getStorageSync(storageKey) || 0;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1小时

    // 如果距离上次观看超过1小时，才增加观看量
    if (now - lastViewTime > oneHour) {
      const db = wx.cloud.database();
      const _ = db.command;

      db.collection('photoSets')
        .doc(photoSetId)
        .update({
          data: {
            viewCount: _.inc(1)
          }
        })
        .then(() => {
          console.log('浏览次数+1');
          // 记录本次观看时间
          wx.setStorageSync(storageKey, now);
        })
        .catch(err => {
          console.error('更新浏览次数失败:', err);
        });
    } else {
      console.log('1小时内已浏览过，不重复计数');
    }
  },

  /**
   * 检查收藏状态
   */
  checkFavoriteStatus() {
    const favoritePhotoSets = wx.getStorageSync('favoritePhotoSets') || []
    const isFavorite = favoritePhotoSets.includes(this.data.photoSetId)
    this.setData({ isFavorite })
  },

  /**
   * 切换收藏状态
   */
  onToggleFavorite() {
    const { isFavorite, photoSetId, photoSet } = this.data
    let favoritePhotoSets = wx.getStorageSync('favoritePhotoSets') || []

    const db = wx.cloud.database()
    const _ = db.command

    if (isFavorite) {
      // 取消收藏
      favoritePhotoSets = favoritePhotoSets.filter(id => id !== photoSetId)
      // 数据库收藏量 -1，但不能小于 0
      const currentCount = photoSet.favoriteCount || 0
      if (currentCount > 0) {
        db.collection('photoSets')
          .doc(photoSetId)
          .update({
            data: { favoriteCount: _.inc(-1) }
          })
          .then(() => {
            console.log('收藏量-1')
            // 重新加载照片集详情以更新收藏量显示
            this.loadPhotoSetDetail()
          })
          .catch(err => {
            console.error('更新收藏量失败:', err)
          })
      } else {
        // 如果已经是 0，直接设置为 0
        db.collection('photoSets')
          .doc(photoSetId)
          .update({
            data: { favoriteCount: 0 }
          })
          .then(() => {
            console.log('收藏量设置为0')
            this.loadPhotoSetDetail()
          })
      }
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      })
    } else {
      // 添加收藏
      favoritePhotoSets.push(photoSetId)
      // 数据库收藏量 +1
      db.collection('photoSets')
        .doc(photoSetId)
        .update({
          data: { favoriteCount: _.inc(1) }
        })
        .then(() => {
          console.log('收藏量+1')
          // 重新加载照片集详情以更新收藏量显示
          this.loadPhotoSetDetail()
        })
        .catch(err => {
          console.error('更新收藏量失败:', err)
        })
      wx.showToast({
        title: '收藏成功',
        icon: 'success'
      })
    }

    wx.setStorageSync('favoritePhotoSets', favoritePhotoSets)
    this.setData({ isFavorite: !isFavorite })
  },

  /**
   * 返回上一页
   */
  onBack() {
    // 返回时传递更新后的数据
    const pages = getCurrentPages();
    if (pages.length > 1) {
      const prevPage = pages[pages.length - 2];
      if (prevPage.route === 'pages/template-detail/template-detail') {
        // 更新模板详情页中对应的照片集数据
        prevPage.updatePhotoSetItem(this.data.photoSetId, {
          favoriteCount: this.data.photoSet.favoriteCount,
          likeCount: this.data.photoSet.likeCount,
          viewCount: this.data.photoSet.viewCount
        });
      }
    }
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
   * 点击照片查看原图
   */
  onPhotoTap(e) {
    const { index } = e.currentTarget.dataset;
    const { photoSet } = this.data;

    if (!photoSet || !photoSet.photos) return;

    // 预览原图
    wx.previewImage({
      current: photoSet.photos[index],
      urls: photoSet.photos
    });
  },

  /**
   * 点赞/取消点赞
   */
  onToggleLike() {
    const { isLiked, photoSetId } = this.data;
    const db = wx.cloud.database();
    const _ = db.command;

    db.collection('photoSets')
      .doc(photoSetId)
      .update({
        data: {
          likeCount: _.inc(isLiked ? -1 : 1)
        }
      })
      .then(() => {
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
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: this.data.photoSet?.title || '精美照片集',
      query: `id=${this.data.photoSetId}`,
      imageUrl: this.data.photoSet?.coverPhoto || ''
    };
  },

  /**
   * 长按举报照片集
   */
  onPhotoSetReport() {
    const { photoSet } = this.data;
    if (!photoSet) return;

    wx.showActionSheet({
      itemList: ['举报该照片集'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.showReportDialog(photoSet._id, 'photoset', photoSet.title);
        }
      }
    });
  },

  /**
   * 显示举报对话框
   */
  showReportDialog(targetId, targetType, targetName) {
    const reportReasons = [
      '色情低俗',
      '违法违规',
      '虚假信息',
      '侵权内容',
      '垃圾广告',
      '其他原因'
    ];

    wx.showActionSheet({
      itemList: reportReasons,
      success: async (res) => {
        const reason = reportReasons[res.tapIndex];
        await this.submitReport(targetId, targetType, targetName, reason);
      }
    });
  },

  /**
   * 提交举报
   */
  async submitReport(targetId, targetType, targetName, reason) {
    try {
      wx.showLoading({ title: '提交中...' });

      const app = getApp();
      const db = wx.cloud.database();
      await db.collection('reports').add({
        data: {
          targetId,
          targetType,
          targetName,
          reason,
          reporterOpenId: app.globalData.userInfo?.openid || '',
          reporterName: app.globalData.userInfo?.nickName || '匿名用户',
          status: 'pending',
          createTime: new Date(),
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '举报成功',
        icon: 'success'
      });
    } catch (err) {
      console.error('举报失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '举报失败',
        icon: 'none'
      });
    }
  }
})
