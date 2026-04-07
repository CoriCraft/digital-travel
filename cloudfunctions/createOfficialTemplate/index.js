// 云函数：创建官方模板
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const {
    adminId,
    name,
    description,
    category,
    cover,
    tags = [],
    allowUserUpload = true,
    sortOrder = 0
  } = event

  // 参数验证
  if (!adminId || !name || !description || !category || !cover) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  try {
    // 验证管理员权限
    const adminResult = await db.collection('admins')
      .doc(adminId)
      .get()

    if (!adminResult.data) {
      return {
        success: false,
        message: '权限不足'
      }
    }

    const admin = adminResult.data
    if (admin.role !== 'super_admin' && admin.role !== 'content_admin') {
      return {
        success: false,
        message: '权限不足，仅内容管理员和超级管理员可以创建官方模板'
      }
    }

    // 检查模板名称是否已存在
    const existResult = await db.collection('templates')
      .where({
        name: name,
        isOfficial: true
      })
      .count()

    if (existResult.total > 0) {
      return {
        success: false,
        message: '该模板名称已存在'
      }
    }

    // 创建模板
    const result = await db.collection('templates').add({
      data: {
        name,
        description,
        category,
        cover,
        tags,
        isOfficial: true,
        creatorId: 'system',
        creatorName: '官方',
        status: 'active',
        sortOrder,
        allowUserUpload,
        likeCount: 0,
        favoriteCount: 0,
        photoSetCount: 0,
        viewCount: 0,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })

    return {
      success: true,
      message: '创建成功',
      data: {
        _id: result._id
      }
    }
  } catch (error) {
    console.error('创建官方模板失败:', error)
    return {
      success: false,
      message: '创建失败，请稍后重试'
    }
  }
}
