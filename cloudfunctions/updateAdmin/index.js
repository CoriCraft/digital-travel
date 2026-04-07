// 云函数：更新管理员信息（仅超级管理员可用）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { callerId, adminId, username, role } = event

  try {
    // 验证调用者是否为超级管理员
    const callerResult = await db.collection('admins').doc(callerId).get()

    if (!callerResult.data || callerResult.data.role !== 'super_admin') {
      return {
        success: false,
        message: '权限不足'
      }
    }

    // 检查用户名是否已存在（排除当前管理员）
    const existResult = await db.collection('admins')
      .where({
        username,
        _id: db.command.neq(adminId)
      })
      .get()

    if (existResult.data.length > 0) {
      return {
        success: false,
        message: '用户名已存在'
      }
    }

    // 更新管理员信息
    await db.collection('admins').doc(adminId).update({
      data: {
        username,
        role,
        updateTime: Date.now()
      }
    })

    return {
      success: true,
      message: '更新成功'
    }
  } catch (error) {
    console.error('更新管理员失败:', error)
    return {
      success: false,
      message: '更新失败',
      error: error.message
    }
  }
}
