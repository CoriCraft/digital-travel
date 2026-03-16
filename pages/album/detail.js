// pages/album/detail.js
Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    albumId: '',
    album: null,
    photos: [],
    loading: true
  },

  onLoad(options) {
    const systemInfo = wx.getSystemInfoSync();
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    const navBarHeight = (menuButtonInfo.top - systemInfo.statusBarHeight) * 2 + menuButtonInfo.height;

    this.setData({
      statusBarHeight: systemInfo.statusBarHeight,
      navBarHeight: navBarHeight,
      albumId: options.id
    });

    this.loadAlbumDetail();
  },

  /**
   * 加载相册详情
   */
  loadAlbumDetail() {
    wx.showLoading({ title: '加载中...' });

    const db = wx.cloud.database();
    // 使用 where 查询，同时过滤 _id 和 _openid
    db.collection('user_albums')
      .where({
        _id: this.data.albumId,
        _openid: '{openid}'
      })
      .get()
      .then(res => {
        if (res.data.length === 0) {
          wx.hideLoading();
          wx.showToast({
            title: '相册不存在',
            icon: 'none'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
          return;
        }

        const album = res.data[0];
        const photos = album.photos || [];

        console.log('相册数据:', album);
        console.log('照片数组:', photos);

        // 获取所有照片的临时URL
        const fileIDs = photos.map(photo => photo.fileID || photo.url || photo).filter(id => id && id.startsWith('cloud://'));

        console.log('提取的fileIDs:', fileIDs);

        if (fileIDs.length > 0) {
          wx.cloud.getTempFileURL({
            fileList: fileIDs
          }).then(tempRes => {
            console.log('getTempFileURL结果:', tempRes);

            const urlMap = {};
            tempRes.fileList.forEach(file => {
              urlMap[file.fileID] = file.tempFileURL;
            });

            // 替换为临时URL
            const photosWithUrl = photos.map(photo => {
              const fileID = photo.fileID || photo.url || photo;
              return {
                ...photo,
                url: urlMap[fileID] || fileID
              };
            });

            console.log('转换后的照片数组:', photosWithUrl);

            this.setData({
              album: {
                title: album.title,
                date: album.photoTime || this.formatDate(album.createTime),
                location: album.locationName || '未知地点'
              },
              photos: photosWithUrl,
              loading: false
            });
            wx.hideLoading();
          }).catch(err => {
            console.error('获取临时URL失败:', err);
            this.setData({
              album: {
                title: album.title,
                date: album.photoTime || this.formatDate(album.createTime),
                location: album.locationName || '未知地点'
              },
              photos: photos,
              loading: false
            });
            wx.hideLoading();
          });
        } else {
          console.log('没有需要转换的云存储文件');
          this.setData({
            album: {
              title: album.title,
              date: this.formatDate(album.createTime),
              location: album.location || '未知地点'
            },
            photos: photos,
            loading: false
          });
          wx.hideLoading();
        }
      })
      .catch(err => {
        console.error('加载相册失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
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
   * 返回上一页
   */
  goBack() {
    wx.navigateBack();
  },

  /**
   * 查看照片详情
   */
  viewPhoto(e) {
    const index = e.currentTarget.dataset.index;
    const photos = this.data.photos;

    // 将照片列表存入缓存
    wx.setStorageSync('albumPreviewPhotos', photos);

    // 跳转到照片预览页面，传 albumId
    wx.navigateTo({
      url: `/pages/album/photo-preview?index=${index}&albumId=${this.data.albumId}`
    });
  },

  /**
   * 下载照片
   */
  downloadPhoto(e) {
    const index = e.currentTarget.dataset.index;
    const photo = this.data.photos[index];
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
   * 删除整个相册
   */
  onDeleteAlbum() {
    wx.showModal({
      title: '删除相册',
      content: '确定要删除这个相册吗？相册中的所有照片都将被删除，此操作不可恢复。',
      confirmColor: '#e53935',
      success: (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: '删除中...' });
        const db = wx.cloud.database();

        db.collection('user_albums')
          .where({
            _id: this.data.albumId,
            _openid: '{openid}'
          })
          .remove()
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: '相册已删除', icon: 'success' });
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          })
          .catch(err => {
            console.error('删除相册失败:', err);
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
      }
    });
  },

  /**
   * 从预览页返回时刷新数据
   */
  onShow() {
    if (this.data.albumId && !this.data.loading) {
      this.loadAlbumDetail();
    }
  }
});
