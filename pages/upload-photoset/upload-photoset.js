// pages/upload-photoset/upload-photoset.js
const app = getApp()
const { checkImageSecurity, generateThumbnail } = require('../../utils/util.js')

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
    photo: '', // 单张照片临时路径
    photoUrl: '', // 照片预览URL
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
    const db = getDB();
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
    if (this.data.photo) {
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
   * 选择照片
   */
  async onChoosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFile = res.tempFiles[0];
        const tempFilePath = tempFile.tempFilePath;

        wx.showLoading({ title: '审核图片中...' });

        try {
          // 图片内容安全审核
          const checkResult = await checkImageSecurity(tempFilePath);

          wx.hideLoading();

          if (!checkResult.success) {
            wx.showModal({
              title: '图片审核失败',
              content: checkResult.errMsg,
              showCancel: false
            });
            return;
          }

          // 审核通过，设置照片
          this.setData({
            photo: tempFilePath,
            photoUrl: tempFilePath
          });

          wx.showToast({
            title: '照片选择成功',
            icon: 'success'
          });
        } catch (err) {
          console.error('图片审核异常:', err);
          wx.hideLoading();
          wx.showModal({
            title: '审核异常',
            content: '图片审核服务暂时不可用，请稍后重试',
            showCancel: false
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
  onDeletePhoto() {
    this.setData({
      photo: '',
      photoUrl: ''
    });
  },

  /**
   * 上传照片
   */
  async onSubmit() {
    const { photo, templateId, uploading } = this.data;

    // 验证表单
    if (!photo) {
      wx.showToast({
        title: '请选择照片',
        icon: 'none'
      });
      return;
    }

    if (uploading) return;

    this.setData({ uploading: true });

    try {
      // 1. 生成缩略图
      wx.showLoading({ title: '生成缩略图...' });
      console.log('[照片上传] 开始生成缩略图，原图路径:', photo);
      const thumbnailPath = await generateThumbnail(photo, 60);
      console.log('[照片上传] 缩略图生成成功，路径:', thumbnailPath);

      // 2. 上传缩略图到云存储
      wx.showLoading({ title: '上传缩略图...' });
      const thumbnailCloudPath = `photos/${templateId}/thumb_${Date.now()}.jpg`;
      const thumbnailResult = await wx.cloud.uploadFile({
        cloudPath: thumbnailCloudPath,
        filePath: thumbnailPath
      });
      console.log('[照片上传] 缩略图上传成功，fileID:', thumbnailResult.fileID);

      // 3. 上传原图到云存储
      wx.showLoading({ title: '上传原图...' });
      const originalCloudPath = `photos/${templateId}/original_${Date.now()}.jpg`;
      const originalResult = await wx.cloud.uploadFile({
        cloudPath: originalCloudPath,
        filePath: photo
      });
      console.log('[照片上传] 原图上传成功，fileID:', originalResult.fileID);

      // 获取用户信息
      const userInfo = app.globalData.userInfo || {};

      // 创建照片记录（保存缩略图和原图两个URL）
      const db = getDB();
      const _ = db.command;
      const createResult = await db.collection('photos').add({
        data: {
          templateId,
          thumbnailUrl: thumbnailResult.fileID,  // 缩略图URL
          photoUrl: originalResult.fileID,        // 原图URL
          userId: userInfo.openid || '',
          userName: userInfo.nickName || '匿名用户',
          userAvatar: userInfo.avatarUrl || '',
          isOfficial: false,
          status: 'approved', // 已审核通过（前置审核）
          contentCheckStatus: 'passed',
          contentCheckTime: db.serverDate(),
          contentCheckMethod: 'auto',
          viewCount: 0,
          likeCount: 0,
          favoriteCount: 0,
          sortOrder: 0, // 排序字段：0表示按热度排序
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });

      console.log('[照片上传] 照片记录创建成功:', {
        _id: createResult._id,
        thumbnailUrl: thumbnailResult.fileID,
        photoUrl: originalResult.fileID
      });

      // 更新模板的照片数量
      await db.collection('templates').doc(templateId).update({
        data: {
          photoSetCount: _.inc(1)
        }
      });

      console.log('模板照片数量已更新');

      // 清除照片列表缓存
      wx.removeStorageSync(`photos_cache_${templateId}`);

      wx.hideLoading();
      wx.showToast({
        title: '上传成功',
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
