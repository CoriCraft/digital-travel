const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { adminId } = event

  if (!adminId) {
    return { success: false, message: '缺少 adminId' }
  }

  try {
    const adminRes = await db.collection('admins').doc(adminId).get()
    if (!adminRes.data) {
      return { success: false, message: '权限不足' }
    }
    const { role } = adminRes.data
    if (role !== 'super_admin' && role !== 'content_admin') {
      return { success: false, message: '权限不足' }
    }

    const res = await db.collection('albums')
      .orderBy('createTime', 'desc')
      .limit(100)
      .get()

    return { success: true, data: res.data }
  } catch (error) {
    console.error('获取相册列表失败:', error)
    return { success: false, message: '获取失败' }
  }
}
