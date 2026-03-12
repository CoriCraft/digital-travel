// utils/interaction.js - 用户互动功能（收藏/点赞）统一管理模块

// 缓存配置
const CACHE_EXPIRE_TIME = 30 * 60 * 1000 // 30分钟
const CACHE_VERSION = 1

// 防抖配置
let debounceTimers = {}

/**
 * 获取数据库实例（延迟初始化）
 */
function getDB() {
  return wx.cloud.database()
}

/**
 * 获取缓存键名
 */
function getCacheKey(type, targetType) {
  return `user_${type}_${targetType}_v${CACHE_VERSION}`
}

/**
 * 读取缓存
 */
function getCache(type, targetType) {
  try {
    const key = getCacheKey(type, targetType)
    const cache = wx.getStorageSync(key)

    if (!cache || !cache.timestamp || !cache.data) {
      return null
    }

    const now = Date.now()
    if (now - cache.timestamp > CACHE_EXPIRE_TIME) {
      // 缓存过期
      wx.removeStorageSync(key)
      return null
    }

    return cache.data
  } catch (error) {
    console.error('读取缓存失败:', error)
    return null
  }
}

/**
 * 写入缓存
 */
function setCache(type, targetType, data) {
  try {
    const key = getCacheKey(type, targetType)
    wx.setStorageSync(key, {
      data: data,
      timestamp: Date.now(),
      version: CACHE_VERSION
    })
  } catch (error) {
    console.error('写入缓存失败:', error)
  }
}

/**
 * 更新缓存中的单个ID
 */
function updateCacheItem(type, targetType, targetId, isAdd) {
  const cache = getCache(type, targetType) || []
  let newCache

  if (isAdd) {
    // 添加（去重）
    newCache = Array.from(new Set([...cache, targetId]))
  } else {
    // 移除
    newCache = cache.filter(id => id !== targetId)
  }

  setCache(type, targetType, newCache)
  return newCache
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
 * 检查收藏状态
 * @param {string} targetId - 目标资源ID
 * @param {string} targetType - 资源类型: template/location/goods/photo
 * @returns {Promise<boolean>}
 */
async function checkFavoriteStatus(targetId, targetType) {
  try {
    // 先读缓存
    const cache = getCache('favorites', targetType)
    if (cache) {
      return cache.includes(targetId)
    }

    // 缓存未命中，查询云端
    const openid = await getUserOpenId()
    if (!openid) {
      return false
    }

    const db = getDB()
    const { data } = await db.collection('user_favorites')
      .where({
        userId: openid,
        targetType: targetType
      })
      .field({ targetId: true })
      .get()

    // 更新缓存
    const ids = data.map(item => item.targetId)
    setCache('favorites', targetType, ids)

    return ids.includes(targetId)
  } catch (error) {
    console.error('检查收藏状态失败:', error)
    return false
  }
}

/**
 * 检查点赞状态
 * @param {string} targetId - 目标资源ID
 * @param {string} targetType - 资源类型: template/photo
 * @returns {Promise<boolean>}
 */
async function checkLikeStatus(targetId, targetType) {
  try {
    // 先读缓存
    const cache = getCache('likes', targetType)
    if (cache) {
      return cache.includes(targetId)
    }

    // 缓存未命中，查询云端
    const openid = await getUserOpenId()
    if (!openid) {
      return false
    }

    const db = getDB()
    const { data } = await db.collection('user_likes')
      .where({
        userId: openid,
        targetType: targetType
      })
      .field({ targetId: true })
      .get()

    // 更新缓存
    const ids = data.map(item => item.targetId)
    setCache('likes', targetType, ids)

    return ids.includes(targetId)
  } catch (error) {
    console.error('检查点赞状态失败:', error)
    return false
  }
}

/**
 * 切换收藏状态（带防抖）
 * @param {string} targetId - 目标资源ID
 * @param {string} targetType - 资源类型
 * @param {string} collectionName - 资源集合名称
 * @returns {Promise<{success: boolean, isFavorite: boolean, count: number}>}
 */
async function toggleFavorite(targetId, targetType, collectionName) {
  // 防抖处理
  const debounceKey = `favorite_${targetId}`
  if (debounceTimers[debounceKey]) {
    return { success: false, message: '操作过快，请稍后再试' }
  }

  debounceTimers[debounceKey] = setTimeout(() => {
    delete debounceTimers[debounceKey]
  }, 300)

  try {
    const openid = await getUserOpenId()
    if (!openid) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false
      })
      return { success: false, message: '未登录' }
    }

    // 检查当前状态
    const isFavorite = await checkFavoriteStatus(targetId, targetType)

    const db = getDB()
    if (isFavorite) {
      // 取消收藏
      await db.collection('user_favorites')
        .where({
          userId: openid,
          targetId: targetId,
          targetType: targetType
        })
        .remove()

      // 更新资源计数
      await db.collection(collectionName)
        .doc(targetId)
        .update({
          data: {
            favoriteCount: db.command.inc(-1)
          }
        })

      // 更新缓存
      updateCacheItem('favorites', targetType, targetId, false)

      return { success: true, isFavorite: false }
    } else {
      // 添加收藏
      await db.collection('user_favorites')
        .add({
          data: {
            _openid: openid,
            userId: openid,
            targetId: targetId,
            targetType: targetType,
            createTime: new Date(),
            updateTime: new Date()
          }
        })

      // 更新资源计数
      await db.collection(collectionName)
        .doc(targetId)
        .update({
          data: {
            favoriteCount: db.command.inc(1)
          }
        })

      // 更新缓存
      updateCacheItem('favorites', targetType, targetId, true)

      return { success: true, isFavorite: true }
    }
  } catch (error) {
    console.error('切换收藏状态失败:', error)
    return { success: false, message: error.message || '操作失败' }
  }
}

/**
 * 切换点赞状态（带防抖）
 * @param {string} targetId - 目标资源ID
 * @param {string} targetType - 资源类型
 * @param {string} collectionName - 资源集合名称
 * @returns {Promise<{success: boolean, isLiked: boolean, count: number}>}
 */
async function toggleLike(targetId, targetType, collectionName) {
  // 防抖处理
  const debounceKey = `like_${targetId}`
  if (debounceTimers[debounceKey]) {
    return { success: false, message: '操作过快，请稍后再试' }
  }

  debounceTimers[debounceKey] = setTimeout(() => {
    delete debounceTimers[debounceKey]
  }, 300)

  try {
    const openid = await getUserOpenId()
    if (!openid) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false
      })
      return { success: false, message: '未登录' }
    }

    // 检查当前状态
    const isLiked = await checkLikeStatus(targetId, targetType)

    const db = getDB()
    if (isLiked) {
      // 取消点赞
      await db.collection('user_likes')
        .where({
          userId: openid,
          targetId: targetId,
          targetType: targetType
        })
        .remove()

      // 更新资源计数
      await db.collection(collectionName)
        .doc(targetId)
        .update({
          data: {
            likeCount: db.command.inc(-1)
          }
        })

      // 更新缓存
      updateCacheItem('likes', targetType, targetId, false)

      return { success: true, isLiked: false }
    } else {
      // 添加点赞
      await db.collection('user_likes')
        .add({
          data: {
            _openid: openid,
            userId: openid,
            targetId: targetId,
            targetType: targetType,
            createTime: new Date(),
            updateTime: new Date()
          }
        })

      // 更新资源计数
      await db.collection(collectionName)
        .doc(targetId)
        .update({
          data: {
            likeCount: db.command.inc(1)
          }
        })

      // 更新缓存
      updateCacheItem('likes', targetType, targetId, true)

      return { success: true, isLiked: true }
    }
  } catch (error) {
    console.error('切换点赞状态失败:', error)
    return { success: false, message: error.message || '操作失败' }
  }
}

/**
 * 清除缓存
 * @param {string} type - 类型: favorites/likes
 * @param {string} targetType - 资源类型
 */
function clearCache(type, targetType) {
  try {
    const key = getCacheKey(type, targetType)
    wx.removeStorageSync(key)
  } catch (error) {
    console.error('清除缓存失败:', error)
  }
}

/**
 * 批量检查状态
 * @param {Array} targets - 目标资源列表 [{id, type}]
 * @param {string} actionType - 操作类型: favorite/like
 * @param {boolean} forceRefresh - 是否强制刷新（忽略缓存）
 * @returns {Promise<Object>} - {targetId: boolean}
 */
async function batchCheckStatus(targets, actionType, forceRefresh = false) {
  try {
    const openid = await getUserOpenId()
    if (!openid || !targets || targets.length === 0) {
      return {}
    }

    // 按类型分组
    const grouped = {}
    targets.forEach(target => {
      if (!grouped[target.targetType]) {
        grouped[target.targetType] = []
      }
      grouped[target.targetType].push(target.targetId)
    })

    const result = {}
    const collectionName = actionType === 'favorite' ? 'user_favorites' : 'user_likes'

    const db = getDB()
    // 分类型查询
    for (let targetType in grouped) {
      const ids = grouped[targetType]

      // 如果强制刷新，清除缓存
      if (forceRefresh) {
        clearCache(actionType === 'favorite' ? 'favorites' : 'likes', targetType)
      }

      // 先尝试从缓存读取
      const cache = getCache(actionType === 'favorite' ? 'favorites' : 'likes', targetType)
      if (cache && !forceRefresh) {
        ids.forEach(id => {
          result[id] = cache.includes(id)
        })
        continue
      }

      // 缓存未命中或强制刷新，查询云端
      const { data } = await db.collection(collectionName)
        .where({
          userId: openid,
          targetType: targetType,
          targetId: db.command.in(ids)
        })
        .field({ targetId: true })
        .get()

      const checkedIds = data.map(item => item.targetId)

      // 更新缓存
      const allIds = await db.collection(collectionName)
        .where({
          userId: openid,
          targetType: targetType
        })
        .field({ targetId: true })
        .get()

      const cacheIds = allIds.data.map(item => item.targetId)
      setCache(actionType === 'favorite' ? 'favorites' : 'likes', targetType, cacheIds)

      ids.forEach(id => {
        result[id] = checkedIds.includes(id)
      })
    }

    return result
  } catch (error) {
    console.error('批量检查状态失败:', error)
    return {}
  }
}

module.exports = {
  checkFavoriteStatus,
  checkLikeStatus,
  toggleFavorite,
  toggleLike,
  batchCheckStatus,
  clearCache
}
