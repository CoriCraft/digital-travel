// pages/feedback/feedback.js
const app = getApp()
const { checkImageSecurity } = require('../../utils/util.js')

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    feedbackTypes: [
      { value: 'bug', label: '功能异常', icon: 'error-circle' },
      { value: 'suggestion', label: '功能建议', icon: 'lightbulb' },
      { value: 'content', label: '内容问题', icon: 'file-text' },
      { value: 'other', label: '其他问题', icon: 'help-circle' }
    ],
    selectedType: 'bug',
    content: '',
    images: [],
    contact: '',
    submitting: false,
    historyList: []
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    })

    // 加载历史反馈
    this.loadHistory()
  },

  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack()
  },

  /**
   * 选择反馈类型
   */
  onTypeSelect(e) {
    const { value } = e.currentTarget.dataset
    this.setData({ selectedType: value })
  },

  /**
   * 输入问题描述
   */
  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  /**
   * 输入联系方式
   */
  onContactInput(e) {
    this.setData({ contact: e.detail.value })
  },

  /**
   * 选择图片
   */
  async onChooseImage() {
    const remainCount = 3 - this.data.images.length
    wx.chooseImage({
      count: remainCount,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePaths = res.tempFilePaths

        wx.showLoading({ title: `审核图片中 0/${tempFilePaths.length}` })

        try {
          // 逐个审核图片，必须全部通过
          for (let i = 0; i < tempFilePaths.length; i++) {
            wx.showLoading({ title: `审核图片中 ${i + 1}/${tempFilePaths.length}` })

            const checkResult = await checkImageSecurity(tempFilePaths[i])

            if (!checkResult.success) {
              wx.hideLoading()
              wx.showModal({
                title: '图片审核失败',
                content: `第${i + 1}张图片：${checkResult.errMsg}\n\n所有图片必须通过审核才能添加，请重新选择`,
                showCancel: false
              })
              return // 有一张不通过就全部拒绝
            }
          }

          wx.hideLoading()

          // 全部通过，添加到列表
          this.setData({
            images: [...this.data.images, ...tempFilePaths]
          })

          wx.showToast({
            title: `已添加${tempFilePaths.length}张图片`,
            icon: 'success'
          })
        } catch (err) {
          console.error('图片审核异常:', err)
          wx.hideLoading()
          wx.showToast({
            title: '图片审核失败，请重试',
            icon: 'none'
          })
        }
      }
    })
  },

  /**
   * 删除图片
   */
  onDeleteImage(e) {
    const { index } = e.currentTarget.dataset
    const images = this.data.images
    images.splice(index, 1)
    this.setData({ images })
  },

  /**
   * 提交反馈
   */
  async onSubmit() {
    const { selectedType, content, images, contact } = this.data

    // 验证
    if (!content.trim()) {
      wx.showToast({
        title: '请输入问题描述',
        icon: 'none'
      })
      return
    }

    this.setData({ submitting: true })

    try {
      const userInfo = app.globalData.userInfo
      const db = wx.cloud.database()

      // 上传图片到云存储
      let imageUrls = []
      if (images.length > 0) {
        wx.showLoading({ title: '上传图片中...' })
        for (let i = 0; i < images.length; i++) {
          const cloudPath = `feedback/${userInfo.openid}_${Date.now()}_${i}.jpg`
          const result = await wx.cloud.uploadFile({
            cloudPath,
            filePath: images[i]
          })
          imageUrls.push(result.fileID)
        }
        wx.hideLoading()
      }

      // 保存反馈到数据库
      wx.showLoading({ title: '提交中...' })
      await db.collection('feedbacks').add({
        data: {
          userId: userInfo.openid,
          userName: userInfo.nickName || '微信用户',
          type: selectedType,
          content: content.trim(),
          images: imageUrls,
          imagesCheckStatus: imageUrls.length > 0 ? 'passed' : 'none', // 图片审核状态：passed-通过, rejected-拒绝, pending-待审核, none-无图片
          imagesCheckTime: imageUrls.length > 0 ? db.serverDate() : null, // 图片审核时间
          imagesCheckMethod: imageUrls.length > 0 ? 'auto' : null, // 审核方式：auto-自动审核, manual-人工审核
          contact: contact.trim(),
          status: 'pending', // pending-待处理, processing-处理中, resolved-已解决
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })

      wx.hideLoading()
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      })

      // 清空表单
      this.setData({
        content: '',
        images: [],
        contact: '',
        submitting: false
      })

      // 重新加载历史
      setTimeout(() => {
        this.loadHistory()
      }, 1000)

    } catch (err) {
      console.error('提交反馈失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      })
      this.setData({ submitting: false })
    }
  },

  /**
   * 加载历史反馈
   */
  async loadHistory() {
    try {
      const userInfo = app.globalData.userInfo
      if (!userInfo || !userInfo.openid) {
        return
      }

      const db = wx.cloud.database()
      const { data } = await db.collection('feedbacks')
        .where({
          userId: userInfo.openid
        })
        .orderBy('createTime', 'desc')
        .limit(10)
        .get()

      // 格式化时间
      const historyList = data.map(item => ({
        ...item,
        createTime: this.formatTime(item.createTime)
      }))

      this.setData({ historyList })
    } catch (err) {
      console.error('加载历史反馈失败:', err)
    }
  },

  /**
   * 点击历史反馈
   */
  onHistoryTap(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.historyList.find(h => h._id === id)

    let statusText = this.getStatusText(item.status)
    let reply = item.reply ? `\n\n客服回复：${item.reply}` : ''

    wx.showModal({
      title: this.getTypeLabel(item.type),
      content: `${item.content}${reply}\n\n状态：${statusText}\n时间：${item.createTime}`,
      showCancel: false
    })
  },

  /**
   * 获取类型图标
   */
  getTypeIcon(type) {
    const typeObj = this.data.feedbackTypes.find(t => t.value === type)
    return typeObj ? typeObj.icon : 'help-circle'
  },

  /**
   * 获取类型标签
   */
  getTypeLabel(type) {
    const typeObj = this.data.feedbackTypes.find(t => t.value === type)
    return typeObj ? typeObj.label : '其他问题'
  },

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const statusMap = {
      'pending': '待处理',
      'processing': '处理中',
      'resolved': '已解决'
    }
    return statusMap[status] || '未知'
  },

  /**
   * 格式化时间
   */
  formatTime(date) {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  }
})
