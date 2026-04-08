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

    // 检查是否有关联的照片
    const photoCount = await db.collection('photos')
      .where({
        templateId: templateId,
        isOfficial: true
      })
      .count()

    // 如果有照片，先删除所有关联照片
    if (photoCount.total > 0) {
      const photosResult = await db.collection('photos')
        .where({
          templateId: templateId,
          isOfficial: true
        })
        .get()

      // 批量删除照片
      const deletePromises = photosResult.data.map(photo =>
        db.collection('photos').doc(photo._id).remove()
      )
      await Promise.all(deletePromises)
    }

    // 删除模板
    await db.collection('templates')
      .doc(templateId)
      .remove()

    return {
      success: true,
      message: photoCount.total > 0
        ? `删除成功，已同时删除 ${photoCount.total} 张关联照片`
        : '删除成功'
    }
  } catch (error) {
    console.error('删除官方模板失败:', error)
    return {
      success: false,
      message: '删除失败，请稍后重试'
    }
  }
}
