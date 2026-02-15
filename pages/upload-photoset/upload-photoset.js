// pages/upload-photoset/upload-photoset.js
const app = getApp()
const { checkImageSecurity, compressImage } = require('../../utils/util.js')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    templateId: '',
    template: null,
    title: '',
    description: '',
    photos: [], // 已选择的照片临时路径数组
    uploadedPhotos: [], // 已上传的云存储文件ID数组
    uploading: false,
    statusBarHeight: 0,
    navBarHeight: 0,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { templateId } = options;
    this.setData({
      templateId,
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    });

    this.loadTemplateInfo();
  },

  /**
   * 加载模板信息
   */
  loadTemplateInfo() {
    const db = wx.cloud.database();
    db.collection('templates')
      .doc(this.data.templateId)
      .get()
      .then(res => {
        console.log('模板信息:', res.data);
        this.setData({
          template: res.data
        });
      })
      .catch(err => {
        console.error('加载模板信息失败:', err);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      });
  },

  /**
   * 返回上一页
   */
  onBack() {
    if (this.data.photos.length > 0) {
      wx.showModal({
        title: '提示',
        content: '确定要放弃上传吗?',
        success: res => {
          if (res.confirm) {
            wx.navigateBack();
          }
        }
      });
    } else {
      wx.navigateBack();
    }
  },

  /**
   * 标题输入
   */
  onTitleInput(e) {
    this.setData({
      title: e.detail.value
    });
  },

  /**
   * 描述输入
   */
  onDescriptionInput(e) {
    this.setData({
      description: e.detail.value
    });
  },

  /**
   * 选择照片
   */
  async onChoosePhotos() {
    const { photos } = this.data;
    const remainCount = 9 - photos.length; // 最多9张

    if (remainCount <= 0) {
      wx.showToast({
        title: '最多上传9张照片',
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count: remainCount,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePaths = res.tempFilePaths;

        wx.showLoading({ title: `审核图片中 0/${tempFilePaths.length}` });

        try {
          // 逐个审核图片，必须全部通过
          for (let i = 0; i < tempFilePaths.length; i++) {
            wx.showLoading({ title: `审核图片中 ${i + 1}/${tempFilePaths.length}` });

            const checkResult = await checkImageSecurity(tempFilePaths[i]);

            if (!checkResult.success) {
              wx.hideLoading();
              wx.showModal({
                title: '图片审核失败',
                content: `第${i + 1}张图片：${checkResult.errMsg}\n\n所有图片必须通过审核才能添加，请重新选择`,
                showCancel: false
              });
              return; // 有一张不通过就全部拒绝
            }
          }

          wx.hideLoading();

          // 全部通过，添加到列表
          const newPhotos = [...photos, ...tempFilePaths];
          this.setData({
            photos: newPhotos
          });

          wx.showToast({
            title: `已添加${tempFilePaths.length}张照片`,
            icon: 'success'
          });
        } catch (err) {
          console.error('图片审核异常:', err);
          wx.hideLoading();
          wx.showToast({
            title: '图片审核失败，请重试',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('选择照片失败:', err);
      }
    });
  },

  /**
   * 删除照片
   */
  onDeletePhoto(e) {
    const { index } = e.currentTarget.dataset;
    const { photos } = this.data;

    photos.splice(index, 1);
    this.setData({ photos });
  },

  /**
   * 预览照片
   */
  onPreviewPhoto(e) {
    const { index } = e.currentTarget.dataset;
    const { photos } = this.data;

    wx.previewImage({
      current: photos[index],
      urls: photos
    });
  },

  /**
   * 上传照片集
   */
  async onSubmit() {
    const { title, description, photos, templateId, uploading } = this.data;

    // 验证表单
    if (!title.trim()) {
      wx.showToast({
        title: '请输入标题',
        icon: 'none'
      });
      return;
    }

    if (!description.trim()) {
      wx.showToast({
        title: '请输入描述',
        icon: 'none'
      });
      return;
    }

    if (photos.length === 0) {
      wx.showToast({
        title: '请至少选择一张照片',
        icon: 'none'
      });
      return;
    }

    if (uploading) return;

    this.setData({ uploading: true });
    wx.showLoading({ title: '压缩图片中...' });

    try {
      // 先压缩所有照片
      const compressedPhotos = [];
      for (let i = 0; i < photos.length; i++) {
        wx.showLoading({ title: `压缩图片 ${i + 1}/${photos.length}` });
        const compressed = await compressImage(photos[i], 85);
        compressedPhotos.push(compressed);
      }

      // 上传所有照片到云存储
      const uploadedPhotos = [];
      for (let i = 0; i < compressedPhotos.length; i++) {
        const filePath = compressedPhotos[i];
        const cloudPath = `photosets/${templateId}/${Date.now()}_${i}.jpg`;

        const uploadResult = await wx.cloud.uploadFile({
          cloudPath,
          filePath
        });

        uploadedPhotos.push(uploadResult.fileID);

        // 更新进度
        wx.showLoading({
          title: `上传中 ${i + 1}/${compressedPhotos.length}`
        });
      }

      // 获取用户信息
      const userInfo = app.globalData.userInfo || {};

      // 创建照片集记录
      const db = wx.cloud.database();
      const createResult = await db.collection('photoSets').add({
        data: {
          templateId,
          title: title.trim(),
          description: description.trim(),
          photos: uploadedPhotos,
          coverPhoto: uploadedPhotos[0], // 第一张作为封面
          userId: userInfo.openid || '',
          userName: userInfo.nickName || '匿名用户',
          userAvatar: userInfo.avatarUrl || '',
          isOfficial: false,
          status: 'approved', // 已审核通过（前置审核）
          contentCheckStatus: 'passed', // 内容审核状态：passed-通过, rejected-拒绝, pending-待审核
          contentCheckTime: db.serverDate(), // 内容审核时间
          contentCheckMethod: 'auto', // 审核方式：auto-自动审核, manual-人工审核
          viewCount: 0,
          likeCount: 0,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });

      console.log('照片集创建成功:', createResult);

      // 清除模板详情页的照片集缓存，确保新照片集能立即显示
      const cacheKey = `photosets_cache_${templateId}`;
      wx.removeStorageSync(cacheKey);
      console.log('已清除照片集缓存:', cacheKey);

      wx.hideLoading();
      wx.showToast({
        title: '提交成功',
        icon: 'success',
        duration: 2000
      });

      // 延迟返回
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);

    } catch (err) {
      console.error('上传失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      });
      this.setData({ uploading: false });
    }
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
  onPullDownRefresh() {},

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {}
})
