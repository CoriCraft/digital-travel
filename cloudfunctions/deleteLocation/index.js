// 云函数：删除地点
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const {
    adminId,
    locationId
  } = event

  // 参数验证
  if (!adminId || !locationId) {
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
        message: '权限不足，仅内容管理员和超级管理员可以删除地点'
      }
    }

    // 获取地点信息
    const locationResult = await db.collection('locations')
      .doc(locationId)
      .get()

    if (!locationResult.data) {
      return {
        success: false,
        message: '地点不存在'
      }
    }

    // 删除地点
    await db.collection('locations')
      .doc(locationId)
      .remove()

    return {
      success: true,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除地点失败:', error)
    return {
      success: false,
      message: '删除失败，请稍后重试'
    }
  }
}
