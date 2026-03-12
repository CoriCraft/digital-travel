// pages/my-likes/my-likes.js
const app = getApp();
const interaction = require('../../utils/interaction.js');

function getDB() {
  return wx.cloud.database();
}

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    currentTab: 0,
    templates: [],
    photos: [],
    loading: false,
    refreshing: false,
    defaultAvatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23E8F5E9"/%3E%3Cpath d="M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 5c-13.807 0-25 11.193-25 25v10h50V75c0-13.807-11.193-25-25-25z" fill="%233ECE79"/%3E%3C/svg%3E'
  },

  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    });

    this.loadLikes();
  },

  onBack() {
    wx.navigateBack();
  },

  onTabChange(e) {
    const { index } = e.currentTarget.dataset;
    this.setData({ currentTab: index });
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadLikes();
  },

  async loadLikes() {
    try {
      const userInfo = await app.ensureUserInfo();
      if (!userInfo || !userInfo.openid) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      if (!this.data.refreshing) {
        this.setData({ loading: true });
        wx.showLoading({ title: '加载中...' });
      }

      const db = getDB();
      const { data: likes } = await db.collection('user_likes')
        .where({
          userId: userInfo.openid
        })
        .orderBy('createTime', 'desc')
        .get();

      const templateIds = [];
      const photoIds = [];

      likes.forEach(item => {
        switch (item.targetType) {
          case 'template':
            templateIds.push(item.targetId);
            break;
          case 'photo':
            photoIds.push(item.targetId);
            break;
        }
      });

      await Promise.all([
        this.loadTemplates(templateIds),
        this.loadPhotos(photoIds)
      ]);

      this.setData({
        loading: false,
        refreshing: false
      });
      wx.hideLoading();
    } catch (error) {
      console.error('加载喜欢失败:', error);
      this.setData({
        loading: false,
        refreshing: false
      });
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  async loadTemplates(ids) {
    if (ids.length === 0) {
      this.setData({ templates: [] });
      return;
    }

    try {
      const userInfo = await app.ensureUserInfo();
      const db = getDB();
      const { data } = await db.collection('templates')
        .where({
          _id: db.command.in(ids)
        })
        .get();

      // 查询当前用户的收藏状态
      if (userInfo && userInfo.openid && data.length > 0) {
        const templateIds = data.map(t => t._id);
        const { data: favorites } = await db.collection('user_favorites')
          .where({
            userId: userInfo.openid,
            targetId: db.command.in(templateIds),
            targetType: 'template'
          })
          .get();

        const favoritedIds = favorites.map(item => item.targetId);
        data.forEach(template => {
          template.isFavorited = favoritedIds.includes(template._id);
        });
      }

      this.setData({ templates: data });
    } catch (error) {
      console.error('加载模板喜欢失败:', error);
      this.setData({ templates: [] });
    }
  },

  async loadPhotos(ids) {
    if (ids.length === 0) {
      this.setData({ photos: [] });
      return;
    }

    try {
      const db = getDB();
      const { data } = await db.collection('photos')
        .where({
          _id: db.command.in(ids)
        })
        .get();

      this.setData({ photos: data });
    } catch (error) {
      console.error('加载照片喜欢失败:', error);
      this.setData({ photos: [] });
    }
  },

  onTemplateTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/template-detail/template-detail?id=${id}`
    });
  },

  async onUnlikeTemplate(e) {
    const { id, index } = e.currentTarget.dataset;
    const res = await wx.showModal({
      title: '取消喜欢',
      content: '确认取消喜欢这个模板吗？'
    });

    if (!res.confirm) {
      return;
    }

    try {
      wx.showLoading({ title: '处理中...' });
      const result = await interaction.toggleLike(id, 'template', 'templates');

      if (result.success) {
        const templates = this.data.templates;
        templates.splice(index, 1);
        this.setData({ templates });
        wx.removeStorageSync(`template_cache_${id}`);

        wx.hideLoading();
        wx.showToast({
          title: '已取消喜欢',
          icon: 'success'
        });
        return;
      }

      wx.hideLoading();
      wx.showToast({
        title: result.message || '操作失败',
        icon: 'none'
      });
    } catch (error) {
      console.error('取消模板喜欢失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  onPhotoTap(e) {
    const { index } = e.currentTarget.dataset;
    const photos = this.data.photos.map(p => ({
      ...p,
      isLiked: true
    }));
    wx.setStorageSync('previewPhotos', photos);
    wx.setStorageSync('previewPhotosTemplateId', '');
    wx.navigateTo({
      url: `/pages/photo-preview/photo-preview?currentIndex=${index}`
    });
  },

  async onUnlikePhoto(e) {
    const { id, index } = e.currentTarget.dataset;
    const res = await wx.showModal({
      title: '取消喜欢',
      content: '确认取消喜欢这张照片吗？'
    });

    if (!res.confirm) {
      return;
    }

    try {
      wx.showLoading({ title: '处理中...' });
      const currentPhoto = this.data.photos[index];
      const result = await interaction.toggleLike(id, 'photo', 'photos');

      if (result.success) {
        const photos = this.data.photos;
        photos.splice(index, 1);
        this.setData({ photos });

        if (currentPhoto && currentPhoto.templateId) {
          wx.removeStorageSync(`photos_cache_${currentPhoto.templateId}`);
        }

        wx.hideLoading();
        wx.showToast({
          title: '已取消喜欢',
          icon: 'success'
        });
        return;
      }

      wx.hideLoading();
      wx.showToast({
        title: result.message || '操作失败',
        icon: 'none'
      });
    } catch (error) {
      console.error('取消照片喜欢失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  onShow() {
    this.loadLikes();
  }
});
