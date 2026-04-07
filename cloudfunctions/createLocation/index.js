// 云函数：创建地点
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const {
    adminId,
    name,
    description,
    type,  // 'scenic' | 'hotel' | 'food' | 'leisure'
    category,
    address,
    latitude,
    longitude,
    coverImage,
    images = [],
    tags = [],
    openTime,
    phone,
    sortOrder = 0,
    isFeatured = false,
    featuredOrder = 999
  } = event

  // 参数验证
  if (!adminId || !name || !description || !type || !address || !coverImage) {
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
        message: '权限不足，仅内容管理员和超级管理员可以创建地点'
      }
    }

    // 创建地点
    const locationData = {
      name,
      description,
      type,
      category: category || '',
      address,
      coverImage,
      images,
      tags,
      openTime: openTime || '',
      phone: phone || '',
      sortOrder,
      isFeatured,
      featuredOrder,
      isHot: false,
      status: 'active',
      creatorId: 'admin',
      rating: 0,
      ratingCount: 0,
      checkInCount: 0,
      viewCount: 0,
      favoriteCount: 0,
      relatedTemplates: [],
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    // 如果提供了经纬度，添加地理位置信息
    if (latitude !== undefined && longitude !== undefined) {
      locationData.latitude = latitude
      locationData.longitude = longitude
      locationData.location = db.Geo.Point(longitude, latitude)
    }

    const result = await db.collection('locations').add({
      data: locationData
    })

    return {
      success: true,
      message: '创建成功',
      data: {
        _id: result._id
      }
    }
  } catch (error) {
    console.error('创建地点失败:', error)
    return {
      success: false,
      message: '创建失败，请稍后重试'
    }
  }
}
