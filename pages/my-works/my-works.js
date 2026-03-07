// pages/my-works/my-works.js
const app = getApp()

function getDB() {
  return wx.cloud.database()
}

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    photos: [], // 照片列表
    leftColumnPhotos: [], // 左列照片
    rightColumnPhotos: [], // 右列照片
    leftHeight: 0, // 左列高度
    rightHeight: 0, // 右列高度
    loading: false,
    refreshing: false,
    totalViews: 0,
    totalLikes: 0,
    totalFavorites: 0,
    defaultAvatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23E8F5E9"/%3E%3Cpath d="M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 5c-13.807 0-25 11.193-25 25v10h50V75c0-13.807-11.193-25-25-25z" fill="%233ECE79"/%3E%3C/svg%3E'
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    })

    this.loadMyWorks()
  },

  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack()
  },

  /**
   * 下拉刷新
   */
  onRefresh() {
    this.setData({ refreshing: true })
    this.loadMyWorks()
  },

  /**
   * 加载我的作品
   */
  loadMyWorks() {
    const userInfo = app.globalData.userInfo
    if (!userInfo || !userInfo.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    if (!this.data.refreshing) {
      this.setData({ loading: true })
      wx.showLoading({ title: '加载中...' })
    }

    const db = getDB()

    // 加载我上传的照片
    db.collection('photos')
      .where({
        userId: userInfo.openid,
        status: 'approved' // 只显示已审核通过的照片，排除已删除的
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        console.log('[我的作品] 照片列表加载成功，数量:', res.data.length)

        // 打印每张照片的URL信息
        res.data.forEach((photo, index) => {
          console.log(`[我的作品] 照片${index + 1}:`, {
            _id: photo._id,
            hasThumbnail: !!photo.thumbnailUrl,
            thumbnailUrl: photo.thumbnailUrl,
            photoUrl: photo.photoUrl
          });
        });

        // 智能瀑布流分列
        this.setData({
          photos: res.data,
          leftColumnPhotos: [],
          rightColumnPhotos: [],
          leftHeight: 0,
          rightHeight: 0,
          loading: false,
          refreshing: false
        }, () => {
          this.buildWaterfall(res.data);
        });

        wx.hideLoading()
        this.calculateStatistics()
      })
      .catch(err => {
        console.error('加载照片失败:', err)
        this.setData({
          loading: false,
          refreshing: false
        })
        wx.hideLoading()
      })
  },

  /**
   * 智能瀑布流分列
   * 使用照片 ID 哈希值来生成稳定的高度估算
   */
  buildWaterfall(photos) {
    let {
      leftColumnPhotos,
      rightColumnPhotos,
      leftHeight,
      rightHeight
    } = this.data;

    photos.forEach((photo, index) => {
      // 使用照片 ID 的哈希值生成稳定的高度
      const hash = this.simpleHash(photo._id);
      const heightVariation = (hash % 300) - 150; // -150 到 +150 的变化
      const baseHeight = 450; // 基础高度
      const cardHeight = baseHeight + heightVariation + 80; // 图片 + 删除按钮区域

      // 添加 originalIndex 用于点击跳转
      const photoWithIndex = { ...photo, originalIndex: index };

      // 分配到较短的列
      if (leftHeight <= rightHeight) {
        leftColumnPhotos.push(photoWithIndex);
        leftHeight += cardHeight;
      } else {
        rightColumnPhotos.push(photoWithIndex);
        rightHeight += cardHeight;
      }
    });

    this.setData({
      leftColumnPhotos,
      rightColumnPhotos,
      leftHeight,
      rightHeight
    });
  },

  /**
   * 简单哈希函数
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  },

  /**
   * 计算统计数据
   */
  calculateStatistics() {
    const { photos } = this.data

    let totalViews = 0
    let totalLikes = 0
    let totalFavorites = 0

    // 统计照片数据
    photos.forEach(item => {
      totalViews += item.viewCount || 0
      totalLikes += item.likeCount || 0
      totalFavorites += item.favoriteCount || 0
    })

    this.setData({
      totalViews,
      totalLikes,
      totalFavorites
    })
  },

  /**
   * 点击照片
   */
  onPhotoTap(e) {
    const { index } = e.currentTarget.dataset
    const { photos } = this.data

    // 将照片列表存到缓存
    wx.setStorageSync('previewPhotos', photos)
    wx.setStorageSync('previewPhotosTemplateId', '')

    // 跳转到照片预览页面
    wx.navigateTo({
      url: `/pages/photo-preview/photo-preview?currentIndex=${index}`
    })
  },

  /**
   * 删除照片
   */
  onDeletePhoto(e) {
    const { id, index } = e.currentTarget.dataset

    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这张照片吗？',
      confirmText: '删除',
      confirmColor: '#FF4444',
      success: (res) => {
        if (res.confirm) {
          this.deletePhoto(id, index)
        }
      }
    })
  },

  /**
   * 执行删除照片
   */
  deletePhoto(photoId, index) {
    wx.showLoading({ title: '删除中...' })

    const db = getDB()
    db.collection('photos')
      .doc(photoId)
      .remove()
      .then(() => {
        wx.hideLoading()
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })

        // 从列表中移除
        const { photos } = this.data
        photos.splice(index, 1)

        // 重新分列
        const leftColumn = []
        const rightColumn = []
        photos.forEach((photo, idx) => {
          const photoWithIndex = { ...photo, originalIndex: idx }
          if (idx % 2 === 0) {
            leftColumn.push(photoWithIndex)
          } else {
            rightColumn.push(photoWithIndex)
          }
        })

        this.setData({
          photos,
          leftColumnPhotos: leftColumn,
          rightColumnPhotos: rightColumn
        })

        this.calculateStatistics()
      })
      .catch(err => {
        console.error('删除照片失败:', err)
        wx.hideLoading()
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        })
      })
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadMyWorks()
  }
})
