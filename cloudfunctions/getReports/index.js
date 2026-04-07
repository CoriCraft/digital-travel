// 云函数：获取举报列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const {
    adminId,
    targetType,  // 'photoset' | 'review_goods' | 'review_location' | 'template' | 'user'
    status = 'pending',  // 'pending' | 'processing' | 'resolved' | 'rejected'
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
    // 验证管理员权限（客服管理员或超级管理员）
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
    if (adminRole !== 'super_admin' && adminRole !== 'support_admin') {
      return {
        success: false,
        message: '权限不足，仅客服管理员和超级管理员可以查看举报'
      }
    }

    // 构建查询条件
    const query = {}

    if (targetType) {
      query.targetType = targetType
    }

    if (status) {
      query.status = status
    }

    // 查询举报总数
    const countResult = await db.collection('reports')
      .where(query)
      .count()

    // 查询举报列表
    const result = await db.collection('reports')
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
    console.error('获取举报列表失败:', error)
    return {
      success: false,
      message: '获取失败，请稍后重试'
    }
  }
}
