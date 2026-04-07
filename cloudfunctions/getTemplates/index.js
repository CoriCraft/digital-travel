// 云函数：获取待审核模板列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { adminId } = event

  // 验证管理员权限
  try {
    const adminResult = await db.collection('admins')
      .doc(adminId)
      .get()

    if (!adminResult.data || adminResult.data.status !== 'active') {
      return {
        success: false,
        message: '权限不足'
      }
    }
  } catch (error) {
    return {
      success: false,
      message: '验证失败'
    }
  }

  // 获取待审核模板
  try {
    const result = await db.collection('templates')
      .where({
        status: 'pending'
      })
      .orderBy('createTime', 'desc')
      .get()

    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    console.error('获取模板失败:', error)
    return {
      success: false,
      message: '获取模板失败',
      error: error.message
    }
  }
}
