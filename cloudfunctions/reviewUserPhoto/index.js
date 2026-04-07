// 云函数：审核用户照片
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { adminId, photoId, action, reason } = event

  try {
    // 验证管理员权限
    const adminRes = await db.collection('admins').doc(adminId).get()
    if (!adminRes.data || adminRes.data.length === 0) {
      return {
        success: false,
        message: '管理员不存在'
      }
    }

    const admin = adminRes.data[0] || adminRes.data
    const allowedRoles = ['super_admin', 'content_admin', 'support_admin']
    if (!allowedRoles.includes(admin.role)) {
      return {
        success: false,
        message: '权限不足'
      }
    }

    // 验证参数
    if (!['approve', 'reject'].includes(action)) {
      return {
        success: false,
        message: '无效的操作类型'
      }
    }

    if (action === 'reject' && !reason) {
      return {
        success: false,
        message: '拒绝时必须填写原因'
      }
    }

    // 获取照片信息
    const photoRes = await db.collection('photos').doc(photoId).get()
    if (!photoRes.data) {
      return {
        success: false,
        message: '照片不存在'
      }
    }

    const photo = photoRes.data
    const oldStatus = photo.status

    // 更新照片状态
    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewerId: adminId,
      reviewerName: admin.username || admin.name,
      reviewTime: new Date()
    }

    if (action === 'reject') {
      updateData.rejectReason = reason
    }

    await db.collection('photos')
      .doc(photoId)
      .update({
        data: updateData
      })

    // 更新模板的照片数量
    // 如果从pending变为approved，增加数量
    // 如果从approved变为rejected，减少数量
    if (photo.templateId) {
      const _ = db.command
      if (action === 'approve' && oldStatus !== 'approved') {
        await db.collection('templates').doc(photo.templateId).update({
          data: {
            photoSetCount: _.inc(1),
            updateTime: new Date()
          }
        })
      } else if (action === 'reject' && oldStatus === 'approved') {
        await db.collection('templates').doc(photo.templateId).update({
          data: {
            photoSetCount: _.inc(-1),
            updateTime: new Date()
          }
        })
      }
    }

    return {
      success: true,
      message: action === 'approve' ? '审核通过' : '已拒绝'
    }
  } catch (error) {
    console.error('审核用户照片失败:', error)
    return {
      success: false,
      message: '审核失败: ' + error.message
    }
  }
}
