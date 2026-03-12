// pages/photo-preview/photo-preview.js
const app = getApp();
const interaction = require('../../utils/interaction.js');

function getDB() {
  return wx.cloud.database()
}

Page({
  data: {
    photos: [],
    currentIndex: 0,
    currentPhoto: {},
    showToolbar: true,
    templateId: '',
    isMyPhoto: false, // 是否是自己的照片
    defaultAvatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23E8F5E9"/%3E%3Cpath d="M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 5c-13.807 0-25 11.193-25 25v10h50V75c0-13.807-11.193-25-25-25z" fill="%233ECE79"/%3E%3C/svg%3E',
    statusBarHeight: 0
  },

  async onLoad(options) {
    const { currentIndex } = options;

    // 获取状态栏高度
    const statusBarHeight = app.globalData.statusBarHeight || 0;

    // 从缓存读取照片列表
    const photos = wx.getStorageSync('previewPhotos') || [];
    const templateId = wx.getStorageSync('previewPhotosTemplateId') || '';

    if (photos.length === 0) {
      wx.showToast({
        title: '照片数据错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    const index = parseInt(currentIndex) || 0;
    const currentPhoto = photos[index];

    // 判断是否是自己的照片
    const userInfo = await app.ensureUserInfo();
    const currentUserId = userInfo?.openid || '';
    const isMyPhoto = currentPhoto.userId === currentUserId;

    this.setData({
      photos,
      currentIndex: index,
      currentPhoto,
      templateId,
      isMyPhoto,
      statusBarHeight
    });

    // 检查照片的点赞和收藏状态
    this.checkPhotoStatus(currentPhoto._id);

    // 增加当前照片的浏览量
    this.increasePhotoViewCount(currentPhoto._id);
  },

  /**
   * 检查照片的点赞和收藏状态
   */
  async checkPhotoStatus(photoId) {
    const { photos, currentIndex } = this.data;
    const photo = photos.find(p => p._id === photoId);
    if (!photo) return;

    // 检查点赞状态
    const isLiked = await interaction.checkLikeStatus(photoId, 'photo');
    photo.isLiked = isLiked;

    // 检查收藏状态
    const isFavorited = await interaction.checkFavoriteStatus(photoId, 'photo');
    photo.isFavorited = isFavorited;

    // 更新数据
    this.setData({
      photos,
      currentPhoto: photos[currentIndex]
    });

    // 更新缓存
    wx.setStorageSync('previewPhotos', photos);
  },

  /**
   * 轮播切换
   */
  async onSwiperChange(e) {
    const index = e.detail.current;
    const currentPhoto = this.data.photos[index];

    // 判断是否是自己的照片
    const userInfo = await app.ensureUserInfo();
    const currentUserId = userInfo?.openid || '';
    const isMyPhoto = currentPhoto.userId === currentUserId;

    this.setData({
      currentIndex: index,
      currentPhoto,
      isMyPhoto
    });

    // 检查新照片的点赞和收藏状态
    this.checkPhotoStatus(currentPhoto._id);

    // 增加新照片的浏览量
    this.increasePhotoViewCount(currentPhoto._id);
  },

  /**
   * 切换工具栏显示
   */
  toggleToolbar() {
    this.setData({
      showToolbar: !this.data.showToolbar
    });
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  },

  /**
   * 点赞
   */
  async onLike() {
    const { currentPhoto, photos, currentIndex, templateId } = this.data;
    const photoId = currentPhoto._id;
    const isLiked = currentPhoto.isLiked;

    // 乐观更新UI
    currentPhoto.isLiked = !isLiked;
    currentPhoto.likeCount = (currentPhoto.likeCount || 0) + (currentPhoto.isLiked ? 1 : -1);
    photos[currentIndex] = currentPhoto;

    this.setData({
      currentPhoto,
      photos
    });

    // 更新缓存
    wx.setStorageSync('previewPhotos', photos);

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
      currentPhoto.isLiked = isLiked;
      currentPhoto.likeCount = (currentPhoto.likeCount || 0) + (isLiked ? 1 : -1);
      photos[currentIndex] = currentPhoto;

      this.setData({
        currentPhoto,
        photos
      });

      wx.setStorageSync('previewPhotos', photos);

      wx.showToast({
        title: result.message || '操作失败',
        icon: 'none'
      });
    }
  },

  /**
   * 收藏
   */
  async onFavorite() {
    const { currentPhoto, photos, currentIndex, templateId } = this.data;
    const photoId = currentPhoto._id;
    const isFavorited = currentPhoto.isFavorited;

    // 乐观更新UI
    currentPhoto.isFavorited = !isFavorited;
    currentPhoto.favoriteCount = (currentPhoto.favoriteCount || 0) + (currentPhoto.isFavorited ? 1 : -1);
    photos[currentIndex] = currentPhoto;

    this.setData({
      currentPhoto,
      photos
    });

    // 更新缓存
    wx.setStorageSync('previewPhotos', photos);

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
      // 更新失败，回滚UI
      currentPhoto.isFavorited = isFavorited;
      currentPhoto.favoriteCount = (currentPhoto.favoriteCount || 0) + (isFavorited ? 1 : -1);
      photos[currentIndex] = currentPhoto;

      this.setData({
        currentPhoto,
        photos
      });

      wx.setStorageSync('previewPhotos', photos);

      wx.showToast({
        title: result.message || '操作失败',
        icon: 'none'
      });
    }
  },

  /**
   * 举报
   */
  onReport() {
    const { currentPhoto } = this.data;
    const photoName = `${currentPhoto.userName}的照片`;

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
        await this.submitReport(currentPhoto._id, 'photo', photoName, reason);
      }
    });
  },

  /**
   * 删除照片
   */
  onDelete() {
    const { currentPhoto, photos } = this.data;

    // 如果只有一张照片，提示将删除整个模板
    if (photos.length === 1) {
      wx.showModal({
        title: '确认删除',
        content: '这是模板的最后一张照片，删除后将同时删除该模板，确定要删除吗？',
        confirmText: '删除',
        confirmColor: '#FF4444',
        success: async (res) => {
          if (res.confirm) {
            await this.deletePhotoAndTemplate(currentPhoto._id);
          }
        }
      });
    } else {
      wx.showModal({
        title: '确认删除',
        content: '删除后无法恢复，确定要删除这张照片吗？',
        confirmText: '删除',
        confirmColor: '#FF4444',
        success: async (res) => {
          if (res.confirm) {
            await this.deletePhoto(currentPhoto._id);
          }
        }
      });
    }
  },

  /**
   * 执行删除照片
   */
  async deletePhoto(photoId) {
    try {
      wx.showLoading({ title: '删除中...' });

      const db = getDB();
      const _ = db.command;

      // 调试信息
      const userInfo = await app.ensureUserInfo();
      const currentUserId = userInfo?.openid || '';
      const { currentPhoto, templateId } = this.data;
      console.log('当前用户 openid:', currentUserId);
      console.log('照片 userId:', currentPhoto.userId);
      console.log('是否匹配:', currentUserId === currentPhoto.userId);

      // 获取模板信息，检查是否删除的是封面
      const templateResult = await db.collection('templates').doc(templateId).get();
      const template = templateResult.data;
      const isCoverPhoto = template.cover === currentPhoto.photoUrl;

      console.log('是否是封面照片:', isCoverPhoto);

      // 删除照片记录 - 使用 where 查询以满足权限规则
      await db.collection('photos')
        .where({
          _id: photoId,
          userId: currentUserId
        })
        .remove();

      // 更新模板的照片数量
      await db.collection('templates').doc(templateId).update({
        data: {
          photoSetCount: _.inc(-1)
        }
      });

      console.log('照片已删除，模板照片数量已更新');

      // 如果删除的是封面，需要更新封面
      if (isCoverPhoto) {
        // 从列表中移除当前照片
        const { photos, currentIndex } = this.data;
        photos.splice(currentIndex, 1);

        // 如果还有其他照片，将第一张设为封面
        if (photos.length > 0) {
          const newCover = photos[0].photoUrl;
          await db.collection('templates').doc(templateId).update({
            data: {
              cover: newCover
            }
          });
          console.log('已更新封面为:', newCover);

          // 设置刷新标记，返回模板列表时会自动刷新
          wx.setStorageSync('template_list_need_refresh', true);

          wx.showToast({
            title: '已删除并更新封面',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      } else {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
      }

      wx.hideLoading();

      // 清除缓存
      wx.removeStorageSync(`photos_cache_${templateId}`);
      wx.removeStorageSync(`template_cache_${templateId}`);

      // 从列表中移除该照片
      const { photos, currentIndex } = this.data;
      photos.splice(currentIndex, 1);

      if (photos.length === 0) {
        // 没有照片了，返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        // 还有照片，显示下一张或上一张
        const newIndex = currentIndex >= photos.length ? photos.length - 1 : currentIndex;
        const currentPhoto = photos[newIndex];
        const userInfo = await app.ensureUserInfo();
        const currentUserId = userInfo?.openid || '';
        const isMyPhoto = currentPhoto.userId === currentUserId;

        this.setData({
          photos,
          currentIndex: newIndex,
          currentPhoto,
          isMyPhoto
        });

        // 更新缓存
        wx.setStorageSync('previewPhotos', photos);
      }
    } catch (err) {
      console.error('删除照片失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  /**
   * 删除照片和模板（当只有一张照片时）
   */
  async deletePhotoAndTemplate(photoId) {
    try {
      wx.showLoading({ title: '删除中...' });

      const db = getDB();
      const userInfo = await app.ensureUserInfo();
      const currentUserId = userInfo?.openid || '';
      const { templateId } = this.data;

      // 1. 删除照片记录
      await db.collection('photos')
        .where({
          _id: photoId,
          userId: currentUserId
        })
        .remove();

      console.log('照片已删除');

      // 2. 删除模板记录
      await db.collection('templates')
        .where({
          _id: templateId,
          creatorId: currentUserId
        })
        .remove();

      console.log('模板已删除');

      // 3. 清除缓存
      wx.removeStorageSync(`photos_cache_${templateId}`);
      wx.removeStorageSync(`template_cache_${templateId}`);

      // 4. 设置刷新标记
      wx.setStorageSync('template_list_need_refresh', true);

      wx.hideLoading();
      wx.showToast({
        title: '已删除照片和模板',
        icon: 'success',
        duration: 2000
      });

      // 延迟返回模板列表
      setTimeout(() => {
        // 返回两级，跳过模板详情页直接回到模板列表
        wx.navigateBack({
          delta: 2
        });
      }, 2000);

    } catch (err) {
      console.error('删除失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  /**
   * 增加照片浏览量（1小时内只计数一次）
   */
  increasePhotoViewCount(photoId) {
    const storageKey = `photo_view_${photoId}`;
    const lastViewTime = wx.getStorageSync(storageKey) || 0;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1小时

    // 如果距离上次观看超过1小时，才增加观看量
    if (now - lastViewTime > oneHour) {
      const db = getDB();
      const _ = db.command;

      db.collection('photos')
        .doc(photoId)
        .update({
          data: {
            viewCount: _.inc(1)
          }
        })
        .then(() => {
          console.log('照片浏览量+1');
          // 记录本次观看时间
          wx.setStorageSync(storageKey, now);

          // 更新本地数据
          const { photos, currentIndex } = this.data;
          const photo = photos.find(p => p._id === photoId);
          if (photo) {
            photo.viewCount = (photo.viewCount || 0) + 1;
            this.setData({
              photos,
              currentPhoto: photos[currentIndex]
            });
            // 更新缓存
            wx.setStorageSync('previewPhotos', photos);
          }

          // 清除照片列表缓存
          const templateId = this.data.templateId;
          if (templateId) {
            wx.removeStorageSync(`photos_cache_${templateId}`);
          }
        })
        .catch(err => {
          console.error('更新照片浏览量失败:', err);
        });
    } else {
      console.log('1小时内已观看过该照片，不重复计数');
    }
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

  onUnload() {
    // 清理缓存
    wx.removeStorageSync('previewPhotos');
    wx.removeStorageSync('previewPhotosTemplateId');
  }
});
