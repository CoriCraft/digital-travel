// 云函数：删除用户照片
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { adminId, photoId } = event

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

    // 获取要删除的照片信息
    const photoRes = await db.collection('photos').doc(photoId).get()
    if (!photoRes.data) {
      return {
        success: false,
        message: '照片不存在'
      }
    }

    const photo = photoRes.data
    const templateId = photo.templateId
    const photoUrl = photo.photoUrl

    // 获取模板信息
    const templateRes = await db.collection('templates').doc(templateId).get()
    if (!templateRes.data) {
      // 模板不存在，直接删除照片
      await db.collection('photos').doc(photoId).remove()
      return {
        success: true,
        message: '删除成功'
      }
    }

    const template = templateRes.data

    // 检查该模板下还有多少张照片
    const photosCountRes = await db.collection('photos')
      .where({
        templateId: templateId,
        isOfficial: photo.isOfficial
      })
      .count()

    const totalPhotos = photosCountRes.total

    // 如果只有这一张照片，删除模板和照片
    if (totalPhotos === 1) {
      await db.collection('photos').doc(photoId).remove()
      await db.collection('templates').doc(templateId).remove()
      return {
        success: true,
        message: '该照片是模板唯一照片，已连带删除模板'
      }
    }

    // 如果删除的照片是模板封面，需要替换封面
    if (template.cover === photoUrl) {
      // 查找下一张照片（按sortOrder排序）
      const nextPhotoRes = await db.collection('photos')
        .where({
          templateId: templateId,
          isOfficial: photo.isOfficial,
          _id: db.command.neq(photoId)
        })
        .orderBy('sortOrder', 'asc')
        .orderBy('createTime', 'asc')
        .limit(1)
        .get()

      if (nextPhotoRes.data && nextPhotoRes.data.length > 0) {
        const nextPhoto = nextPhotoRes.data[0]
        // 更新模板封面为下一张照片
        await db.collection('templates').doc(templateId).update({
          data: {
            cover: nextPhoto.photoUrl,
            updateTime: new Date()
          }
        })
      }
    }

    // 删除照片
    await db.collection('photos').doc(photoId).remove()

    // 更新模板的照片数量（如果模板还存在）
    if (totalPhotos > 1) {
      const _ = db.command
      await db.collection('templates').doc(templateId).update({
        data: {
          photoSetCount: _.inc(-1),
          updateTime: new Date()
        }
      })
    }

    return {
      success: true,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除用户照片失败:', error)
    return {
      success: false,
      message: '删除失败: ' + error.message
    }
  }
}
