// 云函数：创建官方照片
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { adminId, photoName, templateId, photoUrl, thumbnailUrl, sortOrder = 0, status = 'approved' } = event

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
    const allowedRoles = ['super_admin', 'content_admin']
    if (!allowedRoles.includes(admin.role)) {
      return {
        success: false,
        message: '权限不足'
      }
    }

    // 创建照片记录
    const photoData = {
      photoName: photoName,
      photoUrl: photoUrl,
      thumbnailUrl: thumbnailUrl || photoUrl, // 如果没有传thumbnailUrl，使用photoUrl
      templateId: templateId,
      isOfficial: true,
      status: status,
      sortOrder: sortOrder,
      userId: 'admin',
      userName: admin.username || admin.name || '官方',
      userAvatar: '',
      likeCount: 0,
      favoriteCount: 0,
      viewCount: 0,
      contentCheckStatus: 'passed',
      contentCheckMethod: 'manual',
      createTime: new Date(),
      updateTime: new Date()
    }

    const result = await db.collection('photos').add({
      data: photoData
    })

    // 更新模板的照片数量
    const _ = db.command
    await db.collection('templates').doc(templateId).update({
      data: {
        photoSetCount: _.inc(1),
        updateTime: new Date()
      }
    })

    return {
      success: true,
      message: '创建成功',
      photoId: result._id
    }
  } catch (error) {
    console.error('创建官方照片失败:', error)
    return {
      success: false,
      message: '创建失败: ' + error.message
    }
  }
}
