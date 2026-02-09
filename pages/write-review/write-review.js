// pages/write-review/write-review.js
const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    locationId: '',
    locationName: '',
    rating: 5,
    content: ''
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      locationId: options.locationId,
      locationName: options.locationName
    });
  },

  onBack() {
    wx.navigateBack();
  },

  onRatingChange(e) {
    this.setData({
      rating: e.currentTarget.dataset.rating
    });
  },

  onContentInput(e) {
    this.setData({
      content: e.detail.value
    });
  },

  async onSubmit() {
    if (!this.data.content.trim()) {
      wx.showToast({
        title: '请输入评价内容',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '提交中...' });

      const userInfo = app.globalData.userInfo;

      // 创建评论
      await db.collection('location_reviews').add({
        data: {
          locationId: this.data.locationId,
          locationName: this.data.locationName,
          userId: userInfo.openid,
          userName: userInfo.nickName || '匿名用户',
          userAvatar: userInfo.avatarUrl || '',
          rating: this.data.rating,
          content: this.data.content.trim(),
          createTime: db.serverDate()
        }
      });

      // 更新地点的评分和评论数
      await db.collection('locations')
        .doc(this.data.locationId)
        .update({
          data: {
            ratingCount: db.command.inc(1)
          }
        });

      wx.hideLoading();
      wx.showToast({
        title: '评价成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('提交评价失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      });
    }
  }
})
