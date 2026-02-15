// pages/messages/messages.js
const app = getApp()

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    messages: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    filterType: 'all',
    unreadCount: 0
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    })

    // 恢复数据加载
    this.loadMessages()
    this.loadUnreadCount()
  },

  /**
   * 加载消息列表
   */
  async loadMessages(refresh = false) {
    if (this.data.loading) return

    if (refresh) {
      this.setData({
        page: 1,
        messages: [],
        hasMore: true
      })
    }

    if (!this.data.hasMore && !refresh) return

    this.setData({ loading: true })

    try {
      const params = {
        page: this.data.page,
        pageSize: this.data.pageSize
      }

      if (this.data.filterType !== 'all') {
        params.type = this.data.filterType
      }

      const res = await wx.cloud.callFunction({
        name: 'getMessages',
        data: params
      })

      if (res.result && res.result.success) {
        // 格式化消息数据
        const formattedMessages = res.result.data.map(msg => ({
          ...msg,
          formattedTime: this.formatTime(msg.createdAt),
          typeText: this.getMessageTypeText(msg.type)
        }))

        const newMessages = refresh ? formattedMessages : [...this.data.messages, ...formattedMessages]

        this.setData({
          messages: newMessages,
          hasMore: res.result.hasMore,
          page: this.data.page + 1,
          loading: false
        })
      } else {
        throw new Error(res.result?.errMsg || '加载失败')
      }
    } catch (err) {
      console.error('加载消息失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  /**
   * 加载未读消息数量
   */
  async loadUnreadCount() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getUnreadCount'
      })

      if (res.result && res.result.success) {
        this.setData({
          unreadCount: res.result.count || 0
        })
      }
    } catch (err) {
      console.error('加载未读数量失败:', err)
      // 静默失败，不影响页面显示
    }
  },

  /**
   * 获取消息类型文本
   */
  getMessageTypeText(type) {
    const typeMap = {
      'warning': '警告通知',
      'report_handled': '举报处理',
      'feedback_replied': '反馈回复',
      'system': '系统通知'
    }
    return typeMap[type] || '通知'
  },

  /**
   * 格式化时间
   */
  formatTime(date) {
    if (!date) return ''

    const now = new Date()
    const msgDate = new Date(date)
    const diff = now - msgDate

    // 1分钟内
    if (diff < 60000) {
      return '刚刚'
    }

    // 1小时内
    if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟前'
    }

    // 今天
    if (now.toDateString() === msgDate.toDateString()) {
      return msgDate.getHours() + ':' + String(msgDate.getMinutes()).padStart(2, '0')
    }

    // 昨天
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (yesterday.toDateString() === msgDate.toDateString()) {
      return '昨天 ' + msgDate.getHours() + ':' + String(msgDate.getMinutes()).padStart(2, '0')
    }

    // 其他
    return (msgDate.getMonth() + 1) + '-' + msgDate.getDate()
  },

  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack()
  },

  /**
   * 标记全部已读
   */
  async markAllRead() {
    if (this.data.unreadCount === 0) {
      wx.showToast({
        title: '没有未读消息',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认操作',
      content: '确定要标记所有消息为已读吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' })

            await wx.cloud.callFunction({
              name: 'markMessageRead',
              data: {
                markAll: true
              }
            })

            // 更新本地状态
            const messages = this.data.messages.map(m => ({
              ...m,
              status: 'read'
            }))

            this.setData({
              messages,
              unreadCount: 0
            })

            wx.hideLoading()
            wx.showToast({
              title: '已全部标记为已读',
              icon: 'success'
            })
          } catch (err) {
            console.error('标记全部已读失败:', err)
            wx.hideLoading()
            wx.showToast({
              title: '操作失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  /**
   * 切换筛选类型
   */
  onFilterChange(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.filterType) return

    this.setData({
      filterType: type,
      page: 1,
      messages: [],
      hasMore: true
    })

    // 重新加载数据
    this.loadMessages(true)
  },

  /**
   * 点击消息项
   */
  async onMessageTap(e) {
    const message = e.currentTarget.dataset.message
    if (!message) return

    // 如果是未读消息，标记为已读
    if (message.status === 'unread') {
      try {
        await wx.cloud.callFunction({
          name: 'markMessageRead',
          data: {
            messageId: message._id
          }
        })

        // 更新本地状态
        const messages = this.data.messages.map(m => {
          if (m._id === message._id) {
            return { ...m, status: 'read' }
          }
          return m
        })

        this.setData({
          messages,
          unreadCount: Math.max(0, this.data.unreadCount - 1)
        })
      } catch (err) {
        console.error('标记已读失败:', err)
      }
    }

    // 根据消息类型跳转到相关页面
    if (message.relatedType && message.relatedId) {
      this.navigateToRelated(message.relatedType, message.relatedId)
    }
  },

  /**
   * 跳转到相关页面
   */
  navigateToRelated(type, id) {
    let url = ''

    switch (type) {
      case 'report':
        // 举报相关
        break
      case 'feedback':
        url = '/pages/feedback/feedback'
        break
      default:
        return
    }

    if (url) {
      wx.navigateTo({ url })
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadMessages(true)
    this.loadUnreadCount()
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMessages(false)
    }
  },
})
