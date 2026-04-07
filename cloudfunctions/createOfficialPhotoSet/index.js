// 云函数：创建官方照片集
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const {
    adminId,
    title,
    description,
    templateId,
    coverPhoto,
    photos = []
  } = event

  // 参数验证
  if (!adminId || !title || !description || !templateId || !coverPhoto || photos.length === 0) {
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
    if (admin.role !== 'super_admin' && admin.role !== 'content_admin') {
      return {
        success: false,
        message: '权限不足，仅内容管理员和超级管理员可以创建官方照片集'
      }
    }

    // 验证模板是否存在
    const templateResult = await db.collection('templates')
      .doc(templateId)
      .get()

    if (!templateResult.data) {
      return {
        success: false,
        message: '模板不存在'
      }
    }

    // 创建照片集
    const result = await db.collection('photoSets').add({
      data: {
        title,
        description,
        templateId,
        coverPhoto,
        photos,
        isOfficial: true,
        userId: 'admin',
        userName: '官方',
        userAvatar: '',
        status: 'approved',
        likeCount: 0,
        favoriteCount: 0,
        commentCount: 0,
        viewCount: 0,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })

    // 更新模板的照片集数量
    await db.collection('templates')
      .doc(templateId)
      .update({
        data: {
          photoSetCount: db.command.inc(1),
          updateTime: db.serverDate()
        }
      })

    return {
      success: true,
      message: '创建成功',
      data: {
        _id: result._id
      }
    }
  } catch (error) {
    console.error('创建官方照片集失败:', error)
    return {
      success: false,
      message: '创建失败，请稍后重试'
    }
  }
}
