// 云函数：更新用户模板排序
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { adminId, templateId, sortOrder } = event

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

    // 更新排序
    await db.collection('templates')
      .doc(templateId)
      .update({
        data: {
          sortOrder: sortOrder,
          updateTime: new Date()
        }
      })

    return {
      success: true,
      message: '排序更新成功'
    }
  } catch (error) {
    console.error('更新用户模板排序失败:', error)
    return {
      success: false,
      message: '更新失败: ' + error.message
    }
  }
}
