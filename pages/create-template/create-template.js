// pages/create-template/create-template.js
const app = getApp();
const { checkImageSecurity, generateThumbnail } = require('../../utils/util.js');

function getDB() {
  return wx.cloud.database();
}

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    name: '',
    description: '',
    category: '',
    tags: [],
    photos: [],
    photoUrls: [],
    categoryList: [
      { label: '文旅打卡', value: '文旅打卡' },
      { label: '自然风光', value: '自然风光' },
      { label: '人文体验', value: '人文体验' }
    ],
    tagInput: '',
    submitting: false
  },

  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    });

    this.initUserInfo();
  },

  onShow() {
    console.log('页面显示，当前用户信息:', app.globalData.userInfo);
  },

  async initUserInfo() {
    const userInfo = await app.ensureUserInfo();
    console.log('创建模板页用户信息已就绪:', userInfo);
  },

  async ensureUserInfo() {
    return app.ensureUserInfo();
  },

  onBack() {
    wx.navigateBack();
  },

  onNameInput(e) {
    this.setData({
      name: e.detail.value
    });
  },

  onDescInput(e) {
    this.setData({
      description: e.detail.value
    });
  },

  onCategoryChange(e) {
    this.setData({
      category: e.detail.value
    });
  },

  onTagInput(e) {
    this.setData({
      tagInput: e.detail.value
    });
  },

  onAddTag() {
    const { tagInput, tags } = this.data;
    const tag = tagInput.trim();

    if (!tag) {
      wx.showToast({
        title: '请输入标签',
        icon: 'none'
      });
      return;
    }

    if (tags.length >= 5) {
      wx.showToast({
        title: '最多添加 5 个标签',
        icon: 'none'
      });
      return;
    }

    if (tags.includes(tag)) {
      wx.showToast({
        title: '标签已存在',
        icon: 'none'
      });
      return;
    }

    this.setData({
      tags: [...tags, tag],
      tagInput: ''
    });
  },

  onDeleteTag(e) {
    const { index } = e.currentTarget.dataset;
    const tags = [...this.data.tags];
    tags.splice(index, 1);
    this.setData({ tags });
  },

  async onChoosePhotos() {
    const { photos } = this.data;
    const remainingCount = 9 - photos.length;

    if (remainingCount <= 0) {
      wx.showToast({
        title: '最多上传 9 张照片',
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: remainingCount,
      mediaType: ['image'],
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: async res => {
        const tempFiles = res.tempFiles;
        wx.showLoading({ title: '图片检测中...' });

        try {
          for (let i = 0; i < tempFiles.length; i++) {
            const checkResult = await checkImageSecurity(tempFiles[i].tempFilePath);
            if (!checkResult.success) {
              wx.hideLoading();
              wx.showModal({
                title: '图片检测失败',
                content: `第 ${i + 1} 张图片未通过检测：${checkResult.errMsg}`,
                showCancel: false
              });
              return;
            }
          }

          const newPhotos = [...photos, ...tempFiles.map(file => file.tempFilePath)];
          this.setData({
            photos: newPhotos,
            photoUrls: newPhotos
          });

          wx.hideLoading();
          wx.showToast({
            title: '照片添加成功',
            icon: 'success'
          });
        } catch (err) {
          console.error('图片检测失败:', err);
          wx.hideLoading();
          wx.showToast({
            title: '图片检测失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  onDeletePhoto(e) {
    const { index } = e.currentTarget.dataset;
    const photos = [...this.data.photos];
    photos.splice(index, 1);
    this.setData({
      photos,
      photoUrls: photos
    });
  },

  validateForm() {
    const { name, description, category, tags, photos } = this.data;

    if (!name.trim()) {
      wx.showToast({
        title: '请输入模板名称',
        icon: 'none'
      });
      return false;
    }

    if (!description.trim()) {
      wx.showToast({
        title: '请输入模板描述',
        icon: 'none'
      });
      return false;
    }

    if (!category) {
      wx.showToast({
        title: '请选择模板分类',
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

  async onSubmit() {
    if (!this.validateForm() || this.data.submitting) {
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      const userInfo = await app.ensureUserInfo();
      if (!userInfo || !userInfo.openid) {
        throw new Error('用户信息获取失败');
      }

      const { thumbnailPaths, originalPaths } = await this.uploadPhotos();
      const templateId = await this.saveTemplate(userInfo, thumbnailPaths, originalPaths);
      await this.savePhotosToCollection(userInfo, templateId, thumbnailPaths, originalPaths);

      wx.setStorageSync('template_list_need_refresh', true);

      wx.hideLoading();
      wx.showToast({
        title: '创建成功',
        icon: 'success',
        duration: 2000
      });

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

  async uploadPhotos() {
    const { photos } = this.data;
    const thumbnailPaths = [];
    const originalPaths = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);

      wx.showLoading({ title: `上传照片 ${i + 1}/${photos.length}...` });

      const thumbnailPath = await generateThumbnail(photo, 60);
      const thumbnailCloudPath = `templates/thumb_${timestamp}_${i}_${random}.jpg`;
      const thumbnailResult = await wx.cloud.uploadFile({
        cloudPath: thumbnailCloudPath,
        filePath: thumbnailPath
      });
      thumbnailPaths.push(thumbnailResult.fileID);

      const originalCloudPath = `templates/original_${timestamp}_${i}_${random}.jpg`;
      const originalResult = await wx.cloud.uploadFile({
        cloudPath: originalCloudPath,
        filePath: photo
      });
      originalPaths.push(originalResult.fileID);
    }

    return { thumbnailPaths, originalPaths };
  },

  async saveTemplate(userInfo, thumbnailPaths, originalPaths) {
    const db = getDB();
    const { name, description, category, tags } = this.data;

    const result = await db.collection('templates').add({
      data: {
        name: name.trim(),
        description: description.trim(),
        category,
        tags,
        cover: thumbnailPaths[0],
        coverOriginal: originalPaths[0],
        thumbnails: thumbnailPaths,
        photos: originalPaths,
        isOfficial: false,
        allowUserUpload: true,
        status: 'approved',
        coverCheckStatus: 'passed',
        coverCheckTime: db.serverDate(),
        coverCheckMethod: 'auto',
        likeCount: 0,
        photoSetCount: originalPaths.length,
        sortOrder: 0,
        sort: 999,
        creatorId: userInfo.openid,
        creatorName: userInfo.nickName || '微信用户',
        createTime: Date.now(),
        updateTime: Date.now()
      }
    });

    return result._id;
  },

  async savePhotosToCollection(userInfo, templateId, thumbnailPaths, originalPaths) {
    const db = getDB();
    const { name: templateName } = this.data;

    const tasks = originalPaths.map((photoUrl, index) => {
      return db.collection('photos').add({
        data: {
          templateId,
          thumbnailUrl: thumbnailPaths[index],
          photoUrl,
          photoName: `${templateName}-照片${index + 1}`,
          userId: userInfo.openid,
          userName: userInfo.nickName || '微信用户',
          userAvatar: userInfo.avatarUrl || '',
          isOfficial: false,
          status: 'approved',
          checkStatus: 'passed',
          checkTime: db.serverDate(),
          checkMethod: 'auto',
          likeCount: 0,
          favoriteCount: 0,
          viewCount: 0,
          sortOrder: 0,
          createTime: Date.now()
        }
      });
    });

    await Promise.all(tasks);
  }
});
