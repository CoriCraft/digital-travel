// 云函数：发送通知给用户
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { userId, type, title, content, relatedId, relatedType } = event

  // 参数验证
  if (!userId || !type || !title || !content) {
    return {
      success: false,
      errMsg: '缺少必要参数'
    }
  }

  // 验证消息类型
  const validTypes = ['warning', 'report_handled', 'feedback_replied', 'system']
  if (!validTypes.includes(type)) {
    return {
      success: false,
      errMsg: '无效的消息类型'
    }
  }

  try {
    // 插入消息记录
    const result = await db.collection('messages').add({
      data: {
        userId: userId,
        type: type,
        title: title,
        content: content,
        relatedId: relatedId || null,
        relatedType: relatedType || null,
        status: 'unread',
        createdAt: new Date(),
        readAt: null
      }
    })

    console.log('消息发送成功:', result._id)

    return {
      success: true,
      messageId: result._id,
      message: '消息发送成功'
    }
  } catch (err) {
    console.error('发送消息失败:', err)
    return {
      success: false,
      errMsg: '发送消息失败: ' + err.message
    }
  }
}
