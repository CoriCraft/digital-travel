// pages/template-detail/template-detail.js
const app = getApp()
const { getThumbnailUrl } = require('../../utils/util.js')
const interaction = require('../../utils/interaction.js')

function getDB() {
  return wx.cloud.database()
}

Page({
  /**
   * 页面的初始数据
   */
  data: {
    templateId: '',
    template: null,
    photos: [], // 照片列表（替代photoSets）
    leftColumnPhotos: [], // 左列照片
    rightColumnPhotos: [], // 右列照片
    leftHeight: 0, // 左列高度
    rightHeight: 0, // 右列高度
    sortType: 'hot', // hot-热度, time-时间
    loading: false,
    statusBarHeight: 0,
    navBarHeight: 0,
    menuButtonRight: 0, // 胶囊按钮右侧距离
    defaultAvatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23E8F5E9"/%3E%3Cpath d="M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 5c-13.807 0-25 11.193-25 25v10h50V75c0-13.807-11.193-25-25-25z" fill="%233ECE79"/%3E%3C/svg%3E',
    isFavorite: false,
    isLiked: false,
    isCreator: false // 是否是创建者
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    const { id } = options;
    this.setData({
      templateId: id,
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      menuButtonRight: app.globalData.menuButtonRight
    });

    await app.ensureUserInfo();
    this.loadTemplateDetail();
    this.loadPhotos(); // 独立加载照片列表
    this.checkFavoriteStatus();
    this.checkLikeStatus();
  },

  /**
   * 加载模板详情
   */
  loadTemplateDetail() {
    const { templateId } = this.data;
    const cacheKey = `template_cache_${templateId}`;
    const cachedData = wx.getStorageSync(cacheKey);
    const now = Date.now();
    const cacheExpire = 5 * 60 * 1000; // 缓存5分钟

    // 如果有缓存且未过期，使用缓存数据
    if (cachedData && cachedData.timestamp && (now - cachedData.timestamp < cacheExpire)) {
      console.log('使用缓存的模板数据');
      this.setData({
        template: cachedData.data
      });
      // 检查是否是创建者
      this.checkIsCreator(cachedData.data);
      // 检查收藏和点赞状态
      this.checkFavoriteStatus();
      this.checkLikeStatus();
      // 仍然增加观看量（如果符合条件）
      this.increaseViewCount();
      return;
    }

    // 缓存过期或不存在，从数据库加载
    console.log('从数据库加载模板数据');
    const db = getDB();
    db.collection('templates')
      .doc(templateId)
      .get()
      .then(res => {
        console.log('模板详情:', res.data);
        this.setData({
          template: res.data
        });

        // 检查是否是创建者
        this.checkIsCreator(res.data);

        // 检查收藏和点赞状态
        this.checkFavoriteStatus();
        this.checkLikeStatus();

        // 保存到缓存
        wx.setStorageSync(cacheKey, {
          data: res.data,
          timestamp: now
        });

        // 增加观看量
        this.increaseViewCount();
      })
      .catch(err => {
        console.error('加载模板详情失败:', err);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      });
  },

  /**
   * 检查是否是创建者
   */
  async checkIsCreator(template) {
    const userInfo = await app.ensureUserInfo();
    const currentOpenId = userInfo?.openid || '';
    const creatorId = template.creatorId || '';

    const isCreator = currentOpenId && creatorId && currentOpenId === creatorId;
    console.log('是否是创建者:', isCreator, '当前用户:', currentOpenId, '创建者:', creatorId);

    this.setData({ isCreator });
  },

  /**
   * 增加观看量
   */
  increaseViewCount() {
    const { templateId } = this.data;
    const storageKey = `template_view_${templateId}`;
    const lastViewTime = wx.getStorageSync(storageKey) || 0;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1小时

    // 如果距离上次观看超过1小时，才增加观看量
    if (now - lastViewTime > oneHour) {
      const db = getDB();
      const _ = db.command;

      db.collection('templates')
        .doc(templateId)
        .update({
          data: {
            viewCount: _.inc(1)
          }
        })
        .then(() => {
          console.log('观看量+1');
          // 记录本次观看时间
          wx.setStorageSync(storageKey, now);
        })
        .catch(err => {
          console.error('更新观看量失败:', err);
        });
    } else {
      console.log('1小时内已观看过，不重复计数');
    }
  },

  /**
   * 加载照片列表（从photos集合中查询）
   */
  loadPhotos() {
    if (this.data.loading) return;

    const { templateId } = this.data;
    const cacheKey = `photos_cache_${templateId}`;
    const cachedData = wx.getStorageSync(cacheKey);
    const now = Date.now();
    const cacheExpire = 1 * 60 * 1000; // 缓存1分钟（从10分钟改为1分钟）

    // 如果有缓存且未过期，使用缓存数据
    if (cachedData && cachedData.timestamp && (now - cachedData.timestamp < cacheExpire)) {
      console.log('使用缓存的照片数据');

      // 批量获取所有照片的真实宽高
      Promise.all(
        cachedData.data.map(async (photo) => {
          try {
            const imageUrl = photo.thumbnailUrl || photo.photoUrl;
            const imageInfo = await wx.getImageInfo({ src: imageUrl });
            return {
              ...photo,
              width: imageInfo.width,
              height: imageInfo.height
            };
          } catch (err) {
            console.error('获取图片信息失败:', photo._id, err);
            return photo;
          }
        })
      ).then(allPhotos => {
        // 检查每张照片的点赞状态
        this.checkPhotosLikeStatus(allPhotos);

        // 获取图片临时链接（用于预览）
        this.getTempFileURLs(allPhotos);

        // 设置照片数据
        this.setData({
          photos: allPhotos,
          loading: false
        }, () => {
          // 数据设置完成后进行排序
          this.sortPhotos();
        });
      });
      return;
    }

    // 缓存过期或不存在，从数据库加载
    console.log('从数据库加载照片数据');
    this.setData({ loading: true });

    const db = getDB();

    // 从photos集合中查询该模板的所有照片
    db.collection('photos')
      .where({
        templateId: templateId,
        status: 'approved'
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(async res => {
        console.log('[模板详情] 照片列表加载成功，数量:', res.data.length);

        // 批量获取所有照片的真实宽高
        const allPhotos = await Promise.all(
          res.data.map(async (photo) => {
            try {
              // 优先使用缩略图获取宽高（更快）
              const imageUrl = photo.thumbnailUrl || photo.photoUrl;
              const imageInfo = await wx.getImageInfo({ src: imageUrl });
              return {
                ...photo,
                width: imageInfo.width,
                height: imageInfo.height
              };
            } catch (err) {
              console.error('获取图片信息失败:', photo._id, err);
              // 如果获取失败，返回原照片对象（会使用哈希估算）
              return photo;
            }
          })
        );

        // 打印每张照片的URL信息
        allPhotos.forEach((photo, index) => {
          console.log(`[模板详情] 照片${index + 1}:`, {
            _id: photo._id,
            hasThumbnail: !!photo.thumbnailUrl,
            thumbnailUrl: photo.thumbnailUrl,
            photoUrl: photo.photoUrl,
            width: photo.width,
            height: photo.height
          });
        });

        // 保存到缓存
        wx.setStorageSync(cacheKey, {
          data: allPhotos,
          timestamp: now
        });

        // 检查每张照片的点赞状态
        this.checkPhotosLikeStatus(allPhotos);

        // 获取图片临时链接（用于预览）
        this.getTempFileURLs(allPhotos);

        // 设置照片数据
        this.setData({
          photos: allPhotos,
          loading: false
        }, () => {
          // 数据设置完成后进行排序
          this.sortPhotos();
        });
      })
      .catch(err => {
        console.error('加载照片失败:', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      });
  },

  /**
   * 获取图片临时链接并缓存
   */
  getTempFileURLs(photos) {
    // 分离 cloud:// 和 https:// 链接
    const cloudFiles = [];
    const cloudIndexMap = {}; // 记录 cloud:// 文件对应的照片索引

    photos.forEach((photo, index) => {
      if (photo.photoUrl && photo.photoUrl.startsWith('cloud://')) {
        cloudFiles.push(photo.photoUrl);
        cloudIndexMap[photo.photoUrl] = index;
      }
    });

    // 如果没有 cloud:// 链接，直接预加载图片
    if (cloudFiles.length === 0) {
      console.log('所有图片都是 HTTP 链接，开始预加载');
      this.preloadImages(photos);
      return;
    }

    wx.cloud.getTempFileURL({
      fileList: cloudFiles
    }).then(res => {
      console.log('获取临时链接成功:', res.fileList);

      // 将临时链接映射到照片对象
      res.fileList.forEach(item => {
        if (item.status === 0) {
          const photoIndex = cloudIndexMap[item.fileID];
          if (photoIndex !== undefined) {
            photos[photoIndex].tempPhotoUrl = item.tempFileURL;
          }
        } else {
          // 文件不存在或获取失败
          console.warn('获取临时链接失败:', item.fileID, 'status:', item.status, 'errMsg:', item.errMsg);
        }
      });

      // 更新页面数据
      this.setData({
        photos: photos
      });

      // 预加载图片
      this.preloadImages(photos);
    }).catch(err => {
      console.error('获取临时链接失败:', err);
      // 即使获取临时链接失败，也尝试预加载（可能有些是HTTP链接）
      this.preloadImages(photos);
    });
  },

  /**
   * 预加载图片到缓存
   */
  preloadImages(photos) {
    // 限制预加载数量，避免占用太多内存
    const maxPreload = 10;

    // 使用临时链接或原始链接（如果是 HTTP 链接）
    const urlsToPreload = photos.slice(0, maxPreload).map(p => {
      // 优先使用临时链接，如果没有则使用原始链接（可能是 HTTP 链接）
      const url = p.tempPhotoUrl || p.photoUrl;
      // 只预加载 HTTP/HTTPS 链接
      return url && (url.startsWith('http://') || url.startsWith('https://')) ? url : null;
    }).filter(url => url !== null);

    console.log(`预加载前 ${urlsToPreload.length} 张图片`);

    urlsToPreload.forEach(url => {
      wx.getImageInfo({
        src: url,
        success: () => {
          console.log('预加载成功:', url);
        },
        fail: (err) => {
          console.error('预加载失败:', url, err);
        }
      });
    });
  },

  /**
   * 切换排序方式
   */
  onSortChange(e) {
    const { type } = e.currentTarget.dataset;
    if (type === this.data.sortType) return;

    this.setData({ sortType: type });

    // 重新排序照片
    this.sortPhotos();
  },

  /**
   * 排序照片
   */
  sortPhotos() {
    const { photos, sortType } = this.data;
    if (!photos || photos.length === 0) return;

    console.log('开始排序照片，当前排序类型:', sortType);
    console.log('照片数据:', photos.map(p => ({ id: p._id, sortOrder: p.sortOrder, userName: p.userName })));

    let sortedPhotos = [...photos];

    // 分离固定排序和动态排序的照片
    const pinnedPhotos = sortedPhotos.filter(p => (p.sortOrder || 0) > 0);
    const dynamicPhotos = sortedPhotos.filter(p => (p.sortOrder || 0) <= 0);

    console.log('置顶照片数量:', pinnedPhotos.length);
    console.log('普通照片数量:', dynamicPhotos.length);

    // 固定排序的照片按 sortOrder 升序排列
    pinnedPhotos.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    // 动态排序的照片根据排序类型排序
    if (sortType === 'hot') {
      // 热度排序：计算热度分数
      dynamicPhotos.forEach(photo => {
        const viewCount = photo.viewCount || 0;
        const likeCount = photo.likeCount || 0;
        const favoriteCount = photo.favoriteCount || 0;
        photo.hotScore = viewCount * 0.1 + likeCount * 2 + favoriteCount * 3;
      });
      dynamicPhotos.sort((a, b) => b.hotScore - a.hotScore);
    } else if (sortType === 'time') {
      // 时间排序：按创建时间降序
      dynamicPhotos.sort((a, b) => (b.createTime || 0) - (a.createTime || 0));
    }

    // 合并：固定排序在前，动态排序在后
    sortedPhotos = [...pinnedPhotos, ...dynamicPhotos];

    console.log('排序后照片顺序:', sortedPhotos.map(p => ({ id: p._id, sortOrder: p.sortOrder, userName: p.userName })));

    // 重置瀑布流
    this.setData({
      photos: sortedPhotos,
      leftColumnPhotos: [],
      rightColumnPhotos: [],
      leftHeight: 0,
      rightHeight: 0
    }, () => {
      // 智能瀑布流分列
      this.buildWaterfall(sortedPhotos);
    });
  },

  /**
   * 智能瀑布流分列
   * 优先使用真实宽高，否则使用图片 ID 哈希值来生成稳定的高度估算
   */
  buildWaterfall(photos) {
    // 创建新的空数组，不使用 data 中的旧数据
    const leftColumnPhotos = [];
    const rightColumnPhotos = [];
    let leftHeight = 0;
    let rightHeight = 0;

    console.log('[瀑布流] 开始分配，照片总数:', photos.length);

    photos.forEach((photo, index) => {
      // 添加 originalIndex 用于点击跳转
      const photoWithIndex = { ...photo, originalIndex: index };

      // 计算实际高度：优先使用图片的真实宽高比
      let cardHeight;
      if (photo.width && photo.height) {
        // 如果有宽高信息，使用真实宽高比计算
        // 假设列宽为 343rpx（750rpx - 24*2 - 16）/ 2
        const columnWidth = 343;
        const imageHeight = (photo.height / photo.width) * columnWidth;
        cardHeight = imageHeight + 120; // 图片高度 + 底部信息栏
        console.log(`[瀑布流] 照片${index} 使用真实宽高比: ${photo.width}x${photo.height}, 计算高度:${cardHeight.toFixed(0)}`);
      } else {
        // 如果没有宽高信息，使用哈希值估算
        const hash = this.simpleHash(photo._id);
        const heightVariation = (hash % 300) - 150;
        const baseHeight = 450;
        cardHeight = baseHeight + heightVariation + 120;
        console.log(`[瀑布流] 照片${index} 使用哈希估算, 高度:${cardHeight}`);
      }

      // 打印每张照片在列表中使用的URL
      const displayUrl = photo.thumbnailUrl || photo.photoUrl;
      console.log(`[模板详情] 列表显示照片${index + 1}:`, {
        _id: photo._id,
        useThumbnail: !!photo.thumbnailUrl,
        displayUrl: displayUrl,
        estimatedHeight: cardHeight,
        leftHeight,
        rightHeight
      });

      // 分配到较短的列
      if (leftHeight <= rightHeight) {
        leftColumnPhotos.push(photoWithIndex);
        leftHeight += cardHeight;
        console.log(`[瀑布流] 照片${index} -> 左列, 高度:${cardHeight.toFixed(0)}, 左列总高:${leftHeight.toFixed(0)}`);
      } else {
        rightColumnPhotos.push(photoWithIndex);
        rightHeight += cardHeight;
        console.log(`[瀑布流] 照片${index} -> 右列, 高度:${cardHeight.toFixed(0)}, 右列总高:${rightHeight.toFixed(0)}`);
      }
    });

    console.log('[瀑布流] 分配完成:', {
      totalPhotos: photos.length,
      leftCount: leftColumnPhotos.length,
      rightCount: rightColumnPhotos.length,
      leftHeight: leftHeight.toFixed(0),
      rightHeight: rightHeight.toFixed(0),
      diff: Math.abs(leftHeight - rightHeight).toFixed(0)
    });

    this.setData({
      leftColumnPhotos,
      rightColumnPhotos,
      leftHeight,
      rightHeight
    });
  },

  /**
   * 简单哈希函数
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  },

  /**
   * 点击照片
   */
  onPhotoTap(e) {
    const { index } = e.currentTarget.dataset;
    const { photos, leftColumnPhotos, rightColumnPhotos, templateId } = this.data;

    // 合并左右列，得到当前显示顺序的照片列表
    const displayPhotos = [];
    const maxLength = Math.max(leftColumnPhotos.length, rightColumnPhotos.length);
    for (let i = 0; i < maxLength; i++) {
      if (leftColumnPhotos[i]) displayPhotos.push(leftColumnPhotos[i]);
      if (rightColumnPhotos[i]) displayPhotos.push(rightColumnPhotos[i]);
    }

    console.log('[点击照片] index:', index, '显示顺序照片数:', displayPhotos.length);

    // 使用 index 从显示顺序中获取照片
    const photo = displayPhotos[index];
    if (!photo) {
      console.error('[点击照片] 照片不存在，index:', index);
      return;
    }

    console.log('[点击照片] 点击的照片:', { _id: photo._id, userName: photo.userName });

    // 将显示顺序的照片列表存到缓存，供预览页使用
    wx.setStorageSync('previewPhotos', displayPhotos);
    wx.setStorageSync('previewPhotosTemplateId', templateId);

    // 跳转到照片预览页面，传递在显示列表中的索引
    wx.navigateTo({
      url: `/pages/photo-preview/photo-preview?currentIndex=${index}`
    });
  },

  /**
   * 返回上一页
   */
  onBack() {
    // 返回时传递更新后的数据
    const pages = getCurrentPages();
    if (pages.length > 1) {
      const prevPage = pages[pages.length - 2];
      if (prevPage.route === 'pages/template/template') {
        // 更新列表页中对应的模板数据
        prevPage.updateTemplateItem(this.data.templateId, {
          favoriteCount: this.data.template.favoriteCount,
          likeCount: this.data.template.likeCount,
          viewCount: this.data.template.viewCount
        });
      }
    }
    wx.navigateBack();
  },

  /**
   * 上传照片
   */
  onUpload() {
    const { templateId } = this.data;

    // 跳转到上传照片页面
    wx.navigateTo({
      url: `/pages/upload-photoset/upload-photoset?templateId=${templateId}`
    });
  },

  /**
   * 检查收藏状态
   */
  async checkFavoriteStatus() {
    const isFavorite = await interaction.checkFavoriteStatus(this.data.templateId, 'template')
    this.setData({ isFavorite })
  },

  /**
   * 检查点赞状态
   */
  async checkLikeStatus() {
    const isLiked = await interaction.checkLikeStatus(this.data.templateId, 'template')
    this.setData({ isLiked })
  },

  /**
   * 切换收藏状态
   */
  async onToggleFavorite() {
    const { isFavorite, templateId } = this.data

    // 乐观更新UI
    this.setData({ isFavorite: !isFavorite })

    // 调用统一接口
    const result = await interaction.toggleFavorite(templateId, 'template', 'templates')

    if (result.success) {
      // 更新成功，显示提示
      wx.showToast({
        title: result.isFavorite ? '收藏成功' : '已取消收藏',
        icon: 'success'
      })

      // 清除缓存并重新加载模板详情以更新计数
      wx.removeStorageSync(`template_cache_${templateId}`)
      this.loadTemplateDetail()
    } else {
      // 更新失败，回滚UI
      this.setData({ isFavorite: isFavorite })
      wx.showToast({
        title: result.message || '操作失败',
        icon: 'none'
      })
    }
  },

  /**
   * 切换点赞状态
   */
  async onToggleLike() {
    const { isLiked, templateId } = this.data

    // 乐观更新UI
    this.setData({ isLiked: !isLiked })

    // 调用统一接口
    const result = await interaction.toggleLike(templateId, 'template', 'templates')

    if (result.success) {
      // 更新成功，显示提示
      wx.showToast({
        title: result.isLiked ? '点赞成功' : '已取消点赞',
        icon: 'success'
      })

      // 清除缓存并重新加载模板详情以更新计数
      wx.removeStorageSync(`template_cache_${templateId}`)
      this.loadTemplateDetail()
    } else {
      // 更新失败，回滚UI
      this.setData({ isLiked: isLiked })
      wx.showToast({
        title: result.message || '操作失败',
        icon: 'none'
      })
    }
  },

  /**
   * 检查照片点赞状态
   */
  async checkPhotosLikeStatus(photos, forceRefresh = false) {
    if (!photos || photos.length === 0) return;

    // 批量检查点赞状态
    const likeTargets = photos.map(p => ({ targetId: p._id, targetType: 'photo' }));
    const likeResults = await interaction.batchCheckStatus(likeTargets, 'like', forceRefresh);

    // 批量检查收藏状态
    const favoriteTargets = photos.map(p => ({ targetId: p._id, targetType: 'photo' }));
    const favoriteResults = await interaction.batchCheckStatus(favoriteTargets, 'favorite', forceRefresh);

    // 更新照片状态
    photos.forEach(photo => {
      photo.isLiked = likeResults[photo._id] || false;
      photo.isFavorited = favoriteResults[photo._id] || false;
    });

    // 更新瀑布流列的状态
    const { leftColumnPhotos, rightColumnPhotos } = this.data;

    leftColumnPhotos.forEach(photo => {
      photo.isLiked = likeResults[photo._id] || false;
      photo.isFavorited = favoriteResults[photo._id] || false;
    });

    rightColumnPhotos.forEach(photo => {
      photo.isLiked = likeResults[photo._id] || false;
      photo.isFavorited = favoriteResults[photo._id] || false;
    });

    // 更新页面数据
    this.setData({
      photos,
      leftColumnPhotos,
      rightColumnPhotos
    });
  },

  /**
   * 照片点赞
   */
  async onPhotoLike(e) {
    const { photoId } = e.currentTarget.dataset;
    const { photos, leftColumnPhotos, rightColumnPhotos, templateId } = this.data;

    // 找到对应的照片
    const photo = photos.find(p => p._id === photoId);
    if (!photo) return;

    const isLiked = photo.isLiked;

    // 乐观更新UI
    photo.isLiked = !isLiked;
    photo.likeCount = (photo.likeCount || 0) + (photo.isLiked ? 1 : -1);

    // 更新瀑布流中的照片
    this.updatePhotoInColumns(photo);

    this.setData({
      photos,
      leftColumnPhotos,
      rightColumnPhotos
    });

    // 调用统一接口
    const result = await interaction.toggleLike(photoId, 'photo', 'photos');

    if (result.success) {
      wx.showToast({
        title: result.isLiked ? '点赞成功' : '已取消点赞',
        icon: 'success'
      });

      // 清除照片列表缓存
      wx.removeStorageSync(`photos_cache_${templateId}`);
    } else {
      // 更新失败，回滚UI
      photo.isLiked = isLiked;
      photo.likeCount = (photo.likeCount || 0) + (isLiked ? 1 : -1);
      this.updatePhotoInColumns(photo);

      this.setData({
        photos,
        leftColumnPhotos,
        rightColumnPhotos
      });

      wx.showToast({
        title: result.message || '操作失败',
        icon: 'none'
      });
    }
  },

  /**
   * 照片收藏
   */
  async onPhotoFavorite(e) {
    const { photoId } = e.currentTarget.dataset;
    const { photos, leftColumnPhotos, rightColumnPhotos, templateId } = this.data;

    const photo = photos.find(p => p._id === photoId);
    if (!photo) return;

    const isFavorited = photo.isFavorited;

    // 乐观更新 UI
    photo.isFavorited = !isFavorited;
    photo.favoriteCount = (photo.favoriteCount || 0) + (photo.isFavorited ? 1 : -1);
    this.updatePhotoInColumns(photo);
    this.setData({
      photos,
      leftColumnPhotos,
      rightColumnPhotos
    });

    // 调用统一接口
    const result = await interaction.toggleFavorite(photoId, 'photo', 'photos');

    if (result.success) {
      wx.showToast({
        title: result.isFavorite ? '收藏成功' : '已取消收藏',
        icon: 'success'
      });

      // 清除照片列表缓存
      wx.removeStorageSync(`photos_cache_${templateId}`);
    } else {
      // 更新失败，回滚 UI
      photo.isFavorited = isFavorited;
      photo.favoriteCount = (photo.favoriteCount || 0) + (isFavorited ? 1 : -1);
      this.updatePhotoInColumns(photo);
      this.setData({
        photos,
        leftColumnPhotos,
        rightColumnPhotos
      });

      wx.showToast({
        title: result.message || '操作失败',
        icon: 'none'
      });
    }
  },

  /**
   * 长按照片举报
   */
  onPhotoLongPress(e) {
    const { photoId, photoName } = e.currentTarget.dataset;

    wx.showActionSheet({
      itemList: ['举报该照片'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.showReportDialog(photoId, 'photo', photoName);
        }
      }
    });
  },

  /**
   * 显示举报对话框
   */
  showReportDialog(targetId, targetType, targetName) {
    const reportReasons = [
      '色情低俗',
      '违法违规',
      '虚假信息',
      '侵权内容',
      '垃圾广告',
      '其他原因'
    ];

    wx.showActionSheet({
      itemList: reportReasons,
      success: async (res) => {
        const reason = reportReasons[res.tapIndex];
        await this.submitReport(targetId, targetType, targetName, reason);
      }
    });
  },

  /**
   * 提交举报
   */
  async submitReport(targetId, targetType, targetName, reason) {
    try {
      wx.showLoading({ title: '提交中...' });

      const userInfo = await app.ensureUserInfo();
      const db = getDB();
      await db.collection('reports').add({
        data: {
          targetId,
          targetType,
          targetName,
          reason,
          reporterOpenId: userInfo?.openid || '',
          reporterName: userInfo?.nickName || '匿名用户',
          status: 'pending',
          createTime: new Date(),
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '举报成功',
        icon: 'success'
      });
    } catch (err) {
      console.error('举报失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '举报失败',
        icon: 'none'
      });
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 从照片预览页返回时，强制刷新照片状态
    if (this.data.photos.length > 0) {
      console.log('[onShow] 强制刷新照片状态');
      this.checkPhotosLikeStatus(this.data.photos, true);
    }

    // 刷新模板自身的收藏和点赞状态
    if (this.data.templateId) {
      this.checkFavoriteStatus();
      this.checkLikeStatus();
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {},

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {},

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadTemplateDetail();
    // 重新加载模板详情后，会自动调用loadPhotos
    setTimeout(() => {
      this.loadPhotos();
      wx.stopPullDownRefresh();
    }, 500);
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: this.data.template?.name || '照片集模板',
      path: `/pages/template-detail/template-detail?id=${this.data.templateId}`,
      imageUrl: this.data.template?.coverImage
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: this.data.template?.name || '照片集模板',
      query: `id=${this.data.templateId}`,
      imageUrl: this.data.template?.coverImage
    };
  },

  /**
   * 删除模板
   */
  onDeleteTemplate() {
    wx.showModal({
      title: '确认删除',
      content: '删除后将无法恢复，确定要删除这个模板吗？',
      confirmText: '删除',
      confirmColor: '#FF4444',
      success: (res) => {
        if (res.confirm) {
          this.deleteTemplate();
        }
      }
    });
  },

  /**
   * 执行删除模板
   */
  async deleteTemplate() {
    const { templateId, photos } = this.data;

    wx.showLoading({ title: '检查中...' });

    try {
      const db = getDB();
      const userInfo = await app.ensureUserInfo();
      const currentOpenId = userInfo.openid || '';

      // 1. 检查是否有其他用户上传的照片
      const hasOtherUserPhotos = photos.some(photo => {
        const userId = photo.userId || '';
        return userId && userId !== currentOpenId;
      });

      if (hasOtherUserPhotos) {
        wx.hideLoading();
        wx.showModal({
          title: '无法删除',
          content: '该模板中包含其他用户上传的照片，无法删除',
          showCancel: false,
          confirmText: '知道了'
        });
        return;
      }

      wx.showLoading({ title: '删除中...' });

      // 2. 删除所有照片记录（只删除自己上传的）
      const myPhotos = photos.filter(photo => photo.userId === currentOpenId);
      if (myPhotos.length > 0) {
        const deletePromises = myPhotos.map(photo => {
          return db.collection('photos')
            .where({
              _id: photo._id,
              userId: currentOpenId
            })
            .remove();
        });
        await Promise.all(deletePromises);
        console.log(`已删除 ${myPhotos.length} 张照片记录`);
      }

      // 3. 删除模板记录
      await db.collection('templates')
        .where({
          _id: templateId,
          creatorId: currentOpenId
        })
        .remove();
      console.log('已删除模板记录');

      // 4. 清除缓存
      wx.removeStorageSync(`template_cache_${templateId}`);
      wx.removeStorageSync(`photos_cache_${templateId}`);
      console.log('已清除模板和照片缓存');

      // 设置刷新标记，返回模板列表时会自动刷新
      wx.setStorageSync('template_list_need_refresh', true);

      wx.hideLoading();
      wx.showToast({
        title: '删除成功',
        icon: 'success',
        duration: 2000
      });

      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);

    } catch (err) {
      console.error('删除模板失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: err.message || '删除失败',
        icon: 'none'
      });
    }
  }
})
