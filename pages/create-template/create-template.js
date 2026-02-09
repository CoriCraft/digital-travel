// pages/create-template/create-template.js
const app = getApp()

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,

    // 表单数据
    name: '',
    description: '',
    category: '',
    tags: [],
    coverImage: '',
    coverImageUrl: '',

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
   * 选择封面图片
   */
  onChooseCover() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFile = res.tempFiles[0];
        this.setData({
          coverImage: tempFile.tempFilePath,
          coverImageUrl: tempFile.tempFilePath
        });
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
   * 删除封面图片
   */
  onDeleteCover() {
    this.setData({
      coverImage: '',
      coverImageUrl: ''
    });
  },

  /**
   * 表单验证
   */
  validateForm() {
    const { name, description, category, tags, coverImage } = this.data;

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

    if (!coverImage) {
      wx.showToast({
        title: '请上传封面图片',
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
    wx.showLoading({ title: '创建中...' });

    try {
      // 1. 上传封面图片到云存储
      const coverCloudPath = await this.uploadCoverImage();

      // 2. 保存模板数据到数据库
      await this.saveTemplate(coverCloudPath);

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
   * 上传封面图片
   */
  uploadCoverImage() {
    return new Promise((resolve, reject) => {
      const { coverImage } = this.data;
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const cloudPath = `templates/user-template-${timestamp}-${random}.jpg`;

      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: coverImage,
        success: (res) => {
          console.log('封面上传成功:', res.fileID);
          resolve(res.fileID);
        },
        fail: (err) => {
          console.error('封面上传失败:', err);
          reject(new Error('封面上传失败'));
        }
      });
    });
  },

  /**
   * 保存模板到数据库
   */
  saveTemplate(coverCloudPath) {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database();
      const { name, description, category, tags } = this.data;

      // 获取用户信息
      const userInfo = app.globalData.userInfo || {};

      db.collection('templates').add({
        data: {
          name: name.trim(),
          description: description.trim(),
          category: category,
          tags: tags,
          cover: coverCloudPath,
          isOfficial: false,
          allowUserUpload: true,
          status: 'pending', // 待审核
          likeCount: 0,
          photoSetCount: 0,
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
  }
});
