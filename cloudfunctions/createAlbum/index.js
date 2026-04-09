const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 生成 12 位 albumId
function generateAlbumId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 去掉易混淆字符 I/O/0/1
  let code = ''
  for (let i = 0; i < 12; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

exports.main = async (event, context) => {
  const { adminId, title, locationName, description, photos } = event

  if (!adminId || !title || !photos || photos.length === 0) {
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

    // 生成唯一 albumId（重试机制）
    let albumId = ''
    let retries = 5
    while (retries > 0) {
      albumId = generateAlbumId()
      const existing = await db.collection('albums').where({ albumId }).count()
      if (existing.total === 0) break
      retries--
    }
    if (retries === 0) {
      return { success: false, message: '生成相册ID失败，请重试' }
    }

    const result = await db.collection('albums').add({
      data: {
        albumId,
        title,
        locationName: locationName || '',
        description: description || '',
        photos,
        coverPhoto: photos[0],
        totalCount: photos.length,
        status: 'active',
        createTime: db.serverDate()
      }
    })

    return { success: true, message: '创建成功', data: { _id: result._id, albumId } }
  } catch (error) {
    console.error('创建相册失败:', error)
    return { success: false, message: '创建失败' }
  }
}
