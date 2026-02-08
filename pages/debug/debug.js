// 测试页面：调试数据库
Page({
  data: {
    queryResult: '',
    insertResult: ''
  },

  // 查询模板数据
  async queryTemplates() {
    wx.showLoading({ title: '查询中...' })

    try {
      const result = await wx.cloud.callFunction({
        name: 'queryTemplates'
      })

      console.log('云函数返回:', result)

      this.setData({
        queryResult: JSON.stringify(result.result, null, 2)
      })

      wx.hideLoading()
      wx.showToast({
        title: `查询到 ${result.result.count} 条数据`,
        icon: 'success'
      })
    } catch (err) {
      console.error('查询失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '查询失败',
        icon: 'error'
      })
      this.setData({
        queryResult: JSON.stringify(err, null, 2)
      })
    }
  },

  // 插入测试数据
  async insertTestData() {
    wx.showLoading({ title: '插入中...' })

    try {
      const db = wx.cloud.database()

      // 先查询是否已有数据
      const existingCount = await db.collection('templates').count()

      if (existingCount.total > 0) {
        wx.hideLoading()
        wx.showToast({
          title: `已有 ${existingCount.total} 条数据`,
          icon: 'none'
        })
        this.setData({
          insertResult: `已有 ${existingCount.total} 条模板数据，跳过插入`
        })
        return
      }

      // 插入测试数据 - 使用已上传的云存储图片
      const testTemplates = [
        {
          name: '敦煌莫高窟主题',
          description: '探索千年艺术宝库的神秘与魅力',
          cover: 'cloud://cultural-tourism-7fb138kf77a2cb2.6375-cultural-tourism-7fb138kf77a2cb2-1400488372/templates/ancient-town.jpg',
          category: '景区主题',
          tags: ['文化', '历史', '艺术'],
          creatorId: 'system',
          creatorName: '官方',
          isOfficial: true,
          status: 'active',
          photoSetCount: 128,
          likeCount: 2456,
          sort: 1,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        },
        {
          name: '江南水乡风光',
          description: '烟雨朦胧中的诗意江南',
          cover: 'cloud://cultural-tourism-7fb138kf77a2cb2.6375-cultural-tourism-7fb138kf77a2cb2-1400488372/templates/landscape.jpg',
          category: '风格分类',
          tags: ['水乡', '古镇', '自然'],
          creatorId: 'system',
          creatorName: '官方',
          isOfficial: true,
          status: 'active',
          photoSetCount: 95,
          likeCount: 1823,
          sort: 2,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        },
        {
          name: '都市夜景打卡',
          description: '记录城市霓虹下的璀璨瞬间',
          cover: 'cloud://cultural-tourism-7fb138kf77a2cb2.6375-cultural-tourism-7fb138kf77a2cb2-1400488372/templates/cherry-blossom.jpg',
          category: '场景打卡',
          tags: ['城市', '夜景', '现代'],
          creatorId: 'system',
          creatorName: '官方',
          isOfficial: true,
          status: 'active',
          photoSetCount: 76,
          likeCount: 1542,
          sort: 3,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      ]

      // 逐条插入
      const results = []
      for (let template of testTemplates) {
        const result = await db.collection('templates').add({
          data: template
        })
        results.push(result)
      }

      console.log('插入成功:', results)

      this.setData({
        insertResult: JSON.stringify({
          success: true,
          message: '测试数据插入成功',
          insertedCount: results.length,
          ids: results.map(r => r._id)
        }, null, 2)
      })

      wx.hideLoading()
      wx.showToast({
        title: '插入成功',
        icon: 'success'
      })
    } catch (err) {
      console.error('插入失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '插入失败: ' + err.message,
        icon: 'error'
      })
      this.setData({
        insertResult: JSON.stringify(err, null, 2)
      })
    }
  },

  // 直接查询数据库
  async directQuery() {
    wx.showLoading({ title: '查询中...' })

    try {
      const db = wx.cloud.database()
      const result = await db.collection('templates').get()

      console.log('直接查询结果:', result)

      this.setData({
        queryResult: JSON.stringify({
          count: result.data.length,
          templates: result.data
        }, null, 2)
      })

      wx.hideLoading()
      wx.showToast({
        title: `查询到 ${result.data.length} 条数据`,
        icon: 'success'
      })
    } catch (err) {
      console.error('查询失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '查询失败: ' + err.message,
        icon: 'error'
      })
      this.setData({
        queryResult: JSON.stringify(err, null, 2)
      })
    }
  }
})
