// 云函数：获取用户的消息列表
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { page = 1, pageSize = 20, status, type } = event

  // 获取用户 openid
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  try {
    // 构建查询条件
    const where = { userId: userId }

    if (status) {
      where.status = status
    }

    if (type) {
      where.type = type
    }

    // 查询总数
    const countResult = await db.collection('messages')
      .where(where)
      .count()

    const total = countResult.total

    // 查询消息列表
    const result = await db.collection('messages')
      .where(where)
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: result.data,
      total: total,
      page: page,
      pageSize: pageSize,
      hasMore: page * pageSize < total
    }
  } catch (err) {
    console.error('获取消息列表失败:', err)
    return {
      success: false,
      errMsg: '获取消息列表失败: ' + err.message
    }
  }
}
