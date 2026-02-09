// pages/template-detail/template-detail.js
const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    templateId: '',
    template: null,
    photoSets: [],
    sortType: 'hot', // hot-热度, time-时间
    loading: false,
    statusBarHeight: 0,
    navBarHeight: 0,
    menuButtonRight: 0, // 胶囊按钮右侧距离
    defaultAvatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23E8F5E9"/%3E%3Cpath d="M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 5c-13.807 0-25 11.193-25 25v10h50V75c0-13.807-11.193-25-25-25z" fill="%233ECE79"/%3E%3C/svg%3E',
    isFavorite: false,
    isLiked: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { id } = options;
    this.setData({
      templateId: id,
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      menuButtonRight: app.globalData.menuButtonRight
    });

    this.loadTemplateDetail();
    this.loadPhotoSets();
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
      // 仍然增加观看量（如果符合条件）
      this.increaseViewCount();
      return;
    }

    // 缓存过期或不存在，从数据库加载
    console.log('从数据库加载模板数据');
    const db = wx.cloud.database();
    db.collection('templates')
      .doc(templateId)
      .get()
      .then(res => {
        console.log('模板详情:', res.data);
        this.setData({
          template: res.data
        });

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
      const db = wx.cloud.database();
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
   * 加载照片集列表
   */
  loadPhotoSets() {
    if (this.data.loading) return;

    const { templateId } = this.data;
    const cacheKey = `photosets_cache_${templateId}`;
    const cachedData = wx.getStorageSync(cacheKey);
    const now = Date.now();
    const cacheExpire = 5 * 60 * 1000; // 缓存5分钟

    // 如果有缓存且未过期，使用缓存数据
    if (cachedData && cachedData.timestamp && (now - cachedData.timestamp < cacheExpire)) {
      console.log('使用缓存的照片集列表');
      this.setData({
        photoSets: cachedData.data,
        loading: false
      });
      this.sortPhotoSets();
      return;
    }

    // 缓存过期或不存在，从数据库加载
    console.log('从数据库加载照片集列表');
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });

    const db = wx.cloud.database();
    db.collection('photoSets')
      .where({
        templateId: templateId,
        status: 'approved'
      })
      .get()
      .then(res => {
        console.log('照片集列表:', res.data);
        this.setData({
          photoSets: res.data,
          loading: false
        });

        // 保存到缓存
        wx.setStorageSync(cacheKey, {
          data: res.data,
          timestamp: now
        });

        this.sortPhotoSets();
        wx.hideLoading();
      })
      .catch(err => {
        console.error('加载照片集失败:', err);
        this.setData({ loading: false });
        wx.hideLoading();
        wx.showToast({
          title: '加载失败',
          icon: 'none'
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
    this.sortPhotoSets();
  },

  /**
   * 排序照片集列表
   */
  sortPhotoSets() {
    const { photoSets, sortType } = this.data;
    let sortedPhotoSets = [...photoSets];

    if (sortType === 'hot') {
      // 按热度排序 (点赞数 + 浏览数)
      sortedPhotoSets.sort((a, b) => {
        const hotA = (a.likeCount || 0) + (a.viewCount || 0);
        const hotB = (b.likeCount || 0) + (b.viewCount || 0);
        return hotB - hotA;
      });
    } else if (sortType === 'time') {
      // 按创建时间排序
      sortedPhotoSets.sort((a, b) => {
        const timeA = a.createTime?.$date || a.createTime || 0;
        const timeB = b.createTime?.$date || b.createTime || 0;
        return timeB - timeA;
      });
    }

    this.setData({ photoSets: sortedPhotoSets });
  },

  /**
   * 点击照片集卡片
   */
  onPhotoSetTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/photoset-detail/photoset-detail?id=${id}`
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
   * 上传照片集
   */
  onUpload() {
    const { template } = this.data;

    if (!template) {
      wx.showToast({
        title: '模板信息加载中',
        icon: 'none'
      });
      return;
    }

    if (!template.allowUserUpload) {
      wx.showToast({
        title: '该模板不允许上传',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/upload-photoset/upload-photoset?templateId=${this.data.templateId}`
    });
  },

  /**
   * 检查收藏状态
   */
  checkFavoriteStatus() {
    const favoriteTemplates = wx.getStorageSync('favoriteTemplates') || []
    const isFavorite = favoriteTemplates.includes(this.data.templateId)
    this.setData({ isFavorite })
  },

  /**
   * 检查点赞状态
   */
  checkLikeStatus() {
    const likedTemplates = wx.getStorageSync('likedTemplates') || []
    const isLiked = likedTemplates.includes(this.data.templateId)
    this.setData({ isLiked })
  },

  /**
   * 切换收藏状态
   */
  onToggleFavorite() {
    const { isFavorite, templateId, template } = this.data
    let favoriteTemplates = wx.getStorageSync('favoriteTemplates') || []

    const db = wx.cloud.database()
    const _ = db.command

    if (isFavorite) {
      // 取消收藏
      favoriteTemplates = favoriteTemplates.filter(id => id !== templateId)
      // 数据库收藏量 -1，但不能小于 0
      const currentCount = template.favoriteCount || 0
      if (currentCount > 0) {
        db.collection('templates')
          .doc(templateId)
          .update({
            data: { favoriteCount: _.inc(-1) }
          })
          .then(() => {
            console.log('收藏量-1')
            // 清除缓存并重新加载
            wx.removeStorageSync(`template_cache_${templateId}`)
            this.loadTemplateDetail()
          })
          .catch(err => {
            console.error('更新收藏量失败:', err)
          })
      } else {
        // 如果已经是 0，直接设置为 0
        db.collection('templates')
          .doc(templateId)
          .update({
            data: { favoriteCount: 0 }
          })
          .then(() => {
            console.log('收藏量设置为0')
            wx.removeStorageSync(`template_cache_${templateId}`)
            this.loadTemplateDetail()
          })
      }
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      })
    } else {
      // 添加收藏
      favoriteTemplates.push(templateId)
      // 数据库收藏量 +1
      db.collection('templates')
        .doc(templateId)
        .update({
          data: { favoriteCount: _.inc(1) }
        })
        .then(() => {
          console.log('收藏量+1')
          // 清除缓存并重新加载
          wx.removeStorageSync(`template_cache_${templateId}`)
          this.loadTemplateDetail()
        })
        .catch(err => {
          console.error('更新收藏量失败:', err)
        })
      wx.showToast({
        title: '收藏成功',
        icon: 'success'
      })
    }

    wx.setStorageSync('favoriteTemplates', favoriteTemplates)
    this.setData({ isFavorite: !isFavorite })
  },

  /**
   * 切换点赞状态
   */
  onToggleLike() {
    const { isLiked, templateId } = this.data
    let likedTemplates = wx.getStorageSync('likedTemplates') || []

    const db = wx.cloud.database()
    const _ = db.command

    if (isLiked) {
      // 取消点赞
      likedTemplates = likedTemplates.filter(id => id !== templateId)
      // 数据库点赞量 -1
      db.collection('templates')
        .doc(templateId)
        .update({
          data: { likeCount: _.inc(-1) }
        })
        .then(() => {
          console.log('点赞量-1')
          // 清除缓存并重新加载模板详情以更新点赞量显示
          wx.removeStorageSync(`template_cache_${templateId}`)
          this.loadTemplateDetail()
        })
      wx.showToast({
        title: '已取消点赞',
        icon: 'success'
      })
    } else {
      // 添加点赞
      likedTemplates.push(templateId)
      // 数据库点赞量 +1
      db.collection('templates')
        .doc(templateId)
        .update({
          data: { likeCount: _.inc(1) }
        })
        .then(() => {
          console.log('点赞量+1')
          // 清除缓存并重新加载模板详情以更新点赞量显示
          wx.removeStorageSync(`template_cache_${templateId}`)
          this.loadTemplateDetail()
        })
      wx.showToast({
        title: '点赞成功',
        icon: 'success'
      })
    }

    wx.setStorageSync('likedTemplates', likedTemplates)
    this.setData({ isLiked: !isLiked })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {},

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
    this.loadPhotoSets();
    wx.stopPullDownRefresh();
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
      path: `/pages/template-detail/template-detail?id=${this.data.templateId}`
    };
  },

  /**
   * 更新照片集列表中的单个数据（从照片集详情页返回时调用）
   */
  updatePhotoSetItem(photoSetId, updates) {
    const photoSets = this.data.photoSets;
    const index = photoSets.findIndex(item => item._id === photoSetId);
    if (index !== -1) {
      // 只更新变化的字段
      Object.assign(photoSets[index], updates);
      this.setData({
        [`photoSets[${index}]`]: photoSets[index]
      });
      console.log('已更新照片集数据:', photoSetId, updates);
    }
  }
})
