// pages/write-review/write-review.js
const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    type: 'location', // location 或 goods
    locationId: '',
    locationName: '',
    goodsId: '',
    goodsName: '',
    rating: 5,
    content: ''
  },

  onLoad(options) {
    const { type = 'location', locationId, locationName, goodsId, goodsName } = options;

    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      type,
      locationId,
      locationName,
      goodsId,
      goodsName
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
    const content = this.data.content.trim();

    if (!content) {
      wx.showToast({
        title: '请输入评价内容',
        icon: 'none'
      });
      return;
    }

    try {
      // 第一步：内容安全检测
      wx.showLoading({ title: '检测中...', mask: true });

      const checkResult = await wx.cloud.callFunction({
        name: 'checkContentSecurity',
        data: { content }
      });

      const { success, isSafe, message } = checkResult.result;

      if (!success) {
        // 检测接口调用失败
        wx.hideLoading();
        wx.showToast({
          title: message || '检测失败，请重试',
          icon: 'none'
        });
        return;
      }

      if (!isSafe) {
        // 内容违规
        wx.hideLoading();
        wx.showModal({
          title: '内容违规',
          content: message || '您的评价包含敏感信息，请修改后重试',
          showCancel: false
        });
        return;
      }

      // 第二步：内容安全，提交评价
      wx.showLoading({ title: '提交中...', mask: true });

      const userInfo = app.globalData.userInfo;

      if (this.data.type === 'goods') {
        // 创建商品评论
        await db.collection('goods_reviews').add({
          data: {
            goodsId: this.data.goodsId,
            goodsName: this.data.goodsName,
            userId: userInfo.openid,
            userName: userInfo.nickName || '匿名用户',
            userAvatar: userInfo.avatarUrl || '',
            rating: this.data.rating,
            content: content,
            status: 'approved',
            createTime: db.serverDate()
          }
        });

        // 更新商品的评论数
        await db.collection('goods')
          .doc(this.data.goodsId)
          .update({
            data: {
              reviewCount: db.command.inc(1)
            }
          });
      } else {
        // 创建地点评论
        await db.collection('location_reviews').add({
          data: {
            locationId: this.data.locationId,
            locationName: this.data.locationName,
            userId: userInfo.openid,
            userName: userInfo.nickName || '匿名用户',
            userAvatar: userInfo.avatarUrl || '',
            rating: this.data.rating,
            content: content,
            status: 'approved',
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
      }

      wx.hideLoading();   wx.showToast({
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
