const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

/**
 * 缓存管理工具
 */
const cache = {
  /**
   * 设置缓存（带过期时间）
   * @param {string} key 缓存键
   * @param {any} data 缓存数据
   * @param {number} expire 过期时间（毫秒）
   */
  set(key, data, expire = 0) {
    const cacheData = {
      data,
      timestamp: Date.now(),
      expire
    };
    wx.setStorageSync(key, cacheData);
  },

  /**
   * 获取缓存
   * @param {string} key 缓存键
   * @returns {any} 缓存数据，过期或不存在返回null
   */
  get(key) {
    try {
      const cacheData = wx.getStorageSync(key);
      if (!cacheData) return null;

      const { data, timestamp, expire } = cacheData;

      // 检查是否过期
      if (expire > 0 && Date.now() - timestamp > expire) {
        wx.removeStorageSync(key);
        return null;
      }

      return data;
    } catch (err) {
      console.error('获取缓存失败:', err);
      return null;
    }
  },

  /**
   * 删除缓存
   * @param {string} key 缓存键
   */
  remove(key) {
    wx.removeStorageSync(key);
  },

  /**
   * 清空所有缓存
   */
  clear() {
    wx.clearStorageSync();
  }
};

/**
 * 防抖函数
 * @param {Function} fn 要执行的函数
 * @param {number} delay 延迟时间（毫秒）
 */
const debounce = (fn, delay = 300) => {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

/**
 * 节流函数
 * @param {Function} fn 要执行的函数
 * @param {number} interval 时间间隔（毫秒）
 */
const throttle = (fn, interval = 300) => {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
};

/**
 * 图片内容安全审核
 * @param {string} filePath 图片临时路径
 * @returns {Promise<{success: boolean, errMsg: string}>}
 */
const checkImageSecurity = async (filePath) => {
  try {
    // 获取文件信息
    const fileInfo = await new Promise((resolve, reject) => {
      wx.getFileInfo({
        filePath,
        success: resolve,
        fail: reject
      })
    })

    let checkPath = filePath
    const fileSize = fileInfo.size

    // 如果图片大于 1MB，先压缩
    if (fileSize > 1024 * 1024) {
      console.log('图片大于1MB，开始压缩...')
      const compressRes = await new Promise((resolve, reject) => {
        wx.compressImage({
          src: filePath,
          quality: 80,
          success: resolve,
          fail: reject
        })
      })
      checkPath = compressRes.tempFilePath
      console.log('图片压缩完成')
    }

    // 读取图片文件为 Buffer
    const buffer = await new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: checkPath,
        success: resolve,
        fail: reject
      })
    })

    // 调用云函数进行安全审核（增加超时时间和重试）
    let checkRes;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        checkRes = await wx.cloud.callFunction({
          name: 'checkImage',
          data: {
            value: buffer.data
          },
          config: {
            timeout: 10000 // 10秒超时
          }
        });
        break; // 成功则跳出循环
      } catch (err) {
        retryCount++;
        if (retryCount > maxRetries) {
          throw err; // 重试次数用完，抛出错误
        }
        console.log(`审核超时，第 ${retryCount} 次重试...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒后重试
      }
    }

    const result = checkRes.result

    if (result.errCode === 87014) {
      return {
        success: false,
        errMsg: '图片包含违法违规内容，请更换图片'
      }
    } else if (result.errCode === 0) {
      return {
        success: true,
        errMsg: '图片审核通过'
      }
    } else {
      return {
        success: false,
        errMsg: result.errMsg || '图片审核失败，请重试'
      }
    }
  } catch (err) {
    console.error('图片审核异常:', err)
    return {
      success: false,
      errMsg: '图片审核失败，请重试'
    }
  }
}

/**
 * 检查操作频率限制
 * @param {string} key 操作标识键
 * @param {number} limitMinutes 限制时间（分钟）
 * @returns {boolean} true-可以操作，false-操作太频繁
 */
const checkOperationLimit = (key, limitMinutes = 1440) => {
  const lastTime = wx.getStorageSync(key)
  if (!lastTime) return true

  const now = Date.now()
  const diff = now - lastTime
  const limitMs = limitMinutes * 60 * 1000

  return diff >= limitMs
}

/**
 * 记录操作时间
 * @param {string} key 操作标识键
 */
const recordOperationTime = (key) => {
  wx.setStorageSync(key, Date.now())
}

/**
 * 获取距离下次可操作的剩余时间
 * @param {string} key 操作标识键
 * @param {number} limitMinutes 限制时间（分钟）
 * @returns {string} 剩余时间描述
 */
const getRemainingTime = (key, limitMinutes = 1440) => {
  const lastTime = wx.getStorageSync(key)
  if (!lastTime) return '0分钟'

  const now = Date.now()
  const diff = now - lastTime
  const limitMs = limitMinutes * 60 * 1000
  const remaining = limitMs - diff

  if (remaining <= 0) return '0分钟'

  const hours = Math.floor(remaining / (60 * 60 * 1000))
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}

/**
 * 获取图片缩略图URL
 * @param {string} imageUrl 原图URL
 * @param {number} width 缩略图宽度（默认400）
 * @returns {string} 缩略图URL
 */
const getThumbnailUrl = (imageUrl, width = 400) => {
  if (!imageUrl) return ''

  // 暂时禁用缩略图功能，直接返回原图
  // 原因：需要在腾讯云控制台开通数据万象服务
  // TODO: 开通服务后启用以下代码
  /*
  if (imageUrl.startsWith('cloud://')) {
    return `${imageUrl}?imageMogr2/thumbnail/${width}x`
  }
  */

  return imageUrl
}

/**
 * 压缩图片
 * @param {string} filePath 图片路径
 * @param {number} quality 压缩质量 0-100（默认80）
 * @returns {Promise<string>} 压缩后的图片路径
 */
const compressImage = (filePath, quality = 80) => {
  return new Promise((resolve, reject) => {
    console.log(`[压缩图片] 开始压缩，原图路径: ${filePath}, 质量: ${quality}%`);
    wx.compressImage({
      src: filePath,
      quality: quality,
      success: (res) => {
        console.log(`[压缩图片] 压缩成功，原路径: ${filePath}, 压缩后路径: ${res.tempFilePath}`);
        resolve(res.tempFilePath)
      },
      fail: (err) => {
        console.error('[压缩图片] 压缩失败:', err);
        // 压缩失败返回原图
        console.log('[压缩图片] 压缩失败，返回原图');
        resolve(filePath)
      }
    })
  })
}

/**
 * 批量压缩图片
 * @param {Array<string>} filePaths 图片路径数组
 * @param {number} quality 压缩质量 0-100（默认80）
 * @returns {Promise<Array<string>>} 压缩后的图片路径数组
 */
const compressImages = async (filePaths, quality = 80) => {
  const compressedPaths = []
  for (let i = 0; i < filePaths.length; i++) {
    const compressed = await compressImage(filePaths[i], quality)
    compressedPaths.push(compressed)
  }
  return compressedPaths
}

/**
 * 生成缩略图
 * @param {string} filePath 图片路径
 * @param {number} quality 压缩质量 0-100（默认60，适合缩略图）
 * @returns {Promise<string>} 缩略图路径
 */
const generateThumbnail = (filePath, quality = 60) => {
  console.log(`[生成缩略图] 调用压缩函数，质量: ${quality}%`);
  return compressImage(filePath, quality)
}

module.exports = {
  formatTime,
  cache,
  debounce,
  throttle,
  checkImageSecurity,
  checkOperationLimit,
  recordOperationTime,
  getRemainingTime,
  getThumbnailUrl,
  compressImage,
  compressImages,
  generateThumbnail
}
