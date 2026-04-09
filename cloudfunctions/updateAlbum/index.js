const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { adminId, albumId, title, locationName, description, photos, status } = event

  if (!adminId || !albumId) {
    return { success: false, message: '参数不完整' }
  }

  try {
    const adminRes = await db.collection('admins').doc(adminId).get()
    if (!adminRes.data) {
      return { success: false, message: '权限不足' }
    }
    const { role } = adminRes.data
    if (role !== 'super_admin' && role !== 'content_admin') {
      return { success: false, message: '权限不足' }
    }

    const updateData = {}
    if (title !== undefined) updateData.title = title
    if (locationName !== undefined) updateData.locationName = locationName
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (photos !== undefined) {
      updateData.photos = photos
      updateData.coverPhoto = photos[0] || ''
      updateData.totalCount = photos.length
    }

    await db.collection('albums').doc(albumId).update({ data: updateData })

    return { success: true, message: '更新成功' }
  } catch (error) {
    console.error('更新相册失败:', error)
    return { success: false, message: '更新失败' }
  }
}
