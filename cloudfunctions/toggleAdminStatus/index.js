// 云函数：切换管理员状态（仅超级管理员可用）
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

    // 切换状态
    const newStatus = adminResult.data.status === 'active' ? 'disabled' : 'active'

    await db.collection('admins').doc(adminId).update({
      data: {
        status: newStatus,
        updateTime: Date.now()
      }
    })

    return {
      success: true,
      message: `已${newStatus === 'active' ? '启用' : '禁用'}管理员`
    }
  } catch (error) {
    console.error('切换状态失败:', error)
    return {
      success: false,
      message: '操作失败',
      error: error.message
    }
  }
}
