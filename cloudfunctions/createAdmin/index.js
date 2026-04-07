// 云函数：创建管理员账户（仅超级管理员可用）
const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// MD5 加密函数
function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex')
}

// 有效的角色列表
const VALID_ROLES = ['super_admin', 'content_admin', 'support_admin']

exports.main = async (event, context) => {
  const { callerId, username, password, role = 'content_admin', displayName } = event

  // 参数验证
  if (!callerId || !username || !password) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  // 验证角色是否有效
  if (!VALID_ROLES.includes(role)) {
    return {
      success: false,
      message: `无效的角色类型，有效值为: ${VALID_ROLES.join(', ')}`
    }
  }

  try {
    // 验证调用者是否为超级管理员
    const callerResult = await db.collection('admins')
      .doc(callerId)
      .get()

    // doc().get() 返回的是单个文档，data 不是数组
    if (!callerResult.data) {
      return {
        success: false,
        message: '权限不足，仅超级管理员可以创建管理员账户'
      }
    }

    if (callerResult.data.role !== 'super_admin') {
      return {
        success: false,
        message: '权限不足，仅超级管理员可以创建管理员账户'
      }
    }

    // 检查用户名是否已存在
    const existResult = await db.collection('admins')
      .where({
        username: username
      })
      .get()

    if (existResult.data.length > 0) {
      return {
        success: false,
        message: '用户名已存在'
      }
    }

    // 创建新管理员
    const passwordHash = md5(password)
    const now = Date.now()

    const result = await db.collection('admins').add({
      data: {
        username: username,
        password: passwordHash,
        role: role,
        displayName: displayName || username,
        status: 'active',
        createdAt: now,
        createdBy: callerId,
        lastLoginTime: 0
      }
    })

    return {
      success: true,
      message: '管理员账户创建成功',
      data: {
        id: result._id,
        username: username,
        role: role,
        displayName: displayName || username
      }
    }
  } catch (error) {
    console.error('创建管理员失败:', error)
    return {
      success: false,
      message: '创建失败，请稍后重试'
    }
  }
}
