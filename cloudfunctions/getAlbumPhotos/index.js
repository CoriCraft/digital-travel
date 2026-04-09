// 云函数：根据相册ID获取电子相册照片
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { albumId, shortCode } = event

  // 参数验证
  if (!albumId && !shortCode) {
    return {
      code: 400,
      message: '缺少相册ID或短码参数'
    }
  }

  try {
    // 查询相册数据（支持 albumId 或 shortCode）
    const whereCondition = shortCode
      ? { shortCode: shortCode, status: 'active' }
      : { albumId: albumId, status: 'active' }

    const result = await db.collection('albums')
      .where(whereCondition)
      .get()

    if (result.data.length === 0) {
      return {
        code: 404,
        message: '未找到该相册'
      }
    }

    const album = result.data[0]

    return {
      code: 0,
      message: '获取成功',
      data: {
        albumId: album.albumId,
        photos: album.photos || [],
        totalCount: album.photos?.length || 0,
        createTime: album.createTime,
        locationName: album.locationName || '',
        photoTime: album.photoTime || album.createTime
      }
    }
  } catch (error) {
    console.error('查询相册失败:', error)
    return {
      code: 500,
      message: '服务器错误',
      error: error.message
    }
  }
}
