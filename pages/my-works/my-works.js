// pages/my-works/my-works.js
const app = getApp();
const interaction = require('../../utils/interaction.js');

function getDB() {
  return wx.cloud.database();
}

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    photos: [],
    leftColumnPhotos: [],
    rightColumnPhotos: [],
    leftHeight: 0,
    rightHeight: 0,
    loading: false,
    refreshing: false,
    userName: '',
    userAvatar: '',
    defaultAvatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23E8F5E9"/%3E%3Cpath d="M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 5c-13.807 0-25 11.193-25 25v10h50V75c0-13.807-11.193-25-25-25z" fill="%233ECE79"/%3E%3C/svg%3E'
  },

  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    });

    this.loadMyWorks();
  },

  onBack() {
    wx.navigateBack();
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadMyWorks();
  },

  async loadMyWorks() {
    const userInfo = await app.ensureUserInfo();
    if (!userInfo || !userInfo.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 设置用户信息
    this.setData({
      userName: userInfo.nickName || '我',
      userAvatar: userInfo.avatarUrl || this.data.defaultAvatar
    });

    if (!this.data.refreshing) {
      this.setData({ loading: true });
      wx.showLoading({ title: '加载中...' });
    }

    const db = getDB();

    try {
      const res = await db.collection('photos')
        .where({
          userId: userInfo.openid,
          status: 'approved'
        })
        .orderBy('createTime', 'desc')
        .get();

      // 获取照片ID列表
      const photoIds = res.data.map(p => p._id);

      // 批量查询当前用户的点赞和收藏状态
      let userLikes = [];
      let userFavorites = [];

      if (photoIds.length > 0) {
        const [likesRes, favoritesRes] = await Promise.all([
          db.collection('user_likes')
            .where({
              userId: userInfo.openid,
              targetId: db.command.in(photoIds),
              targetType: 'photo'
            })
            .get(),
          db.collection('user_favorites')
            .where({
              userId: userInfo.openid,
              targetId: db.command.in(photoIds),
              targetType: 'photo'
            })
            .get()
        ]);

        userLikes = likesRes.data.map(item => item.targetId);
        userFavorites = favoritesRes.data.map(item => item.targetId);
      }

      // 批量获取所有照片的真实宽高，并添加点赞收藏状态
      const photosWithSize = await Promise.all(
        res.data.map(async (photo) => {
          try {
            // 优先使用缩略图获取宽高（更快）
            const imageUrl = photo.thumbnailUrl || photo.photoUrl;
            const imageInfo = await wx.getImageInfo({ src: imageUrl });
            return {
              ...photo,
              width: imageInfo.width,
              height: imageInfo.height,
              isLiked: userLikes.includes(photo._id),
              isFavorited: userFavorites.includes(photo._id)
            };
          } catch (err) {
            console.error('获取图片信息失败:', photo._id, err);
            // 如果获取失败，返回原照片对象（会使用哈希估算）
            return {
              ...photo,
              isLiked: userLikes.includes(photo._id),
              isFavorited: userFavorites.includes(photo._id)
            };
          }
        })
      );

      this.setData({
        photos: photosWithSize,
        loading: false,
        refreshing: false
      }, () => {
        this.buildWaterfall(photosWithSize);
      });

      wx.hideLoading();
    } catch (err) {
      console.error('加载我的作品失败:', err);
      this.setData({
        loading: false,
        refreshing: false
      });
      wx.hideLoading();
    }
  },

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

      // 计算实际高度：使用图片的宽高比
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

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash;
    }
    return Math.abs(hash);
  },

  onPhotoTap(e) {
    const { index } = e.currentTarget.dataset;
    const { photos } = this.data;

    wx.setStorageSync('previewPhotos', photos);
    wx.setStorageSync('previewPhotosTemplateId', '');

    wx.navigateTo({
      url: `/pages/photo-preview/photo-preview?currentIndex=${index}`
    });
  },

  onDeletePhoto(e) {
    const { id, index } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确认删除这张照片吗？',
      confirmText: '删除',
      confirmColor: '#FF4444',
      success: res => {
        if (res.confirm) {
          this.deletePhoto(id, index);
        }
      }
    });
  },

  deletePhoto(photoId, index) {
    wx.showLoading({ title: '删除中...' });

    const db = getDB();
    db.collection('photos')
      .doc(photoId)
      .remove()
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });

        const { photos } = this.data;
        photos.splice(index, 1);

        // 使用智能瀑布流重新分配
        this.setData({
          photos
        }, () => {
          this.buildWaterfall(photos);
        });
      })
      .catch(err => {
        console.error('删除照片失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        });
      });
  },

  /**
   * 更新瀑布流中的照片
   */
  updatePhotoInColumns(photo) {
    const { leftColumnPhotos, rightColumnPhotos } = this.data;

    // 更新左列
    const leftIndex = leftColumnPhotos.findIndex(p => p._id === photo._id);
    if (leftIndex !== -1) {
      leftColumnPhotos[leftIndex] = { ...leftColumnPhotos[leftIndex], ...photo };
    }

    // 更新右列
    const rightIndex = rightColumnPhotos.findIndex(p => p._id === photo._id);
    if (rightIndex !== -1) {
      rightColumnPhotos[rightIndex] = { ...rightColumnPhotos[rightIndex], ...photo };
    }
  },

  /**
   * 照片点赞
   */
  async onPhotoLike(e) {
    const { photoId } = e.currentTarget.dataset;
    const { photos, leftColumnPhotos, rightColumnPhotos } = this.data;

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
    const { photos, leftColumnPhotos, rightColumnPhotos } = this.data;

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

  onShow() {
    this.loadMyWorks();
  }
});
