// 云函数：标记消息为已读
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { messageId, markAll = false } = event

  // 获取用户 openid
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  try {
    if (markAll) {
      // 标记所有未读消息为已读
      const result = await db.collection('messages')
        .where({
          userId: userId,
          status: 'unread'
        })
        .update({
          data: {
            status: 'read',
            readAt: new Date()
          }
        })

      return {
        success: true,
        updated: result.stats.updated,
        message: '已标记所有消息为已读'
      }
    } else {
      // 标记单条消息为已读
      if (!messageId) {
        return {
          success: false,
          errMsg: '缺少消息ID'
        }
      }

      const result = await db.collection('messages')
        .where({
          _id: messageId,
          userId: userId
        })
        .update({
          data: {
            status: 'read',
            readAt: new Date()
          }
        })

      return {
        success: true,
        updated: result.stats.updated,
        message: '消息已标记为已读'
      }
    }
  } catch (err) {
    console.error('标记消息已读失败:', err)
    return {
      success: false,
      errMsg: '标记消息已读失败: ' + err.message
    }
  }
}
