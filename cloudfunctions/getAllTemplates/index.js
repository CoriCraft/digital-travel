// 云函数：获取所有模板（用于筛选）
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

    // 查询所有模板，只返回 _id 和 name
    const templatesRes = await db.collection('templates')
      .field({
        _id: true,
        name: true
      })
      .orderBy('name', 'asc')
      .limit(1000)
      .get()

    return {
      success: true,
      data: templatesRes.data
    }
  } catch (error) {
    console.error('获取所有模板失败:', error)
    return {
      success: false,
      message: '获取失败: ' + error.message
    }
  }
}
