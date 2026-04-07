// 云函数：保存电子相册到用户相册
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { orderId } = event
  const wxContext = cloud.getWXContext()

  if (!orderId) {
    return { success: false, message: '缺少订单号参数' }
  }

  try {
    // 1. 查询原始相册数据
    const albumRes = await db.collection('albums')
      .where({ orderId, status: 'active' })
      .get()

    if (albumRes.data.length === 0) {
      return { success: false, message: '未找到该订单的相册' }
    }

    const sourceAlbum = albumRes.data[0]
    const sourcePhotos = sourceAlbum.photos || []

    if (sourcePhotos.length === 0) {
      return { success: false, message: '相册中没有照片' }
    }

    // 2. 下载并上传照片到云存储
    const uploadedPhotos = []
    for (let i = 0; i < sourcePhotos.length; i++) {
      const photo = sourcePhotos[i]
      const photoUrl = photo.url || photo

      try {
        // 下载照片
        const downloadRes = await cloud.downloadFile({
          fileID: photoUrl
        })

        // 上传到用户的云存储路径
        const uploadRes = await cloud.uploadFile({
          cloudPath: `user_albums/${wxContext.OPENID}/${orderId}/${Date.now()}_${i}.jpg`,
          fileContent: downloadRes.fileContent
        })

        uploadedPhotos.push({
          fileID: uploadRes.fileID,
          originalUrl: photoUrl,
          uploadTime: new Date()
        })
      } catch (err) {
        console.error(`照片 ${i} 处理失败:`, err)
      }
    }

    if (uploadedPhotos.length === 0) {
      return { success: false, message: '照片上传失败' }
    }

    // 3. 写入 user_albums 集合
    const albumData = {
      _openid: wxContext.OPENID,
      orderId,
      title: `电子相册 ${orderId}`,
      photos: uploadedPhotos,
      coverPhoto: uploadedPhotos[0].fileID,
      totalCount: uploadedPhotos.length,
      sourceAlbumId: sourceAlbum._id,
      createTime: new Date()
    }

    await db.collection('user_albums').add({ data: albumData })

    return {
      success: true,
      message: '保存成功',
      data: {
        orderId,
        photoCount: uploadedPhotos.length
      }
    }
  } catch (error) {
    console.error('保存相册失败:', error)
    return {
      success: false,
      message: '保存失败',
      error: error.message
    }
  }
}
