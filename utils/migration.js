// utils/migration.js - 数据迁移模块（将旧的本地缓存迁移到云端）

// 迁移标记键
const MIGRATION_FLAG = 'migration_completed_v1'

// 旧缓存键名映射
const OLD_CACHE_KEYS = {
  favoriteTemplates: { type: 'favorite', targetType: 'template', collection: 'templates' },
  likedTemplates: { type: 'like', targetType: 'template', collection: 'templates' },
  favoriteLocations: { type: 'favorite', targetType: 'location', collection: 'locations' },
  favoriteGoods: { type: 'favorite', targetType: 'goods', collection: 'goods' }
}

/**
 * 获取数据库实例（延迟初始化）
 */
function getDB() {
  return wx.cloud.database()
}

/**
 * 检查是否需要迁移
 */
function needMigration() {
  const migrated = wx.getStorageSync(MIGRATION_FLAG)
  return !migrated
}

/**
 * 获取用户openid
 */
async function getUserOpenId() {
  const app = getApp()
  if (!app || !app.globalData || !app.ensureUserInfo) {
    return null
  }
  const userInfo = await app.ensureUserInfo()
  if (!userInfo || !userInfo.openid) {
    return null
  }
  return userInfo.openid
}

/**
 * 迁移单个类型的数据
 */
async function migrateSingleType(oldKey, config) {
  try {
    const oldData = wx.getStorageSync(oldKey)
    if (!oldData || !Array.isArray(oldData) || oldData.length === 0) {
      console.log(`[迁移] ${oldKey} 无数据，跳过`)
      return { success: true, count: 0 }
    }

    const openid = await getUserOpenId()
    if (!openid) {
      console.error('[迁移] 用户未登录，无法迁移')
      return { success: false, message: '用户未登录' }
    }

    console.log(`[迁移] 开始迁移 ${oldKey}，共 ${oldData.length} 条`)

    const db = getDB()
    const collectionName = config.type === 'favorite' ? 'user_favorites' : 'user_likes'
    const now = new Date()

    // 批量添加到云端（每次最多20条）
    const batchSize = 20
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < oldData.length; i += batchSize) {
      const batch = oldData.slice(i, i + batchSize)
      const promises = batch.map(targetId => {
        return db.collection(collectionName)
          .add({
            data: {
              _openid: openid,
              userId: openid,
              targetId: targetId,
              targetType: config.targetType,
              createTime: now,
              updateTime: now
            }
          })
          .then(() => {
            successCount++
            return { success: true, targetId }
          })
          .catch(err => {
            // 如果是重复记录错误（唯一索引冲突），视为成功
            if (err.errCode === -1 || err.message.includes('duplicate')) {
              console.log(`[迁移] ${targetId} 已存在，跳过`)
              successCount++
              return { success: true, targetId }
            }
            console.error(`[迁移] ${targetId} 失败:`, err)
            failCount++
            return { success: false, targetId, error: err }
          })
      })

      await Promise.all(promises)
    }

    console.log(`[迁移] ${oldKey} 完成: 成功 ${successCount}, 失败 ${failCount}`)

    // 如果全部成功或大部分成功，清除旧缓存
    if (failCount === 0 || successCount > failCount) {
      wx.removeStorageSync(oldKey)
      console.log(`[迁移] 已清除旧缓存 ${oldKey}`)
    }

    return {
      success: failCount === 0,
      count: successCount,
      failCount: failCount
    }
  } catch (error) {
    console.error(`[迁移] ${oldKey} 异常:`, error)
    return { success: false, message: error.message }
  }
}

/**
 * 执行数据迁移
 */
async function performMigration() {
  try {
    console.log('[迁移] 开始数据迁移...')

    // 检查用户是否登录
    const openid = await getUserOpenId()
    if (!openid) {
      console.log('[迁移] 用户未登录，延迟迁移')
      return { success: false, message: '用户未登录，将在登录后自动迁移' }
    }

    const results = {}
    let totalSuccess = 0
    let totalFail = 0

    // 逐个迁移
    for (let oldKey in OLD_CACHE_KEYS) {
      const config = OLD_CACHE_KEYS[oldKey]
      const result = await migrateSingleType(oldKey, config)
      results[oldKey] = result

      if (result.success) {
        totalSuccess += result.count || 0
      } else {
        totalFail += result.failCount || 0
      }
    }

    // 标记迁移完成
    if (totalFail === 0) {
      wx.setStorageSync(MIGRATION_FLAG, {
        completed: true,
        timestamp: Date.now(),
        totalCount: totalSuccess
      })
      console.log(`[迁移] 全部完成，共迁移 ${totalSuccess} 条记录`)
    } else {
      console.log(`[迁移] 部分失败: 成功 ${totalSuccess}, 失败 ${totalFail}`)
    }

    return {
      success: totalFail === 0,
      totalSuccess,
      totalFail,
      details: results
    }
  } catch (error) {
    console.error('[迁移] 执行失败:', error)
    return { success: false, message: error.message }
  }
}

/**
 * 启动迁移（带重试机制）
 */
async function startMigration() {
  // 检查是否需要迁移
  if (!needMigration()) {
    console.log('[迁移] 已完成迁移，跳过')
    return { success: true, message: '已完成迁移' }
  }

  // 执行迁移
  const result = await performMigration()

  // 如果失败且是因为未登录，不标记为失败（等待下次重试）
  if (!result.success && result.message && result.message.includes('未登录')) {
    console.log('[迁移] 等待用户登录后重试')
    return result
  }

  return result
}

/**
 * 重置迁移标记（用于测试）
 */
function resetMigration() {
  wx.removeStorageSync(MIGRATION_FLAG)
  console.log('[迁移] 已重置迁移标记')
}

module.exports = {
  needMigration,
  startMigration,
  resetMigration
}
