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
    defaultAvatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23E8F5E9"/%3E%3Cpath d="M50 45c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm0 5c-13.807 0-25 11.193-25 25v10h50V75c0-13.807-11.193-25-25-25z" fill="%233ECE79"/%3E%3C/svg%3E'
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { id } = options;
    this.setData({
      templateId: id,
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight
    });

    this.loadTemplateDetail();
    this.loadPhotoSets();
  },

  /**
   * 加载模板详情
   */
  loadTemplateDetail() {
    const db = wx.cloud.database();
    db.collection('templates')
      .doc(this.data.templateId)
      .get()
      .then(res => {
        console.log('模板详情:', res.data);
        this.setData({
          template: res.data
        });
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
   * 加载照片集列表
   */
  loadPhotoSets() {
    if (this.data.loading) return;

    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });

    const db = wx.cloud.database();
    db.collection('photoSets')
      .where({
        templateId: this.data.templateId,
        status: 'approved'
      })
      .get()
      .then(res => {
        console.log('照片集列表:', res.data);
        this.setData({
          photoSets: res.data,
          loading: false
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
  }
})
