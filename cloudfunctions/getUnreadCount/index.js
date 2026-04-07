// 云函数：获取未读消息数量
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  // 获取用户 openid
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  try {
    // 查询未读消息数量
    const result = await db.collection('messages')
      .where({
        userId: userId,
        status: 'unread'
      })
      .count()

    return {
      success: true,
      count: result.total
    }
  } catch (err) {
    console.error('获取未读消息数量失败:', err)
    return {
      success: false,
      errMsg: '获取未读消息数量失败: ' + err.message,
      count: 0
    }
  }
}
