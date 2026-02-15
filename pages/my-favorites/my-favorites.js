// pages/my-favorites/my-favorites.js
const app = getApp()

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    currentTab: 0, // 0-模板, 1-照片集, 2-商品, 3-地点
    templates: [],
    photoSets: [],
    goods: [],
    locations: [],
    loading: false,
    refreshing: false
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
   * 下拉刷新
   */
  onRefresh() {
    this.setData({ refreshing: true })
    this.loadFavorites()
  },

  /**
   * 加载收藏列表
   */
  loadFavorites() {
    // 从本地存储获取收藏的ID列表
    const favoriteTemplates = wx.getStorageSync('favoriteTemplates') || []
    const favoritePhotoSets = wx.getStorageSync('favoritePhotoSets') || []
    const favoriteGoods = wx.getStorageSync('favoriteGoods') || []
    const favoriteLocations = wx.getStorageSync('favoriteLocations') || []

    if (favoriteTemplates.length === 0 && favoritePhotoSets.length === 0 && favoriteGoods.length === 0 && favoriteLocations.length === 0) {
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
    const totalCollections = 4

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
          checkComplete()
        })
        .catch(err => {
          console.error('加载模板失败:', err)
          checkComplete()
        })
    } else {
      checkComplete()
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
          this.setData({ photoSets: res.data })
          checkComplete()
        })
        .catch(err => {
          console.error('加载照片集失败:', err)
          checkComplete()
        })
    } else {
      checkComplete()
    }

    // 加载收藏的商品
    if (favoriteGoods.length > 0) {
      db.collection('goods')
        .where({
          _id: _.in(favoriteGoods)
        })
        .get()
        .then(res => {
          console.log('收藏的商品:', res.data)
          // 处理图片字段
          res.data.forEach(item => {
            if (!item.img && item.coverImage) {
              item.img = item.coverImage
            }
          })
          this.setData({ goods: res.data })
          checkComplete()
        })
        .catch(err => {
          console.error('加载商品失败:', err)
          checkComplete()
        })
    } else {
      checkComplete()
    }

    // 加载收藏的地点
    if (favoriteLocations.length > 0) {
      db.collection('locations')
        .where({
          _id: _.in(favoriteLocations)
        })
        .get()
        .then(async res => {
          console.log('收藏的地点:', res.data)
          // 转换云存储路径为临时URL
          const fileList = res.data.map(item => item.coverImage).filter(url => url && url.startsWith('cloud://'))
          if (fileList.length > 0) {
            const result = await wx.cloud.getTempFileURL({
              fileList: fileList
            })
            const urlMap = {}
            result.fileList.forEach(file => {
              if (file.status === 0) {
                urlMap[file.fileID] = file.tempFileURL
              }
            })
            res.data.forEach(item => {
              if (item.coverImage && urlMap[item.coverImage]) {
                item.coverImage = urlMap[item.coverImage]
              }
            })
          }
          this.setData({ locations: res.data })
          checkComplete()
        })
        .catch(err => {
          console.error('加载地点失败:', err)
          checkComplete()
        })
    } else {
      checkComplete()
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
   * 点击商品卡片
   */
  onGoodsTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/good-info/good-info?id=${id}`
    })
  },

  /**
   * 点击地点卡片
   */
  onLocationTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/location-detail/location-detail?id=${id}`
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

  /**
   * 取消收藏商品
   */
  onUnfavoriteGoods(e) {
    const { id, index } = e.currentTarget.dataset

    wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏这个商品吗？',
      confirmText: '取消收藏',
      success: res => {
        if (res.confirm) {
          let favoriteGoods = wx.getStorageSync('favoriteGoods') || []
          favoriteGoods = favoriteGoods.filter(goodsId => goodsId !== id)
          wx.setStorageSync('favoriteGoods', favoriteGoods)

          // 从列表中移除
          const goods = this.data.goods
          goods.splice(index, 1)
          this.setData({ goods })

          wx.showToast({
            title: '已取消收藏',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 取消收藏地点
   */
  onUnfavoriteLocation(e) {
    const { id, index } = e.currentTarget.dataset

    wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏这个地点吗？',
      confirmText: '取消收藏',
      success: res => {
        if (res.confirm) {
          let favoriteLocations = wx.getStorageSync('favoriteLocations') || []
          favoriteLocations = favoriteLocations.filter(locationId => locationId !== id)
          wx.setStorageSync('favoriteLocations', favoriteLocations)

          // 从列表中移除
          const locations = this.data.locations
          locations.splice(index, 1)
          this.setData({ locations })

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
