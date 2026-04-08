// 云函数：删除用户创建的模板（管理员操作）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { adminId, templateId } = event

  // 参数验证
  if (!adminId || !templateId) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  try {
    // 验证管理员权限
    const adminRes = await db.collection('admins').doc(adminId).get()
    if (!adminRes.data) {
      return {
        success: false,
        message: '管理员不存在'
      }
    }

    const admin = adminRes.data[0] || adminRes.data
    const allowedRoles = ['super_admin', 'content_admin', 'support_admin']
    if (!allowedRoles.includes(admin.role)) {
      return {
        success: false,
        message: '权限不足'
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

    // 查询模板下的所有照片
    const photosResult = await db.collection('photos')
      .where({ templateId: templateId })
      .get()

    const photos = photosResult.data

    // 删除所有关联照片
    if (photos.length > 0) {
      const deletePromises = photos.map(photo =>
        db.collection('photos').doc(photo._id).remove()
      )
      await Promise.all(deletePromises)
      console.log(`已删除 ${photos.length} 张关联照片`)
    }

    // 删除模板记录
    await db.collection('templates').doc(templateId).remove()

    return {
      success: true,
      message: photos.length > 0
        ? `删除成功，已同时删除 ${photos.length} 张关联照片`
        : '删除成功'
    }
  } catch (error) {
    console.error('删除用户模板失败:', error)
    return {
      success: false,
      message: '删除失败: ' + error.message
    }
  }
}
