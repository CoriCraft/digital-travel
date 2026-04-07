// 云函数：获取商品列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const {
    adminId,
    category,
    status = 'active',
    keyword,
    page = 1,
    pageSize = 20
  } = event

  if (!adminId) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  try {
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
        message: '权限不足，仅内容管理员和超级管理员可以管理商品'
      }
    }

    const query = {}
    if (category) query.category = category
    if (status) query.status = status
    if (keyword) {
      query.name = db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    }

    const countResult = await db.collection('goods')
      .where(query)
      .count()

    const result = await db.collection('goods')
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
      pageSize
    }
  } catch (error) {
    console.error('获取商品列表失败:', error)
    return {
      success: false,
      message: '获取失败，请稍后重试'
    }
  }
}
