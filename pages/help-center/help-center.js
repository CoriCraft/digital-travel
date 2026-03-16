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
        title: '如何收藏内容？',
        preview: '在详情页底部点击星星图标...',
        answer: '在模板详情页、照片详情页、商品详情页或地点详情页，点击底部操作栏的星星图标（⭐）即可收藏。收藏后图标会变为实心金色星星。您可以在"我的"-"我的收藏"中查看所有收藏的模板、照片、商品和地点。',
        expanded: false
      },
      {
        id: 2,
        title: '如何购买商品？',
        preview: '扫描商品详情页的二维码...',
        answer: '商品详情页会显示商品购买二维码。您可以直接长按二维码识别跳转到购买页面，或者将商品分享给自己，在聊天窗口中扫描二维码完成购买。本小程序采用导流模式，会跳转到淘宝、京东、拼多多等外部平台完成支付。',
        expanded: false
      },
      {
        id: 3,
        title: '如何上传照片？',
        preview: '在模板详情页点击上传按钮...',
        answer: '进入模板详情页，点击"上传照片"按钮，选择拍摄地点，从相册中选择照片（最多9张），填写照片描述，即可上传。上传后的照片会在审核通过后显示在模板详情页中，其他用户也可以看到您的作品。',
        expanded: false
      },
      {
        id: 4,
        title: '如何获取旅拍相册？',
        preview: '扫描旅拍机二维码获取照片...',
        answer: '在景区使用旅拍机拍照后，扫描旅拍机上的二维码，在弹出的窗口中选择"保存到旅拍相册"，即可将旅拍机拍摄的电子照片自动保存到您的旅拍相册中。您可以在"旅拍相册"页面查看、管理和分享这些照片。',
        expanded: false
      },
      {
        id: 5,
        title: '如何分享内容？',
        preview: '点击右上角菜单分享...',
        answer: '在模板详情页、照片详情页、商品详情页或地点详情页，点击右上角的"..."菜单按钮，选择"转发"可以分享给微信好友，选择"分享到朋友圈"可以分享到朋友圈。分享后可以增加内容的曝光度，让更多人看到精彩内容。',
        expanded: false
      },
      {
        id: 6,
        title: '如何打卡地点？',
        preview: '在地点详情页点击打卡按钮...',
        answer: '进入地点详情页，点击底部的"打卡"按钮，系统会获取您的位置信息。只有在距离地点一定范围内才能成功打卡。打卡后可以写评价、上传照片，分享您的体验。打卡记录会显示在您的个人中心。',
        expanded: false
      },
      {
        id: 7,
        title: '删除照片和相册说明',
        preview: '删除照片的注意事项...',
        answer: '删除模板内最后一张照片或旅拍相册最后一张照片后，该模板或旅拍相册将被自动删除。如果您创建的模板内有其他用户上传的照片，您将无法删除该模板。删除封面图后，下一张照片将自动顺位成为新的封面。请谨慎操作，删除后不可恢复。',
        expanded: false
      },
      {
        id: 8,
        title: '修改头像和昵称',
        preview: '头像和昵称修改限制...',
        answer: '为了维护良好的社区环境，头像和昵称每24小时只能修改一次。在"我的"页面点击头像可以更换头像，点击昵称可以修改昵称。修改后需要等待24小时才能再次修改。头像会进行内容安全检测，请使用合规的图片。',
        expanded: false
      }
    ],
    filteredQuestions: []
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
    const keyword = e.detail.value.trim()
    this.setData({ searchKeyword: keyword })
  },

  /**
   * 执行搜索
   */
  onSearch() {
    const keyword = this.data.searchKeyword.trim().toLowerCase()

    if (keyword === '') {
      this.setData({ filteredQuestions: this.data.questions })
      return
    }

    const filtered = this.data.questions.filter(q =>
      q.title.toLowerCase().includes(keyword) ||
      q.answer.toLowerCase().includes(keyword)
    )
    this.setData({ filteredQuestions: filtered })

    if (filtered.length === 0) {
      wx.showToast({
        title: '未找到相关内容',
        icon: 'none'
      })
    }
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
  }
})
