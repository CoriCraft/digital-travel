// 云函数：获取地点列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const {
    adminId,
    type,  // 'scenic' | 'hotel' | 'food' | 'leisure'
    status = 'active',
    keyword,
    page = 1,
    pageSize = 20
  } = event

  // 参数验证
  if (!adminId) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  try {
    // 验证管理员权限（内容管理员或超级管理员）
    const adminResult = await db.collection('admins')
      .doc(adminId)
      .get()

    if (!adminResult.data) {
      return {
        success: false,
        message: '权限不足'
      }
    }

    const adminRole = adminResult.data.role
    if (adminRole !== 'super_admin' && adminRole !== 'content_admin') {
      return {
        success: false,
        message: '权限不足，仅内容管理员和超级管理员可以管理地点'
      }
    }

    // 构建查询条件
    const query = {}

    if (type) {
      query.type = type
    }

    if (status) {
      query.status = status
    }

    // 关键词搜索（名称或地址）
    if (keyword) {
      query.name = db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    }

    // 查询地点总数
    const countResult = await db.collection('locations')
      .where(query)
      .count()

    // 查询地点列表
    const result = await db.collection('locations')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: result.data,
      total: countResult.total,
      page,
      pageSize,
      hasMore: page * pageSize < countResult.total
    }
  } catch (error) {
    console.error('获取地点列表失败:', error)
    return {
      success: false,
      message: '获取失败，请稍后重试'
    }
  }
}
