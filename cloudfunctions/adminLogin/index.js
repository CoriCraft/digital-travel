// 云函数：管理员登录验证
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

exports.main = async (event, context) => {
  const { username, password } = event

  // 参数验证
  if (!username || !password) {
    return {
      success: false,
      message: '用户名和密码不能为空'
    }
  }

  try {
    // 查询管理员账户
    const result = await db.collection('admins')
      .where({
        username: username
      })
      .get()

    // 检查账户是否存在
    if (result.data.length === 0) {
      return {
        success: false,
        message: '用户名或密码错误'
      }
    }

    const admin = result.data[0]

    // 检查账户状态
    if (admin.status !== 'active') {
      return {
        success: false,
        message: '账户已被禁用'
      }
    }

    // 验证密码
    const passwordHash = md5(password)
    if (admin.password !== passwordHash) {
      return {
        success: false,
        message: '用户名或密码错误'
      }
    }

    // 更新最后登录时间
    await db.collection('admins').doc(admin._id).update({
      data: {
        lastLoginTime: Date.now()
      }
    })

    // 登录成功，返回管理员信息（不包含密码）
    return {
      success: true,
      message: '登录成功',
      data: {
        id: admin._id,
        username: admin.username,
        role: admin.role,
        createdAt: admin.createdAt
      }
    }
  } catch (error) {
    console.error('登录失败:', error)
    return {
      success: false,
      message: '登录失败，请稍后重试'
    }
  }
}
