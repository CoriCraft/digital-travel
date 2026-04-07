// 云函数：修改个人密码
const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// MD5 加密
function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex')
}

exports.main = async (event, context) => {
  const { adminId, oldPassword, newPassword } = event

  // 参数验证
  if (!adminId || !oldPassword || !newPassword) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  try {
    // 获取管理员信息
    const adminResult = await db.collection('admins').doc(adminId).get()

    if (!adminResult.data) {
      return {
        success: false,
        message: '管理员不存在'
      }
    }

    // 验证旧密码
    const oldPasswordHash = md5(oldPassword)
    if (adminResult.data.password !== oldPasswordHash) {
      return {
        success: false,
        message: '当前密码错误'
      }
    }

    // 更新密码
    const newPasswordHash = md5(newPassword)
    await db.collection('admins').doc(adminId).update({
      data: {
        password: newPasswordHash,
        updateTime: Date.now()
      }
    })

    return {
      success: true,
      message: '密码修改成功'
    }
  } catch (error) {
    console.error('修改密码失败:', error)
    return {
      success: false,
      message: '修改失败',
      error: error.message
    }
  }
}
