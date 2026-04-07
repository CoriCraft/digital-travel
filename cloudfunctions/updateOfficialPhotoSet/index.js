// 云函数：更新官方照片集
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const {
    adminId,
    photoSetId,
    title,
    description,
    templateId,
    coverPhoto,
    photos,
    status
  } = event

  // 参数验证
  if (!adminId || !photoSetId) {
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
        message: '权限不足，仅内容管理员和超级管理员可以更新官方照片集'
      }
    }

    // 获取照片集信息
    const photoSetResult = await db.collection('photoSets')
      .doc(photoSetId)
      .get()

    if (!photoSetResult.data) {
      return {
        success: false,
        message: '照片集不存在'
      }
    }

    if (!photoSetResult.data.isOfficial) {
      return {
        success: false,
        message: '只能更新官方照片集'
      }
    }

    const oldTemplateId = photoSetResult.data.templateId

    // 如果修改了模板��验证新模板是否存在
    if (templateId && templateId !== oldTemplateId) {
      const templateResult = await db.collection('templates')
        .doc(templateId)
        .get()

      if (!templateResult.data) {
        return {
          success: false,
          message: '新模板不存在'
        }
      }
    }

    // 构建更新数据
    const updateData = {
      updateTime: db.serverDate()
    }

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (coverPhoto !== undefined) updateData.coverPhoto = coverPhoto
    if (photos !== undefined) updateData.photos = photos
    if (status !== undefined) updateData.status = status

    if (templateId !== undefined && templateId !== oldTemplateId) {
      updateData.templateId = templateId

      // 更新旧模板的照片集数量
      await db.collection('templates')
        .doc(oldTemplateId)
        .update({
          data: {
            photoSetCount: db.command.inc(-1),
            updateTime: db.serverDate()
          }
        })

      // 更新新模板的照片集数量
      await db.collection('templates')
        .doc(templateId)
        .update({
          data: {
            photoSetCount: db.command.inc(1),
            updateTime: db.serverDate()
          }
        })
    }

    // 更新照片集
    await db.collection('photoSets')
      .doc(photoSetId)
      .update({
        data: updateData
      })

    return {
      success: true,
      message: '更新成功'
    }
  } catch (error) {
    console.error('更新官方照片集失败:', error)
    return {
      success: false,
      message: '更新失败，请稍后重试'
    }
  }
}
