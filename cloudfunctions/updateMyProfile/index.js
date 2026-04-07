// 云函数：更新个人信息（用户名）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { adminId, username } = event

  // 参数验证
  if (!adminId || !username) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  try {
    // 验证管理员是否存在
    const adminResult = await db.collection('admins').doc(adminId).get()

    if (!adminResult.data) {
      return {
        success: false,
        message: '管理员不存在'
      }
    }

    // 检查用户名是否已被其他人使用
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

    // 更新用户名
    await db.collection('admins').doc(adminId).update({
      data: {
        username,
        updateTime: Date.now()
      }
    })

    return {
      success: true,
      message: '用户名更新成功'
    }
  } catch (error) {
    console.error('更新用户名失败:', error)
    return {
      success: false,
      message: '更新失败',
      error: error.message
    }
  }
}
