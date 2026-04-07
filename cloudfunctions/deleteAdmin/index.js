// 云函数：删除管理员（仅超级管理员可用）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { callerId, adminId } = event

  try {
    // 验证调用者是否为超级管理员
    const callerResult = await db.collection('admins').doc(callerId).get()

    if (!callerResult.data || callerResult.data.role !== 'super_admin') {
      return {
        success: false,
        message: '权限不足'
      }
    }

    // 获取目标管理员信息
    const adminResult = await db.collection('admins').doc(adminId).get()

    if (!adminResult.data) {
      return {
        success: false,
        message: '管理员不存在'
      }
    }

    // 不能删除超级管理员
    if (adminResult.data.role === 'super_admin') {
      return {
        success: false,
        message: '不能删除超级管理���'
      }
    }

    // 删除管理员
    await db.collection('admins').doc(adminId).remove()

    return {
      success: true,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除管理员失败:', error)
    return {
      success: false,
      message: '删除失败',
      error: error.message
    }
  }
}
