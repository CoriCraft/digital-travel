// 云函数：删除官方模板
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const {
    adminId,
    templateId
  } = event

  // 参数验证
  if (!adminId || !templateId) {
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
        message: '权限不足，仅内容管理员和超级管理员可以删除官方模板'
      }
    }

    // 获取模板信息
    const templateResult = await db.collection('templates')
      .doc(templateId)
      .get()

    if (!templateResult.data) {
      return {
        success: false,
        message: '模板不存在'
      }
    }

    if (!templateResult.data.isOfficial) {
      return {
        success: false,
        message: '只能删除官方模板'
      }
    }

    // 检查是否有关联的照片集
    const photoSetCount = await db.collection('photosets')
      .where({
        templateId: templateId
      })
      .count()

    if (photoSetCount.total > 0) {
      return {
        success: false,
        message: `该模板下有 ${photoSetCount.total} 个照片集，无法删除`
      }
    }

    // 删除模板
    await db.collection('templates')
      .doc(templateId)
      .remove()

    return {
      success: true,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除官方模板失败:', error)
    return {
      success: false,
      message: '删除失败，请稍后重试'
    }
  }
}
