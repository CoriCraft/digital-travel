// 云函数：更新官方照片
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { adminId, photoId, photoName, templateId, sortOrder, status } = event

  try {
    // 验证管理员权限
    const adminRes = await db.collection('admins').doc(adminId).get()
    if (!adminRes.data || adminRes.data.length === 0) {
      return {
        success: false,
        message: '管理员不存在'
      }
    }

    const admin = adminRes.data[0] || adminRes.data
    const allowedRoles = ['super_admin', 'content_admin']
    if (!allowedRoles.includes(admin.role)) {
      return {
        success: false,
        message: '权限不足'
      }
    }

    // 更新照片
    const updateData: any = {
      updateTime: new Date()
    }

    if (photoName !== undefined) updateData.photoName = photoName
    if (templateId !== undefined) updateData.templateId = templateId
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (status !== undefined) updateData.status = status

    await db.collection('photos')
      .doc(photoId)
      .update({
        data: updateData
      })

    return {
      success: true,
      message: '更新成功'
    }
  } catch (error) {
    console.error('更新官方照片失败:', error)
    return {
      success: false,
      message: '更新失败: ' + error.message
    }
  }
}
