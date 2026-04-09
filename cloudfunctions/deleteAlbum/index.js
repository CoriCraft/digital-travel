const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { adminId, albumId } = event

  if (!adminId || !albumId) {
    return { success: false, message: '参数不完整' }
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

    await db.collection('albums').doc(albumId).remove()

    return { success: true, message: '删除成功' }
  } catch (error) {
    console.error('删除相册失败:', error)
    return { success: false, message: '删除失败' }
  }
}
