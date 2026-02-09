// pages/my-favorites/my-favorites.js
const app = getApp()

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    currentTab: 0, // 0-模板, 1-照片集
    templates: [],
    photoSets: [],
    loading: false
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    })

    this.loadFavorites()
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
   * 加载收藏列表
   */
  loadFavorites() {
    // 从本地存储获取收藏的ID列表
    const favoriteTemplates = wx.getStorageSync('favoriteTemplates') || []
    const favoritePhotoSets = wx.getStorageSync('favoritePhotoSets') || []

    if (favoriteTemplates.length === 0 && favoritePhotoSets.length === 0) {
      return
    }

    this.setData({ loading: true })
    wx.showLoading({ title: '加载中...' })

    const db = wx.cloud.database()
    const _ = db.command

    // 加载收藏的模板
    if (favoriteTemplates.length > 0) {
      db.collection('templates')
        .where({
          _id: _.in(favoriteTemplates)
        })
        .get()
        .then(res => {
          console.log('收藏的模板:', res.data)
          this.setData({ templates: res.data })
        })
        .catch(err => {
          console.error('加载模板失败:', err)
        })
    }

    // 加载收藏的照片集
    if (favoritePhotoSets.length > 0) {
      db.collection('photoSets')
        .where({
          _id: _.in(favoritePhotoSets)
        })
        .get()
        .then(res => {
          console.log('收藏的照片集:', res.data)
          this.setData({
            photoSets: res.data,
            loading: false
          })
          wx.hideLoading()
        })
        .catch(err => {
          console.error('加载照片集失败:', err)
          this.setData({ loading: false })
          wx.hideLoading()
        })
    } else {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  /**
   * 点击模板卡片
   */
  onTemplateTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/template-detail/template-detail?id=${id}`
    })
  },

  /**
   * 点击照片集卡片
   */
  onPhotoSetTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/photoset-detail/photoset-detail?id=${id}`
    })
  },

  /**
   * 取消收藏模板
   */
  onUnfavoriteTemplate(e) {
    const { id, index } = e.currentTarget.dataset

    wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏这个模板吗？',
      confirmText: '取消收藏',
      success: res => {
        if (res.confirm) {
          let favoriteTemplates = wx.getStorageSync('favoriteTemplates') || []
          favoriteTemplates = favoriteTemplates.filter(templateId => templateId !== id)
          wx.setStorageSync('favoriteTemplates', favoriteTemplates)

          // 从列表中移除
          const templates = this.data.templates
          templates.splice(index, 1)
          this.setData({ templates })

          wx.showToast({
            title: '已取消收藏',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 取消收藏照片集
   */
  onUnfavoritePhotoSet(e) {
    const { id, index } = e.currentTarget.dataset

    wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏这个照片集吗？',
      confirmText: '取消收藏',
      success: res => {
        if (res.confirm) {
          let favoritePhotoSets = wx.getStorageSync('favoritePhotoSets') || []
          favoritePhotoSets = favoritePhotoSets.filter(photoSetId => photoSetId !== id)
          wx.setStorageSync('favoritePhotoSets', favoritePhotoSets)

          // 从列表中移除
          const photoSets = this.data.photoSets
          photoSets.splice(index, 1)
          this.setData({ photoSets })

          wx.showToast({
            title: '已取消收藏',
            icon: 'success'
          })
        }
      }
    })
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadFavorites()
  }
})
