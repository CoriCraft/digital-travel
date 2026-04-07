// 云函数：获取用户内容统计
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { adminId } = event

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
    const allowedRoles = ['super_admin', 'content_admin', 'support_admin']
    if (!allowedRoles.includes(admin.role)) {
      return {
        success: false,
        message: '权限不足'
      }
    }

    // 统计用户模板总数
    const totalTemplatesRes = await db.collection('templates')
      .where({
        isOfficial: false
      })
      .count()

    // 统计待审核模板数
    const pendingTemplatesRes = await db.collection('templates')
      .where({
        isOfficial: false,
        status: 'pending'
      })
      .count()

    // 统计用户照片总数（非官方照片）
    const totalPhotosRes = await db.collection('photos')
      .where({
        isOfficial: false
      })
      .count()

    // 统计待审核照片数
    const pendingPhotosRes = await db.collection('photos')
      .where({
        isOfficial: false,
        status: 'pending'
      })
      .count()

    return {
      success: true,
      data: {
        totalTemplates: totalTemplatesRes.total,
        totalPhotos: totalPhotosRes.total,
        pendingTemplates: pendingTemplatesRes.total,
        pendingPhotos: pendingPhotosRes.total
      }
    }
  } catch (error) {
    console.error('获取用户内容统计失败:', error)
    return {
      success: false,
      message: '获取失败: ' + error.message
    }
  }
}
