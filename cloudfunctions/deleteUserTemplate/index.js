// 云函数：删除用户创建的模板
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { templateId } = event
  const wxContext = cloud.getWXContext()
  const currentOpenId = wxContext.OPENID

  // 参数验证
  if (!templateId) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  try {
    // 1. 获取模板信息
    const templateResult = await db.collection('templates')
      .doc(templateId)
      .get()

    if (!templateResult.data) {
      return {
        success: false,
        message: '模板不存在'
      }
    }

    const template = templateResult.data

    // 2. 验证是否是创建者
    if (template.creatorId !== currentOpenId) {
      return {
        success: false,
        message: '只能删除自己创建的模板'
      }
    }

    // 3. 查询模板下的所有照片
    const photosResult = await db.collection('photos')
      .where({
        templateId: templateId,
        status: 'approved'
      })
      .get()

    const photos = photosResult.data

    // 4. 检查是否有其他用户上传的照片
    const hasOtherUserPhotos = photos.some(photo => {
      return photo.uploaderOpenId && photo.uploaderOpenId !== currentOpenId
    })

    if (hasOtherUserPhotos) {
      return {
        success: false,
        message: '该模板中包含其他用户上传的照片，无法删除'
      }
    }

    // 5. 删除所有照片记录
    if (photos.length > 0) {
      const deletePhotoPromises = photos.map(photo => {
        return db.collection('photos').doc(photo._id).remove()
      })
      await Promise.all(deletePhotoPromises)
      console.log(`已删除 ${photos.length} 张照片记录`)
    }

    // 6. 删除模板记录
    await db.collection('templates').doc(templateId).remove()
    console.log('已删除模板记录')

    return {
      success: true,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除模板失败:', error)
    return {
      success: false,
      message: '删除失败，请稍后重试'
    }
  }
}
