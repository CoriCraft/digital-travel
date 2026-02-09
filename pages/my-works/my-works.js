// pages/my-works/my-works.js
const app = getApp()

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    currentTab: 0, // 0-模板, 1-照片集
    templates: [],
    photoSets: [],
    loading: false,
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
   * 切换标签
   */
  onTabChange(e) {
    const { index } = e.currentTarget.dataset
    this.setData({ currentTab: index })
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

    this.setData({ loading: true })
    wx.showLoading({ title: '加载中...' })

    const db = wx.cloud.database()

    // 加载我创建的模板
    db.collection('templates')
      .where({
        creatorId: userInfo.openid
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        console.log('我的模板:', res.data)
        this.setData({ templates: res.data })
      })
      .catch(err => {
        console.error('加载模板失败:', err)
      })

    // 加载我上传的照片集
    db.collection('photoSets')
      .where({
        userId: userInfo.openid
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        console.log('我的照片集:', res.data)
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
   * 删除模板
   */
  onDeleteTemplate(e) {
    const { id, index } = e.currentTarget.dataset

    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这个模板吗？',
      confirmText: '删除',
      confirmColor: '#FF4444',
      success: res => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })

          const db = wx.cloud.database()
          db.collection('templates')
            .doc(id)
            .remove()
            .then(() => {
              wx.hideLoading()
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })

              // 从列表中移除
              const templates = this.data.templates
              templates.splice(index, 1)
              this.setData({ templates })
            })
            .catch(err => {
              wx.hideLoading()
              console.error('删除失败:', err)
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              })
            })
        }
      }
    })
  },

  /**
   * 删除照片集
   */
  onDeletePhotoSet(e) {
    const { id, index } = e.currentTarget.dataset

    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这个照片集吗？',
      confirmText: '删除',
      confirmColor: '#FF4444',
      success: res => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })

          const db = wx.cloud.database()
          db.collection('photoSets')
            .doc(id)
            .remove()
            .then(() => {
              wx.hideLoading()
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })

              // 从列表中移除
              const photoSets = this.data.photoSets
              photoSets.splice(index, 1)
              this.setData({ photoSets })
            })
            .catch(err => {
              wx.hideLoading()
              console.error('删除失败:', err)
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              })
            })
        }
      }
    })
  },

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const statusMap = {
      'pending': '审核中',
      'approved': '已通过',
      'rejected': '已拒绝',
      'active': '已发布'
    }
    return statusMap[status] || '未知'
  },

  /**
   * 获取状态颜色
   */
  getStatusColor(status) {
    const colorMap = {
      'pending': '#FF9800',
      'approved': '#4CAF50',
      'rejected': '#F44336',
      'active': '#4CAF50'
    }
    return colorMap[status] || '#999'
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadMyWorks()
  }
})
