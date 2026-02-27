// pages/create-template/create-template.js
const app = getApp()
const { checkImageSecurity, generateThumbnail } = require('../../utils/util.js')

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,

    // 表单数据
    name: '',
    description: '',
    category: '',
    tags: [],
    photos: [], // 照片列表（1-9张）
    photoUrls: [], // 照片临时路径列表

    // 分类选项
    categoryList: [
      { label: '景区主题', value: '景区主题' },
      { label: '风格分类', value: '风格分类' },
      { label: '场景打卡', value: '场景打卡' }
    ],

    // 标签输入
    tagInput: '',

    // 提交状态
    submitting: false
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    });

    // 页面加载时立即检查并获取用户信息
    this.initUserInfo();
  },

  /**
   * 页面显示时
   */
  onShow() {
    // 每次显示页面时检查用户信息
    console.log('页面显示，当前用户信息:', app.globalData.userInfo);
  },

  /**
   * 初始化用户信息
   */
  async initUserInfo() {
    // 如果没有用户信息，立即获取
    if (!app.globalData.userInfo || !app.globalData.userInfo.openid) {
      console.log('用户信息未加载，开始获取...');
      await this.ensureUserInfo();
      console.log('用户信息获取完成:', app.globalData.userInfo);
    } else {
      console.log('用户信息已存在:', app.globalData.userInfo);
    }
  },

  /**
   * 确保用户信息已加载
   */
  async ensureUserInfo() {
    // 如果已有用户信息且有 openid，直接返回
    if (app.globalData.userInfo && app.globalData.userInfo.openid) {
      return;
    }

    // 主动调用云函数获取用户信息
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'getUserInfo',
        success: res => {
          console.log('云函数获取用户信息成功:', res.result);

          // 设置用户信息
          app.globalData.userInfo = {
            openid: res.result.openid,
            unionid: res.result.unionid,
            nickName: '微信用户',
            avatarUrl: ''
          };

          // 尝试从本地存储获取昵称和头像
          const storedUserInfo = wx.getStorageSync('userProfile');
          if (storedUserInfo) {
            app.globalData.userInfo.nickName = storedUserInfo.nickName || '微信用户';
            app.globalData.userInfo.avatarUrl = storedUserInfo.avatarUrl || '';
          }

          console.log('最终用户信息:', app.globalData.userInfo);
          resolve();
        },
        fail: err => {
          console.error('云函数获取用户信息失败:', err);

          // 设置默认用户信息
          app.globalData.userInfo = {
            openid: '',
            nickName: '微信用户',
            avatarUrl: ''
          };

          reject(err);
        }
      });
    });
  },

  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack();
  },

  /**
   * 输入模板名称
   */
  onNameInput(e) {
    this.setData({
      name: e.detail.value
    });
  },

  /**
   * 输入描述
   */
  onDescInput(e) {
    this.setData({
      description: e.detail.value
    });
  },

  /**
   * 选择分类
   */
  onCategoryChange(e) {
    this.setData({
      category: e.detail.value
    });
  },

  /**
   * 输入标签
   */
  onTagInput(e) {
    this.setData({
      tagInput: e.detail.value
    });
  },

  /**
   * 添加标签
   */
  onAddTag() {
    const { tagInput, tags } = this.data;
    if (!tagInput || tagInput.trim() === '') {
      wx.showToast({
        title: '请输入标签',
        icon: 'none'
      });
      return;
    }

    if (tags.length >= 5) {
      wx.showToast({
        title: '最多添加5个标签',
        icon: 'none'
      });
      return;
    }

    if (tags.includes(tagInput.trim())) {
      wx.showToast({
        title: '标签已存在',
        icon: 'none'
      });
      return;
    }

    this.setData({
      tags: [...tags, tagInput.trim()],
      tagInput: ''
    });
  },

  /**
   * 删除标签
   */
  onDeleteTag(e) {
    const { index } = e.currentTarget.dataset;
    const tags = [...this.data.tags];
    tags.splice(index, 1);
    this.setData({ tags });
  },

  /**
   * 选择照片（1-9张）
   */
  async onChoosePhotos() {
    const { photos } = this.data;
    const remainingCount = 9 - photos.length;

    if (remainingCount <= 0) {
      wx.showToast({
        title: '最多上传9张照片',
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: remainingCount,
      mediaType: ['image'],
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFiles = res.tempFiles;

        wx.showLoading({ title: '审核图片中...' });

        try {
          // 逐个审核图片
          for (let i = 0; i < tempFiles.length; i++) {
            const tempFilePath = tempFiles[i].tempFilePath;

            // 图片内容安全审核
            const checkResult = await checkImageSecurity(tempFilePath);

            if (!checkResult.success) {
              wx.hideLoading();
              wx.showModal({
                title: '图片审核失败',
                content: `第${i + 1}张图片: ${checkResult.errMsg}`,
                showCancel: false
              });
              return;
            }
          }

          wx.hideLoading();

          // 所有图片审核通过，添加到列表
          const newPhotos = [...photos, ...tempFiles.map(f => f.tempFilePath)];
          this.setData({
            photos: newPhotos,
            photoUrls: newPhotos
          });

          wx.showToast({
            title: '照片添加成功',
            icon: 'success'
          });
        } catch (err) {
          console.error('图片审核异常:', err);
          wx.hideLoading();
          wx.showToast({
            title: '图片审核失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 删除照片
   */
  onDeletePhoto(e) {
    const { index } = e.currentTarget.dataset;
    const photos = [...this.data.photos];
    photos.splice(index, 1);
    this.setData({
      photos: photos,
      photoUrls: photos
    });
  },

  /**
   * 表单验证
   */
  validateForm() {
    const { name, description, category, tags, photos } = this.data;

    if (!name || name.trim() === '') {
      wx.showToast({
        title: '请输入模板名称',
        icon: 'none'
      });
      return false;
    }

    if (!description || description.trim() === '') {
      wx.showToast({
        title: '请输入模板描述',
        icon: 'none'
      });
      return false;
    }

    if (!category) {
      wx.showToast({
        title: '请选择分类',
        icon: 'none'
      });
      return false;
    }

    if (tags.length === 0) {
      wx.showToast({
        title: '请至少添加一个标签',
        icon: 'none'
      });
      return false;
    }

    if (photos.length === 0) {
      wx.showToast({
        title: '请至少上传一张照片',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  /**
   * 提交创建模板
   */
  async onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    if (this.data.submitting) {
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '准备中...' });

    try {
      // 确保用户信息已加载
      await this.ensureUserInfo();

      // 再次检查用户信息
      const userInfo = app.globalData.userInfo || {};
      if (!userInfo.openid) {
        wx.hideLoading();
        wx.showModal({
          title: '提示',
          content: '获取用户信息失败，请重新进入页面',
          showCancel: false
        });
        this.setData({ submitting: false });
        return;
      }

      console.log('当前用户信息:', userInfo);

      wx.showLoading({ title: '创建中...' });

      // 1. 上传所有照片到云存储（缩略图+原图）
      const { thumbnailPaths, originalPaths } = await this.uploadPhotos();

      // 2. 保存模板数据到数据库（第一张缩略图作为封面）
      const templateId = await this.saveTemplate(thumbnailPaths, originalPaths);

      // 3. 将所有照片保存到 photos 集合
      await this.savePhotosToCollection(templateId, thumbnailPaths, originalPaths);

      // 4. 清除模板列表缓存，确保新模板能显示
      // 注意：这里不需要清除具体模板的缓存，因为是新创建的
      console.log('模板创建成功，模板ID:', templateId);

      // 设置刷新标记，返回模板列表时会自动刷新
      wx.setStorageSync('template_list_need_refresh', true);

      wx.hideLoading();
      wx.showToast({
        title: '创建成功',
        icon: 'success',
        duration: 2000
      });

      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);

    } catch (err) {
      console.error('创建模板失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: err.message || '创建失败',
        icon: 'none'
      });
      this.setData({ submitting: false });
    }
  },

  /**
   * 上传所有照片（缩略图+原图）
   */
  uploadPhotos() {
    return new Promise(async (resolve, reject) => {
      const { photos } = this.data;
      const thumbnailPaths = [];
      const originalPaths = [];

      try {
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 10000);

          // 生成缩略图
          wx.showLoading({ title: `处理照片 ${i + 1}/${photos.length}...` });
          console.log(`[模板创建] 照片${i + 1}: 开始生成缩略图，原图路径:`, photo);
          const thumbnailPath = await generateThumbnail(photo, 60);
          console.log(`[模板创建] 照片${i + 1}: 缩略图生成成功，路径:`, thumbnailPath);

          // 上传缩略图
          const thumbnailCloudPath = `templates/thumb_${timestamp}_${i}_${random}.jpg`;
          const thumbnailResult = await wx.cloud.uploadFile({
            cloudPath: thumbnailCloudPath,
            filePath: thumbnailPath
          });
          thumbnailPaths.push(thumbnailResult.fileID);
          console.log(`[模板创建] 照片${i + 1}: 缩略图上传成功, fileID:`, thumbnailResult.fileID);

          // 上传原图
          const originalCloudPath = `templates/original_${timestamp}_${i}_${random}.jpg`;
          const originalResult = await wx.cloud.uploadFile({
            cloudPath: originalCloudPath,
            filePath: photo
          });
          originalPaths.push(originalResult.fileID);
          console.log(`[模板创建] 照片${i + 1}: 原图上传成功, fileID:`, originalResult.fileID);
        }

        console.log('[模板创建] 所有照片上传完成:', {
          thumbnailCount: thumbnailPaths.length,
          originalCount: originalPaths.length,
          thumbnails: thumbnailPaths,
          originals: originalPaths
        });
        resolve({ thumbnailPaths, originalPaths });
      } catch (err) {
        console.error('上传照片失败:', err);
        reject(new Error(`照片上传失败: ${err.message}`));
      }
    });
  },

  /**
   * 保存模板到数据库
   */
  saveTemplate(thumbnailPaths, originalPaths) {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database();
      const { name, description, category, tags } = this.data;

      // 获取用户信息
      const userInfo = app.globalData.userInfo || {};

      // 第一张缩略图作为封面
      const coverThumbnail = thumbnailPaths[0];
      const coverOriginal = originalPaths[0];

      db.collection('templates').add({
        data: {
          name: name.trim(),
          description: description.trim(),
          category: category,
          tags: tags,
          cover: coverThumbnail,           // 封面使用缩略图
          coverOriginal: coverOriginal,    // 封面原图
          thumbnails: thumbnailPaths,      // 所有缩略图
          photos: originalPaths,           // 所有原图
          isOfficial: false,
          allowUserUpload: true,
          status: 'approved', // 已审核通过（前置审核）
          coverCheckStatus: 'passed', // 封面审核状态：passed-通过, rejected-拒绝, pending-待审核
          coverCheckTime: db.serverDate(), // 封面审核时间
          coverCheckMethod: 'auto', // 审核方式：auto-自动审核, manual-人工审核
          likeCount: 0,
          photoSetCount: originalPaths.length, // 设置照片数量
          sortOrder: 0, // 排序字段：0表示按热度排序
          sort: 999,
          creatorId: userInfo.openid || '',
          creatorName: userInfo.nickName || '微信用户',
          createTime: Date.now(),
          updateTime: Date.now()
        },
        success: (res) => {
          console.log('模板保存成功:', res._id);
          resolve(res._id);
        },
        fail: (err) => {
          console.error('模板保存失败:', err);
          reject(new Error('模板保存失败'));
        }
      });
    });
  },

  /**
   * 将照片保存到 photos 集合
   */
  savePhotosToCollection(templateId, thumbnailPaths, originalPaths) {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database();
      const userInfo = app.globalData.userInfo || {};
      const { name: templateName } = this.data;

      console.log('保存照片时的用户信息:', userInfo);

      // 为每张照片创建一条记录
      const photoPromises = originalPaths.map((photoUrl, index) => {
        return db.collection('photos').add({
          data: {
            templateId: templateId,
            thumbnailUrl: thumbnailPaths[index],  // 缩略图URL
            photoUrl: photoUrl,                    // 原图URL
            photoName: `${templateName}-照片${index + 1}`,
            userId: userInfo.openid || '',
            userName: userInfo.nickName || '微信用户',
            userAvatar: userInfo.avatarUrl || '',
            isOfficial: false,
            status: 'approved', // 已审核通过（前置审核）
            checkStatus: 'passed',
            checkTime: db.serverDate(),
            checkMethod: 'auto',
            likeCount: 0,
            favoriteCount: 0,
            viewCount: 0,
            sortOrder: 0, // 排序字段：0表示按热度排序
            createTime: Date.now()
          }
        });
      });

      Promise.all(photoPromises)
        .then(() => {
          console.log('所有照片已保存到 photos 集合');
          resolve();
        })
        .catch(err => {
          console.error('保存照片到 photos 集合失败:', err);
          reject(new Error('保存照片失败'));
        });
    });
  }
});
