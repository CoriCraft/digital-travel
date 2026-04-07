// 云函数：获取管理员列表（仅超级管理员可用）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { adminId } = event

  try {
    // 验证调用者是否为超级管理员
    const callerResult = await db.collection('admins').doc(adminId).get()

    if (!callerResult.data || callerResult.data.role !== 'super_admin') {
      return {
        success: false,
        message: '权限不足，只有超级管理员可以查看管理员列表'
      }
    }

    // 获取所有管理员
    const result = await db.collection('admins')
      .orderBy('createdAt', 'desc')
      .get()

    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    console.error('获取管理员列表失败:', error)
    return {
      success: false,
      message: '获取管理员列表失败',
      error: error.message
    }
  }
}
