// pages/album/photo-preview.js
Page({
  data: {
    photos: [],
    currentIndex: 0,
    statusBarHeight: 20,
    toolbarHeight: 64,
    offsetX: 0,
    animating: false,
    albumId: ''
  },

  _touchStartX: 0,
  _touchStartY: 0,
  _screenWidth: 375,
  _isMoving: false,

  onLoad(options) {
    const { index, albumId } = options;
    const systemInfo = wx.getSystemInfoSync();
    const photos = wx.getStorageSync('albumPreviewPhotos') || [];

    if (photos.length === 0) {
      wx.showToast({ title: '照片数据错误', icon: 'none' });
      setTimeout(() => { wx.navigateBack(); }, 1500);
      return;
    }

    this._screenWidth = systemInfo.windowWidth;

    this.setData({
      photos,
      currentIndex: parseInt(index) || 0,
      statusBarHeight: systemInfo.statusBarHeight,
      toolbarHeight: systemInfo.statusBarHeight + 44,
      albumId: albumId || ''
    });
  },

  /**
   * 触摸开始
   */
  onTouchStart(e) {
    this._touchStartX = e.changedTouches[0].clientX;
    this._touchStartY = e.changedTouches[0].clientY;
    this._isMoving = false;
    // 关闭动画，跟手移动
    this.setData({ animating: false });
  },

  /**
   * 触摸移动，跟手拖拽
   */
  onTouchMove(e) {
    const moveX = e.changedTouches[0].clientX;
    const moveY = e.changedTouches[0].clientY;
    const diffX = moveX - this._touchStartX;
    const diffY = moveY - this._touchStartY;

    // 判断是否横向滑动（首次判断）
    if (!this._isMoving) {
      if (Math.abs(diffX) > Math.abs(diffY)) {
        this._isMoving = true;
      } else {
        return;
      }
    }

    const { currentIndex, photos } = this.data;
    // 边界阻尼：第一张右滑 或 最后一张左滑 加阻力
    let offset = diffX;
    if ((currentIndex === 0 && diffX > 0) || (currentIndex === photos.length - 1 && diffX < 0)) {
      offset = diffX * 0.3;
    }

    this.setData({ offsetX: offset });
  },

  /**
   * 触摸结束，判断切换或回弹
   */
  onTouchEnd(e) {
    const endX = e.changedTouches[0].clientX;
    const diffX = endX - this._touchStartX;
    const { currentIndex, photos } = this.data;
    const threshold = this._screenWidth * 0.2; // 滑动 20% 屏幕宽度触发切换

    // 开启过渡动画
    this.setData({ animating: true });

    if (diffX < -threshold && currentIndex < photos.length - 1) {
      // 左滑 → 下一张：滑出一个屏幕宽度
      this.setData({ offsetX: -this._screenWidth });
      setTimeout(() => {
        this.setData({
          currentIndex: currentIndex + 1,
          offsetX: 0,
          animating: false
        });
      }, 300);
    } else if (diffX > threshold && currentIndex > 0) {
      // 右滑 → 上一张
      this.setData({ offsetX: this._screenWidth });
      setTimeout(() => {
        this.setData({
          currentIndex: currentIndex - 1,
          offsetX: 0,
          animating: false
        });
      }, 300);
    } else {
      // 没达到阈值，回弹
      this.setData({ offsetX: 0 });
    }
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
    const url = photos[currentIndex].url;

    wx.showLoading({ title: '下载中...' });

    wx.downloadFile({
      url,
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading();
            wx.showToast({ title: '保存成功', icon: 'success' });
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '保存失败', icon: 'none' });
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      }
    });
  },

  /**
   * 点击缩略图（带滑动动画）
   */
  onClickThumb(e) {
    const targetIndex = e.currentTarget.dataset.index;
    const { currentIndex } = this.data;
    if (targetIndex === currentIndex) return;

    const direction = targetIndex > currentIndex ? -1 : 1;

    // 先把目标照片放到对应的预渲染位置，再滑过去
    this.setData({
      currentIndex: targetIndex,
      offsetX: -direction * this._screenWidth,
      animating: false
    }, () => {
      // 下一帧开启动画滑回中间
      setTimeout(() => {
        this.setData({
          animating: true,
          offsetX: 0
        });
      }, 30);
    });
  },

  /**
   * 分享当前照片
   */
  onShare() {
    const { photos, currentIndex } = this.data;
    const url = photos[currentIndex].url;

    wx.showLoading({ title: '生成分享图...' });

    wx.downloadFile({
      url,
      success: (res) => {
        wx.hideLoading();
        wx.showShareImageMenu({
          path: res.tempFilePath,
          fail: () => {
            // 部分机型不支持 showShareImageMenu，降级为保存
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => {
                wx.showToast({ title: '已保存，可前往相册分享', icon: 'none' });
              },
              fail: () => {
                wx.showToast({ title: '分享失败', icon: 'none' });
              }
            });
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '图片加载失败', icon: 'none' });
      }
    });
  },

  /**
   * 删除当前照片
   */
  onDelete() {
    const { photos, currentIndex, albumId } = this.data;

    if (!albumId) {
      wx.showToast({ title: '无法删除', icon: 'none' });
      return;
    }

    // 最后一张照片特殊提示
    const isLastPhoto = photos.length === 1;
    const content = isLastPhoto
      ? '这是相册中的最后一张照片，删除后整个相册也将被删除，确定要继续吗？'
      : '确定要删除这张照片吗？此操作不可恢复。';

    wx.showModal({
      title: '删除照片',
      content,
      confirmColor: '#e53935',
      success: (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: '删除中...' });
        const db = wx.cloud.database();
        const _ = db.command;

        if (isLastPhoto) {
          // 最后一张照片，删除整个相册
          db.collection('user_albums')
            .where({
              _id: albumId,
              _openid: '{openid}'
            })
            .remove()
            .then(() => {
              wx.hideLoading();
              wx.showToast({ title: '相册已删除', icon: 'success' });
              // 返回两层（跳过详情页回到相册列表）
              setTimeout(() => {
                wx.navigateBack({ delta: 2 });
              }, 1500);
            })
            .catch(err => {
              console.error('删除相册失败:', err);
              wx.hideLoading();
              wx.showToast({ title: '删除失败', icon: 'none' });
            });
        } else {
          // 删除单张照片：先查询完整数据，再更新
          db.collection('user_albums')
            .where({
              _id: albumId,
              _openid: '{openid}'
            })
            .get()
            .then(res => {
              if (!res.data || res.data.length === 0) {
                wx.hideLoading();
                wx.showToast({ title: '相册不存在', icon: 'none' });
                return Promise.reject('相册不存在');
              }

              const albumData = res.data[0];
              const oldPhotos = albumData.photos || [];
              const newPhotos = oldPhotos.filter((_, i) => i !== currentIndex);

              return db.collection('user_albums')
                .where({
                  _id: albumId,
                  _openid: '{openid}'
                })
                .update({
                  data: { photos: newPhotos }
                });
            })
            .then(() => {
              wx.hideLoading();
              wx.showToast({ title: '已删除', icon: 'success' });

              // 更新本地数据
              const newPhotos = photos.filter((_, i) => i !== currentIndex);
              const newIndex = currentIndex >= newPhotos.length ? newPhotos.length - 1 : currentIndex;

              wx.setStorageSync('albumPreviewPhotos', newPhotos);

              this.setData({
                photos: newPhotos,
                currentIndex: newIndex,
                offsetX: 0,
                animating: false
              });
            })
            .catch(err => {
              console.error('删除照片失败:', err);
              wx.hideLoading();
              wx.showToast({ title: '删除失败', icon: 'none' });
            });
        }
      }
    });
  },

  onUnload() {
    wx.removeStorageSync('albumPreviewPhotos');
  }
});
