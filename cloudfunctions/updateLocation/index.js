// 云函数：更新地点
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const {
    adminId,
    locationId,
    name,
    description,
    type,
    category,
    address,
    latitude,
    longitude,
    coverImage,
    images,
    tags,
    openTime,
    phone,
    sortOrder,
    isFeatured,
    featuredOrder,
    status
  } = event

  // 参数验证
  if (!adminId || !locationId) {
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
        message: '权限不足，仅内容管理员和超级管理员可以更新地点'
      }
    }

    // 获取地点信息
    const locationResult = await db.collection('locations')
      .doc(locationId)
      .get()

    if (!locationResult.data) {
      return {
        success: false,
        message: '地点不存在'
      }
    }

    // 构建更新数据
    const updateData = {
      updateTime: db.serverDate()
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (type !== undefined) updateData.type = type
    if (category !== undefined) updateData.category = category
    if (address !== undefined) updateData.address = address
    if (coverImage !== undefined) updateData.coverImage = coverImage
    if (images !== undefined) updateData.images = images
    if (tags !== undefined) updateData.tags = tags
    if (openTime !== undefined) updateData.openTime = openTime
    if (phone !== undefined) updateData.phone = phone
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured
    if (featuredOrder !== undefined) updateData.featuredOrder = featuredOrder
    if (status !== undefined) updateData.status = status

    // 如果更新了经纬度，更新地理位置信息
    if (latitude !== undefined && longitude !== undefined) {
      updateData.latitude = latitude
      updateData.longitude = longitude
      updateData.location = db.Geo.Point(longitude, latitude)
    }

    // 更新地点
    await db.collection('locations')
      .doc(locationId)
      .update({
        data: updateData
      })

    return {
      success: true,
      message: '更新成功'
    }
  } catch (error) {
    console.error('更新地点失败:', error)
    return {
      success: false,
      message: '更新失败，请稍后重试'
    }
  }
}
