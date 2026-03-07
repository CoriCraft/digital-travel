// pages/my-favorites/my-favorites.js
const app = getApp()

function getDB() {
  return wx.cloud.database()
}

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    currentTab: 0, // 0-模板, 1-商品, 2-地点, 3-照片
    templates: [],
    goods: [],
    locations: [],
    photos: [],
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
   * 加载收藏列表（从云端数据库）
   */
  async loadFavorites() {
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

      // 查询用户的所有收藏记录
      const { data: favorites } = await db.collection('user_favorites')
        .where({
          userId: openid
        })
        .orderBy('createTime', 'desc')
        .get()

      console.log('收藏记录:', favorites)

      // 按类型分组
      const templateIds = []
      const goodsIds = []
      const locationIds = []
      const photoIds = []

      favorites.forEach(item => {
        switch (item.targetType) {
          case 'template':
            templateIds.push(item.targetId)
            break
          case 'goods':
            goodsIds.push(item.targetId)
            break
          case 'location':
            locationIds.push(item.targetId)
            break
          case 'photo':
            photoIds.push(item.targetId)
            break
        }
      })

      // 批量查询资源详情
      await Promise.all([
        this.loadTemplates(templateIds),
        this.loadGoods(goodsIds),
        this.loadLocations(locationIds),
        this.loadPhotos(photoIds)
      ])

      this.setData({
        loading: false,
        refreshing: false
      })
      wx.hideLoading()
    } catch (error) {
      console.error('加载收藏列表失败:', error)
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
   * 加载商品
   */
  async loadGoods(ids) {
    if (ids.length === 0) {
      this.setData({ goods: [] })
      return
    }

    try {
      const db = getDB()
      const { data } = await db.collection('goods')
        .where({
          _id: db.command.in(ids)
        })
        .get()

      // 处理图片字段
      data.forEach(item => {
        if (!item.img && item.coverImage) {
          item.img = item.coverImage
        }
      })

      this.setData({ goods: data })
    } catch (error) {
      console.error('加载商品失败:', error)
      this.setData({ goods: [] })
    }
  },

  /**
   * 加载地点
   */
  async loadLocations(ids) {
    if (ids.length === 0) {
      this.setData({ locations: [] })
      return
    }

    try {
      const db = getDB()
      const { data } = await db.collection('locations')
        .where({
          _id: db.command.in(ids)
        })
        .get()

      // 转换云存储路径为临时URL
      const fileList = data.map(item => item.coverImage).filter(url => url && url.startsWith('cloud://'))
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
        data.forEach(item => {
          if (item.coverImage && urlMap[item.coverImage]) {
            item.coverImage = urlMap[item.coverImage]
          }
        })
      }

      this.setData({ locations: data })
    } catch (error) {
      console.error('加载地点失败:', error)
      this.setData({ locations: [] })
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
   * 点击模板卡片
   */
  onTemplateTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/template-detail/template-detail?id=${id}`
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
   * 点击照片卡片
   */
  onPhotoTap(e) {
    const { id, index } = e.currentTarget.dataset
    // 将照片列表存入缓存供预览页使用
    wx.setStorageSync('previewPhotos', this.data.photos)
    wx.navigateTo({
      url: `/pages/photo-preview/photo-preview?currentIndex=${index}`
    })
  },

  /**
   * 取消收藏模板
   */
  async onUnfavoriteTemplate(e) {
    const { id, index } = e.currentTarget.dataset

    const res = await wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏这个模板吗？',
      confirmText: '取消收藏'
    })

    if (!res.confirm) return

    try {
      wx.showLoading({ title: '处理中...' })

      const db = getDB()
      const userInfo = app.globalData.userInfo
      if (!userInfo || !userInfo.openid) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        return
      }

      // 删除收藏记录
      await db.collection('user_favorites')
        .where({
          userId: userInfo.openid,
          targetId: id,
          targetType: 'template'
        })
        .remove()

      // 更新模板的收藏数
      await db.collection('templates').doc(id).update({
        data: {
          favoriteCount: db.command.inc(-1)
        }
      })

      // 从列表中移除
      const templates = this.data.templates
      templates.splice(index, 1)
      this.setData({ templates })

      wx.hideLoading()
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      })

      // 清除缓存
      wx.removeStorageSync(`favorite_status_template_${id}`)
    } catch (error) {
      console.error('取消收藏失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  /**
   * 取消收藏商品
   */
  async onUnfavoriteGoods(e) {
    const { id, index } = e.currentTarget.dataset

    const res = await wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏这个商品吗？',
      confirmText: '取消收藏'
    })

    if (!res.confirm) return

    try {
      wx.showLoading({ title: '处理中...' })

      const db = getDB()
      const userInfo = app.globalData.userInfo
      if (!userInfo || !userInfo.openid) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        return
      }

      // 删除收藏记录
      await db.collection('user_favorites')
        .where({
          userId: userInfo.openid,
          targetId: id,
          targetType: 'goods'
        })
        .remove()

      // 更新商品的收藏数
      await db.collection('goods').doc(id).update({
        data: {
          favoriteCount: db.command.inc(-1)
        }
      })

      // 从列表中移除
      const goods = this.data.goods
      goods.splice(index, 1)
      this.setData({ goods })

      wx.hideLoading()
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      })

      // 清除缓存
      wx.removeStorageSync(`favorite_status_goods_${id}`)
    } catch (error) {
      console.error('取消收藏失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  /**
   * 取消收藏地点
   */
  async onUnfavoriteLocation(e) {
    const { id, index } = e.currentTarget.dataset

    const res = await wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏这个地点吗？',
      confirmText: '取消收藏'
    })

    if (!res.confirm) return

    try {
      wx.showLoading({ title: '处理中...' })

      const db = getDB()
      const userInfo = app.globalData.userInfo
      if (!userInfo || !userInfo.openid) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        return
      }

      // 删除收藏记录
      await db.collection('user_favorites')
        .where({
          userId: userInfo.openid,
          targetId: id,
          targetType: 'location'
        })
        .remove()

      // 更新地点的收藏数
      await db.collection('locations').doc(id).update({
        data: {
          favoriteCount: db.command.inc(-1)
        }
      })

      // 从列表中移除
      const locations = this.data.locations
      locations.splice(index, 1)
      this.setData({ locations })

      wx.hideLoading()
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      })

      // 清除缓存
      wx.removeStorageSync(`favorite_status_location_${id}`)
    } catch (error) {
      console.error('取消收藏失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  /**
   * 取消收藏照片
   */
  async onUnfavoritePhoto(e) {
    const { id, index } = e.currentTarget.dataset

    const res = await wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏这张照片吗？',
      confirmText: '取消收藏'
    })

    if (!res.confirm) return

    try {
      wx.showLoading({ title: '处理中...' })

      const db = getDB()
      const userInfo = app.globalData.userInfo
      if (!userInfo || !userInfo.openid) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        return
      }

      // 删除收藏记录
      await db.collection('user_favorites')
        .where({
          userId: userInfo.openid,
          targetId: id,
          targetType: 'photo'
        })
        .remove()

      // 更新照片的收藏数
      await db.collection('photos').doc(id).update({
        data: {
          favoriteCount: db.command.inc(-1)
        }
      })

      // 从列表中移除
      const photos = this.data.photos
      photos.splice(index, 1)
      this.setData({ photos })

      wx.hideLoading()
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      })

      // 清除缓存
      wx.removeStorageSync(`favorite_status_photo_${id}`)
    } catch (error) {
      console.error('取消收藏失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadFavorites()
  }
})
