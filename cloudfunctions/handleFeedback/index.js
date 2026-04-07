// 云函数：处理意见反馈
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const {
    adminId,
    feedbackId,
    status,  // 'processing' | 'resolved' | 'closed'
    reply,
    priority  // 'low' | 'medium' | 'high'
  } = event

  // 参数验证
  if (!adminId || !feedbackId || !status) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  try {
    // 验证管理员权限
    const adminResult = await db.collection('admins')
      .doc(adminId)
      .get()

    if (!adminResult.data) {
      return {
        success: false,
        message: '权限不足'
      }
    }

    const admin = adminResult.data
    if (admin.role !== 'super_admin' && admin.role !== 'support_admin') {
      return {
        success: false,
        message: '权限不足，仅客服管理员和超级管理员可以处理反馈'
      }
    }

    // 获取反馈信息
    const feedbackResult = await db.collection('feedbacks')
      .doc(feedbackId)
      .get()

    if (!feedbackResult.data) {
      return {
        success: false,
        message: '反馈记录不存在'
      }
    }

    const feedback = feedbackResult.data

    // 更新反馈状态
    const updateData = {
      status: status,
      handlerId: adminId,
      handlerName: admin.displayName || admin.username,
      handleTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    if (reply) {
      updateData.reply = reply
    }

    if (priority) {
      updateData.priority = priority
    }

    await db.collection('feedbacks')
      .doc(feedbackId)
      .update({
        data: updateData
      })

    // 如果有回复内容，发送通知给反馈用户
    if (reply && feedback.userId) {
      try {
        await cloud.callFunction({
          name: 'sendNotification',
          data: {
            userId: feedback.userId,
            type: 'feedback_replied',
            title: '反馈已回复',
            content: `管理员已回复您的反馈：${reply}`,
            relatedId: feedbackId,
            relatedType: 'feedback'
          }
        })
      } catch (notifyError) {
        console.error('发送通知失败:', notifyError)
        // 不影响主流程，继续执行
      }
    }

    return {
      success: true,
      message: '反馈处理成功'
    }
  } catch (error) {
    console.error('处理反馈失败:', error)
    return {
      success: false,
      message: '处理失败，请稍后重试'
    }
  }
}
