// pages/my-likes/my-likes.js
const app = getApp()
const interaction = require('../../utils/interaction.js')

function getDB() {
  return wx.cloud.database()
}

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
   * 加载点赞列表（从云端数据库）
   */
  async loadLikes() {
    try {
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
      const openid = userInfo.openid

      // 查询用户的所有点赞记录
      const { data: likes } = await db.collection('user_likes')
        .where({
          userId: openid
        })
        .orderBy('createTime', 'desc')
        .get()

      console.log('点赞记录:', likes)

      // 按类型分组
      const templateIds = []
      const photoIds = []

      likes.forEach(item => {
        switch (item.targetType) {
          case 'template':
            templateIds.push(item.targetId)
            break
          case 'photo':
            photoIds.push(item.targetId)
            break
        }
      })

      // 批量查询资源详情
      await Promise.all([
        this.loadTemplates(templateIds),
        this.loadPhotos(photoIds)
      ])

      this.setData({
        loading: false,
        refreshing: false
      })
      wx.hideLoading()
    } catch (error) {
      console.error('加载点赞列表失败:', error)
      this.setData({
        loading: false,
        refreshing: false
      })
      wx.hideLoading()
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  /**
   * 加载模板
   */
  async loadTemplates(ids) {
    if (ids.length === 0) {
      this.setData({ templates: [] })
      return
    }

    try {
      const db = getDB()
      const { data } = await db.collection('templates')
        .where({
          _id: db.command.in(ids)
        })
        .get()

      this.setData({ templates: data })
    } catch (error) {
      console.error('加载模板失败:', error)
      this.setData({ templates: [] })
    }
  },

  /**
   * 加载照片
   */
  async loadPhotos(ids) {
    if (ids.length === 0) {
      this.setData({ photos: [] })
      return
    }

    try {
      const db = getDB()
      const { data } = await db.collection('photos')
        .where({
          _id: db.command.in(ids)
        })
        .get()

      this.setData({ photos: data })
    } catch (error) {
      console.error('加载照片失败:', error)
      this.setData({ photos: [] })
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
  async onUnlikeTemplate(e) {
    const { id, index } = e.currentTarget.dataset

    const res = await wx.showModal({
      title: '提示',
      content: '确定要取消点赞吗？'
    })

    if (!res.confirm) return

    try {
      wx.showLoading({ title: '处理中...' })

      const userInfo = app.globalData.userInfo
      if (!userInfo || !userInfo.openid) {
        wx.hideLoading()
        wx.showToast({ title: '请先登录', icon: 'none' })
        return
      }

      // 使用统一的 interaction 模块取消点赞
      const result = await interaction.toggleLike(id, 'template', 'templates')

      if (result.success) {
        // 从列表中移除
        const templates = this.data.templates
        templates.splice(index, 1)
        this.setData({ templates })

        wx.hideLoading()
        wx.showToast({
          title: '已取消点赞',
          icon: 'success'
        })

        // 清除相关缓存
        wx.removeStorageSync(`template_cache_${id}`)
      } else {
        wx.hideLoading()
        wx.showToast({
          title: result.message || '操作失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('取消点赞失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  /**
   * 点击照片
   */
  onPhotoTap(e) {
    const { id, index } = e.currentTarget.dataset
    // 将照片列表存入缓存供预览页使用，并标记为已点赞
    const photos = this.data.photos.map(p => ({
      ...p,
      isLiked: true  // 从点赞列表进入，标记为已点赞
    }))
    wx.setStorageSync('previewPhotos', photos)
    wx.setStorageSync('previewPhotosTemplateId', '')
    wx.navigateTo({
      url: `/pages/photo-preview/photo-preview?currentIndex=${index}`
    })
  },

  /**
   * 取消点赞照片
   */
  async onUnlikePhoto(e) {
    const { id, index } = e.currentTarget.dataset

    const res = await wx.showModal({
      title: '提示',
      content: '确定要取消点赞吗？'
    })

    if (!res.confirm) return

    try {
      wx.showLoading({ title: '处理中...' })

      const userInfo = app.globalData.userInfo
      if (!userInfo || !userInfo.openid) {
        wx.hideLoading()
        wx.showToast({ title: '请先登录', icon: 'none' })
        return
      }

      // 使用统一的 interaction 模块取消点赞
      const result = await interaction.toggleLike(id, 'photo', 'photos')

      if (result.success) {
        // 从列表中移除
        const photos = this.data.photos
        photos.splice(index, 1)
        this.setData({ photos })

        wx.hideLoading()
        wx.showToast({
          title: '已取消点赞',
          icon: 'success'
        })

        // 清除相关缓存
        const photo = this.data.photos.find(p => p._id === id)
        if (photo && photo.templateId) {
          wx.removeStorageSync(`photos_cache_${photo.templateId}`)
        }
      } else {
        wx.hideLoading()
        wx.showToast({
          title: result.message || '操作失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('取消点赞失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  /**
   * 页面显示时刷新
   */
  onShow() {
    this.loadLikes()
  }
})
