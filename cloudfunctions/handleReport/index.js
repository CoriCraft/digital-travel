// 云函数：处理举报
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const {
    adminId,
    reportId,
    action,  // 'delete' | 'hide' | 'disable' | 'warning' | 'reject'
    result: handleResult,
    targetType
  } = event

  // 参数验证
  if (!adminId || !reportId || !action || !handleResult) {
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
        message: '权限不足，仅客服管理员和超级管理员可以处理举报'
      }
    }

    // 获取举报信息
    const reportResult = await db.collection('reports')
      .doc(reportId)
      .get()

    if (!reportResult.data) {
      return {
        success: false,
        message: '举报记录不存在'
      }
    }

    const report = reportResult.data

    // 处理驳回举报
    if (action === 'reject') {
      await db.collection('reports')
        .doc(reportId)
        .update({
          data: {
            status: 'rejected',
            handlerId: adminId,
            handlerName: admin.displayName || admin.username,
            handleResult: handleResult,
            handleTime: db.serverDate()
          }
        })

      return {
        success: true,
        message: '举报已驳回'
      }
    }

    // 处理接受举报
    const { targetType: reportTargetType, targetId } = report
    const actualTargetType = targetType || reportTargetType

    // 根据不同的处理方式和内容类型执行相应操作
    let actionMessage = ''

    switch (action) {
      case 'delete':
        // 删除内容
        if (actualTargetType === 'photoset') {
          await db.collection('photoSets').doc(targetId).remove()
          actionMessage = '照片集已删除'
        } else if (actualTargetType === 'review_goods') {
          await db.collection('goods_reviews').doc(targetId).remove()
          actionMessage = '评论已删除'
        } else if (actualTargetType === 'review_location') {
          await db.collection('location_reviews').doc(targetId).remove()
          actionMessage = '评论已删除'
        } else if (actualTargetType === 'template') {
          await db.collection('templates').doc(targetId).remove()
          actionMessage = '模板已删除'
        }
        break

      case 'hide':
        // 隐藏内容（设置为不可见但保留数据）
        if (actualTargetType === 'photoset') {
          await db.collection('photoSets').doc(targetId).update({
            data: {
              status: 'hidden',
              hideReason: handleResult,
              hideTime: db.serverDate()
            }
          })
          actionMessage = '照片集已隐藏'
        } else if (actualTargetType === 'review_goods') {
          await db.collection('goods_reviews').doc(targetId).update({
            data: {
              status: 'hidden',
              hideReason: handleResult
            }
          })
          actionMessage = '评论已隐藏'
        } else if (actualTargetType === 'review_location') {
          await db.collection('location_reviews').doc(targetId).update({
            data: {
              status: 'hidden',
              hideReason: handleResult
            }
          })
          actionMessage = '评论已隐藏'
        }
        break

      case 'disable':
        // 禁用模板
        if (actualTargetType === 'template') {
          await db.collection('templates').doc(targetId).update({
            data: {
              status: 'inactive',
              disableReason: handleResult,
              disableTime: db.serverDate()
            }
          })
          actionMessage = '模板已禁用'
        }
        break

      case 'warning':
        // 警告用户（记录警告信息，不删除内容）
        actionMessage = '已向用户发送警告'

        // 获取被举报内容的创建者ID
        let contentCreatorId = null
        if (actualTargetType === 'photoset') {
          const photosetResult = await db.collection('photoSets').doc(targetId).get()
          contentCreatorId = photosetResult.data?.userId
        } else if (actualTargetType === 'review_goods') {
          const reviewResult = await db.collection('goods_reviews').doc(targetId).get()
          contentCreatorId = reviewResult.data?.userId
        } else if (actualTargetType === 'review_location') {
          const reviewResult = await db.collection('location_reviews').doc(targetId).get()
          contentCreatorId = reviewResult.data?.userId
        } else if (actualTargetType === 'template') {
          const templateResult = await db.collection('templates').doc(targetId).get()
          contentCreatorId = templateResult.data?.creatorId
        }

        // 发送警告通知给内容创建者
        if (contentCreatorId) {
          await cloud.callFunction({
            name: 'sendNotification',
            data: {
              userId: contentCreatorId,
              type: 'warning',
              title: '内容违规警告',
              content: `您的内容因违规被举报，管理员处理意见：${handleResult}`,
              relatedId: reportId,
              relatedType: 'report'
            }
          })
        }
        break

      default:
        return {
          success: false,
          message: '无效的处理方式'
        }
    }

    // 更新举报状态
    await db.collection('reports')
      .doc(reportId)
      .update({
        data: {
          status: 'resolved',
          handlerId: adminId,
          handlerName: admin.displayName || admin.username,
          handleResult: handleResult,
          handleAction: action,
          handleTime: db.serverDate()
        }
      })

    // 发送通知给举报人
    if (report.reporterOpenId) {
      await cloud.callFunction({
        name: 'sendNotification',
        data: {
          userId: report.reporterOpenId,
          type: 'report_handled',
          title: '举报处理结果',
          content: `您举报的内容已处理完成。处理结果：${handleResult}`,
          relatedId: reportId,
          relatedType: 'report'
        }
      })
    }

    return {
      success: true,
      message: `举报已处理：${actionMessage}`
    }
  } catch (error) {
    console.error('处理举报失败:', error)
    return {
      success: false,
      message: '处理失败，请稍后重试'
    }
  }
}
