// pages/location-detail/location-detail.js
const app = getApp()
const db = wx.cloud.database()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    locationId: '',
    location: null,
    loading: true,
    reviews: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      locationId: options.id
    });

    if (options.id) {
      this.loadLocationDetail(options.id);
      this.loadReviews(options.id);
    }
  },

  /**
   * 加载地点详情
   */
  async loadLocationDetail(id) {
    try {
      this.setData({ loading: true });

      const { data } = await db.collection('locations')
        .doc(id)
        .get();

      if (!data) {
        wx.showToast({
          title: '地点不存在',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }

      // 转换云存储路径
      if (data.coverImage && data.coverImage.startsWith('cloud://')) {
        const result = await wx.cloud.getTempFileURL({
          fileList: [data.coverImage]
        });
        if (result.fileList[0].status === 0) {
          data.coverImage = result.fileList[0].tempFileURL;
        }
      }

      this.setData({
        location: data,
        loading: false
      });
    } catch (error) {
      console.error('加载地点详情失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack();
  },

  /**
   * 打卡
   */
  async onCheckIn() {
    try {
      // 检查用户是否登录
      const userInfo = app.globalData.userInfo;
      if (!userInfo || !userInfo.openid) {
        wx.showModal({
          title: '提示',
          content: '请先登录后再打卡',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/user-info/user-info'
              });
            }
          }
        });
        return;
      }

      wx.showLoading({ title: '打卡中...' });

      // 检查是否已经打卡过
      const checkResult = await db.collection('check_ins')
        .where({
          locationId: this.data.locationId,
          userId: userInfo.openid
        })
        .get();

      if (checkResult.data.length > 0) {
        wx.hideLoading();
        wx.showToast({
          title: '您已经打卡过了',
          icon: 'none'
        });
        return;
      }

      // 创建打卡记录
      await db.collection('check_ins').add({
        data: {
          locationId: this.data.locationId,
          locationName: this.data.location.name,
          userId: userInfo.openid,
          userName: userInfo.nickName || '匿名用户',
          userAvatar: userInfo.avatarUrl || '',
          checkInTime: db.serverDate(),
          createTime: db.serverDate()
        }
      });

      // 更新地点的打卡次数
      await db.collection('locations')
        .doc(this.data.locationId)
        .update({
          data: {
            checkInCount: db.command.inc(1)
          }
        });

      // 更新本地数据
      this.setData({
        'location.checkInCount': (this.data.location.checkInCount || 0) + 1
      });

      wx.hideLoading();
      wx.showToast({
        title: '打卡成功！',
        icon: 'success'
      });
    } catch (error) {
      console.error('打卡失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '打卡失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 分享
   */
  onShare() {
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    });
  },

  /**
   * 导航
   */
  onNavigate() {
    const location = this.data.location;
    if (!location || !location.latitude || !location.longitude) {
      wx.showToast({
        title: '暂无位置信息',
        icon: 'none'
      });
      return;
    }

    wx.openLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      name: location.name,
      address: location.address,
      scale: 15
    });
  },

  /**
   * 加载评论列表
   */
  async loadReviews(locationId) {
    try {
      const { data } = await db.collection('location_reviews')
        .where({ locationId })
        .orderBy('createTime', 'desc')
        .limit(20)
        .get();

      // 格式化时间
      data.forEach(item => {
        if (item.createTime) {
          const date = new Date(item.createTime);
          const now = new Date();
          const diff = now - date;
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));

          if (days === 0) {
            item.createTime = '今天';
          } else if (days === 1) {
            item.createTime = '昨天';
          } else if (days < 7) {
            item.createTime = `${days}天前`;
          } else {
            item.createTime = `${date.getMonth() + 1}-${date.getDate()}`;
          }
        }
      });

      this.setData({ reviews: data });
    } catch (error) {
      console.error('加载评论失败:', error);
    }
  },

  /**
   * 写评价
   */
  onWriteReview() {
    const userInfo = app.globalData.userInfo;
    if (!userInfo || !userInfo.openid) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再评价',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/user-info/user-info'
            });
          }
        }
      });
      return;
    }

    // 跳转到写评价页面
    wx.navigateTo({
      url: `/pages/write-review/write-review?locationId=${this.data.locationId}&locationName=${this.data.location.name}`
    });
  }
})
