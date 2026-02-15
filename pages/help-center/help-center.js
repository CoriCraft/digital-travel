// pages/help-center/help-center.js
const app = getApp()

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    searchKeyword: '',
    questions: [
      {
        id: 1,
        title: '如何收藏模板和地点？',
        preview: '点击详情页的星星图标即可收藏...',
        answer: '在模板详情页、照片集详情页、商品详情页或地点详情页，点击右上角或底部的星星图标（⭐）即可收藏。收藏后图标会变为实心金色星星。您可以在"我的"-"我的收藏"中查看所有收藏内容。',
        expanded: false
      },
      {
        id: 2,
        title: '如何购买商品？',
        preview: '点击"立即购买"复制链接...',
        answer: '本小程序采用导流模式，不直接支持在线支付。点击商品详情页的"立即购买"按钮，系统会自动复制商品购买链接。然后您可以在微信聊天窗口粘贴打开，跳转到外部平台（淘宝/京东/拼多多等）完成购买。',
        expanded: false
      },
      {
        id: 3,
        title: '如何创建自己的模板？',
        preview: '在创意模板页面点击创建按钮...',
        answer: '进入"创意模板"页面，点击右下角的"+"按钮，填写模板名称、描述、选择分类和风格，上传封面图片，即可创建模板。创建后可以在"我的作品"中查看和管理。',
        expanded: false
      },
      {
        id: 4,
        title: '如何上传照片集？',
        preview: '在模板详情页点击上传照片集...',
        answer: '进入模板详情页，点击"上传照片集"按钮，填写照片集标题和描述，选择拍摄地点，从相册中选择照片（最多9张），即可上传。上传后的照片集会显示在模板详情页中。',
        expanded: false
      },
      {
        id: 5,
        title: '如何查看我的作品？',
        preview: '在"我的"页面点击"我的作品"...',
        answer: '进入"我的"页面，点击"我的作品"菜单，可以查看您创建的所有模板和上传的照片集。支持查看浏览量、点赞数、收藏数等数据统计，也可以删除作品。',
        expanded: false
      },
      {
        id: 6,
        title: '如何打卡地点？',
        preview: '在地点详情页点击打卡按钮...',
        answer: '进入地点详情页，点击底部的"打卡"按钮，系统会记录您的打卡信息。打卡后可以写评价、上传照片，分享您的体验。',
        expanded: false
      },
      {
        id: 7,
        title: '如何分享内容？',
        preview: '点击分享按钮可以分享给好友...',
        answer: '在模板详情页、照片集详情页、商品详情页或地点详情页，点击右上角的分享按钮，可以分享给微信好友或分享到朋友圈。分享后可以增加内容的曝光度。',
        expanded: false
      },
      {
        id: 8,
        title: '数据统计说明',
        preview: '浏览量、点赞数、收藏数等数据...',
        answer: '浏览量：内容被查看的次数（1小时内不重复计数）\n点赞数：用户点赞的次数\n收藏数：用户收藏的次数\n复制链接：商品购买链接被复制的次数（24小时内只算一次）\n分享次数：内容被分享的次数',
        expanded: false
      }
    ],
    filteredQuestions: [],
    guides: [
      {
        id: 1,
        icon: 'view-module',
        title: '创意模板使用指南',
        desc: '了解如何浏览、收藏和创建模板',
        color: '#3ECE79'
      },
      {
        id: 2,
        icon: 'location',
        title: '线下体验指南',
        desc: '探索地点、打卡、写评价',
        color: '#FF9800'
      },
      {
        id: 3,
        icon: 'cart',
        title: '商品购买指南',
        desc: '了解导流购买流程',
        color: '#FF4444'
      },
      {
        id: 4,
        icon: 'user',
        title: '个人中心指南',
        desc: '管理作品、收藏和个人信息',
        color: '#2196F3'
      }
    ]
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      filteredQuestions: this.data.questions
    })
  },

  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack()
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    const keyword = e.detail.value.trim().toLowerCase()
    this.setData({ searchKeyword: keyword })

    if (keyword === '') {
      this.setData({ filteredQuestions: this.data.questions })
      return
    }

    const filtered = this.data.questions.filter(q =>
      q.title.toLowerCase().includes(keyword) ||
      q.answer.toLowerCase().includes(keyword)
    )
    this.setData({ filteredQuestions: filtered })
  },

  /**
   * 点击问题
   */
  onQuestionTap(e) {
    const { id } = e.currentTarget.dataset
    const questions = this.data.filteredQuestions.map(q => {
      if (q.id === id) {
        return { ...q, expanded: !q.expanded }
      }
      return q
    })
    this.setData({ filteredQuestions: questions })
  },

  /**
   * 点击功能指南
   */
  onGuideTap(e) {
    const { id } = e.currentTarget.dataset
    const guide = this.data.guides.find(g => g.id === id)

    wx.showModal({
      title: guide.title,
      content: '功能指南详情页面开发中，敬请期待！',
      showCancel: false
    })
  },

  /**
   * 拨打电话
   */
  onCallPhone() {
    wx.makePhoneCall({
      phoneNumber: '4001234567',
      fail: () => {
        wx.showToast({
          title: '拨号失败',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 复制邮箱
   */
  onCopyEmail() {
    wx.setClipboardData({
      data: 'support@example.com',
      success: () => {
        wx.showToast({
          title: '邮箱已复制',
          icon: 'success'
        })
      }
    })
  },

  /**
   * 打开微信客服
   */
  onOpenWechat() {
    wx.setClipboardData({
      data: 'digitaltravel2024',
      success: () => {
        wx.showToast({
          title: '微信号已复制',
          icon: 'success'
        })
      }
    })
  }
})
