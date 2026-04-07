// 云函数：插入测试模板数据
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 先查询是否已有数据
    const existingTemplates = await db.collection('templates').count()

    console.log('现有模板数量:', existingTemplates.total)

    if (existingTemplates.total > 0) {
      return {
        success: true,
        message: '已有模板数据，跳过插入',
        count: existingTemplates.total
      }
    }

    // 插入测试数据
    const testTemplates = [
      {
        name: '敦煌莫高窟主题',
        description: '探索千年艺术宝库的神秘与魅力',
        cover: 'cloud://prod-6g0gqkok3e2c1c84.7072-prod-6g0gqkok3e2c1c84-1330495676/templates/dunhuang.svg',
        category: '景区主题',
        tags: ['文化', '历史', '艺术'],
        creatorId: 'system',
        creatorName: '官方',
        isOfficial: true,
        status: 'active',
        photoSetCount: 128,
        likeCount: 2456,
        sort: 1,
        createTime: new Date(),
        updateTime: new Date()
      },
      {
        name: '江南水乡风光',
        description: '烟雨朦胧中的诗意江南',
        cover: 'cloud://prod-6g0gqkok3e2c1c84.7072-prod-6g0gqkok3e2c1c84-1330495676/templates/jiangnan.svg',
        category: '风格分类',
        tags: ['水乡', '古镇', '自然'],
        creatorId: 'system',
        creatorName: '官方',
        isOfficial: true,
        status: 'active',
        photoSetCount: 95,
        likeCount: 1823,
        sort: 2,
        createTime: new Date(),
        updateTime: new Date()
      },
      {
        name: '都市夜景打卡',
        description: '记录城市霓虹下的璀璨瞬间',
        cover: 'cloud://prod-6g0gqkok3e2c1c84.7072-prod-6g0gqkok3e2c1c84-1330495676/templates/city-night.svg',
        category: '场景打卡',
        tags: ['城市', '夜景', '现代'],
        creatorId: 'system',
        creatorName: '官方',
        isOfficial: true,
        status: 'active',
        photoSetCount: 76,
        likeCount: 1542,
        sort: 3,
        createTime: new Date(),
        updateTime: new Date()
      }
    ]

    // 批量插入
    const result = await db.collection('templates').add({
      data: testTemplates
    })

    console.log('插入成功:', result)

    return {
      success: true,
      message: '测试数据插入成功',
      insertedCount: testTemplates.length,
      ids: result._id
    }
  } catch (err) {
    console.error('插入失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
