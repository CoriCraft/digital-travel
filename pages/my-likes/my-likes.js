// pages/my-likes/my-likes.js
const app = getApp()

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    currentTab: 0, // 0-模板, 1-照片
    templates: [],
    photos: [],
    loading: false,
    refreshing: false
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    })

    this.loadLikes()
  },

  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack()
  },

  /**
   * 切换标签
   */
  onTabChange(e) {
    const { index } = e.currentTarget.dataset
    this.setData({ currentTab: index })
  },

  /**
   * 下拉刷新
   */
  onRefresh() {
    this.setData({ refreshing: true })
    this.loadLikes()
  },

  /**
   * 加载点赞列表
   */
  loadLikes() {
    // 从本地存储获取点赞的ID列表
    const likedTemplates = wx.getStorageSync('likedTemplates') || []
    const likedPhotos = wx.getStorageSync('likedPhotos') || []

    if (likedTemplates.length === 0 && likedPhotos.length === 0) {
      this.setData({ refreshing: false })
      return
    }

    if (!this.data.refreshing) {
      this.setData({ loading: true })
      wx.showLoading({ title: '加载中...' })
    }

    const db = wx.cloud.database()
    const _ = db.command

    let loadedCount = 0
    const totalCollections = 2

    const checkComplete = () => {
      loadedCount++
      if (loadedCount === totalCollections) {
        this.setData({
          loading: false,
          refreshing: false
        })
        wx.hideLoading()
      }
    }

    // 加载模板
    if (likedTemplates.length > 0) {
      db.collection('templates')
        .where({
          _id: _.in(likedTemplates)
        })
        .get()
        .then(res => {
          this.setData({ templates: res.data })
          checkComplete()
        })
        .catch(err => {
          console.error('加载点赞模板失败:', err)
          checkComplete()
        })
    } else {
      this.setData({ templates: [] })
      checkComplete()
    }

    // 加载照片
    if (likedPhotos.length > 0) {
      db.collection('photos')
        .where({
          _id: _.in(likedPhotos)
        })
        .get()
        .then(res => {
          this.setData({ photos: res.data })
          checkComplete()
        })
        .catch(err => {
          console.error('加载点赞照片失败:', err)
          checkComplete()
        })
    } else {
      this.setData({ photos: [] })
      checkComplete()
    }
  },

  /**
   * 点击模板
   */
  onTemplateTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/template-detail/template-detail?id=${id}`
    })
  },

  /**
   * 取消点赞模板
   */
  onUnlikeTemplate(e) {
    const { id, index } = e.currentTarget.dataset

    wx.showModal({
      title: '提示',
      content: '确定要取消点赞吗？',
      success: (res) => {
        if (res.confirm) {
          let likedTemplates = wx.getStorageSync('likedTemplates') || []
          likedTemplates = likedTemplates.filter(templateId => templateId !== id)
          wx.setStorageSync('likedTemplates', likedTemplates)

          // 更新数据库点赞数
          const db = wx.cloud.database()
          const _ = db.command
          db.collection('templates')
            .doc(id)
            .update({
              data: { likeCount: _.inc(-1) }
            })
            .then(() => {
              console.log('模板点赞数-1')
            })

          // 更新UI
          const templates = this.data.templates
          templates.splice(index, 1)
          this.setData({ templates })

          wx.showToast({
            title: '已取消点赞',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 点击照片
   */
  onPhotoTap(e) {
    const { id, templateId } = e.currentTarget.dataset
    const { photos } = this.data

    // 找到点击的照片在列表中的索引
    const currentIndex = photos.findIndex(p => p._id === id)

    if (currentIndex === -1) {
      wx.showToast({
        title: '照片不存在',
        icon: 'none'
      })
      return
    }

    // 将照片列表存入缓存供预览页面使用
    wx.setStorageSync('previewPhotos', photos)
    wx.setStorageSync('previewPhotosTemplateId', templateId)

    // 跳转到照片预览页面
    wx.navigateTo({
      url: `/pages/photo-preview/photo-preview?currentIndex=${currentIndex}`
    })
  },

  /**
   * 取消点赞照片
   */
  onUnlikePhoto(e) {
    const { id, index } = e.currentTarget.dataset

    wx.showModal({
      title: '提示',
      content: '确定要取消点赞吗？',
      success: (res) => {
        if (res.confirm) {
          let likedPhotos = wx.getStorageSync('likedPhotos') || []
          likedPhotos = likedPhotos.filter(photoId => photoId !== id)
          wx.setStorageSync('likedPhotos', likedPhotos)

          // 更新数据库点赞数
          const db = wx.cloud.database()
          const _ = db.command
          db.collection('photos')
            .doc(id)
            .update({
              data: { likeCount: _.inc(-1) }
            })
            .then(() => {
              console.log('照片点赞数-1')
            })

          // 更新UI
          const photos = this.data.photos
          photos.splice(index, 1)
          this.setData({ photos })

          wx.showToast({
            title: '已取消点赞',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 页面显示时刷新
   */
  onShow() {
    this.loadLikes()
  }
})
