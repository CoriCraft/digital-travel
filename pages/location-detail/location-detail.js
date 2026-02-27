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
    reviews: [],
    hasCheckedIn: false, // 是否已打卡
    isFavorite: false, // 是否已收藏
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
      this.checkCheckInStatus(options.id);
      this.checkFavoriteStatus(options.id);
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
   * 检查收藏状态
   */
  checkFavoriteStatus(locationId) {
    const favoriteLocations = wx.getStorageSync('favoriteLocations') || [];
    const isFavorite = favoriteLocations.includes(locationId);
    this.setData({ isFavorite });
  },

  /**
   * 切换收藏状态
   */
  onToggleFavorite() {
    const { isFavorite, locationId, location } = this.data;
    let favoriteLocations = wx.getStorageSync('favoriteLocations') || [];

    const db = wx.cloud.database();
    const _ = db.command;

    if (isFavorite) {
      // 取消收藏
      favoriteLocations = favoriteLocations.filter(id => id !== locationId);
      // 数据库收藏量 -1
      const currentCount = location.favoriteCount || 0;
      if (currentCount > 0) {
        db.collection('locations')
          .doc(locationId)
          .update({
            data: { favoriteCount: _.inc(-1) }
          })
          .then(() => {
            console.log('收藏量-1');
            this.setData({
              'location.favoriteCount': currentCount - 1
            });
          })
          .catch(err => {
            console.error('更新收藏量失败:', err);
          });
      }
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      });
    } else {
      // 添加收藏
      favoriteLocations.push(locationId);
      // 数据库收藏量 +1
      db.collection('locations')
        .doc(locationId)
        .update({
          data: { favoriteCount: _.inc(1) }
        })
        .then(() => {
          console.log('收藏量+1');
          this.setData({
            'location.favoriteCount': (location.favoriteCount || 0) + 1
          });
        })
        .catch(err => {
          console.error('更新收藏量失败:', err);
        });
      wx.showToast({
        title: '收藏成功',
        icon: 'success'
      });
    }

    wx.setStorageSync('favoriteLocations', favoriteLocations);
    this.setData({ isFavorite: !isFavorite });
  },

  /**
   * 检查打卡状态
   */
  async checkCheckInStatus(locationId) {
    try {
      const userInfo = app.globalData.userInfo;
      if (!userInfo || !userInfo.openid) {
        return;
      }

      const { data } = await db.collection('check_ins')
        .where({
          locationId: locationId,
          userId: userInfo.openid
        })
        .get();

      this.setData({
        hasCheckedIn: data.length > 0
      });
    } catch (error) {
      console.error('检查打卡状态失败:', error);
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

      wx.showLoading({ title: '定位中...' });

      // 获取用户当前位置
      const locationRes = await wx.getLocation({
        type: 'gcj02'
      });

      wx.hideLoading();

      // 计算距离（单位：米）
      const distance = this.calculateDistance(
        locationRes.latitude,
        locationRes.longitude,
        this.data.location.latitude,
        this.data.location.longitude
      );

      console.log('当前距离:', distance, '米');

      // 检查距离是否在500米以内
      const MAX_DISTANCE = 1000; // 500米
      if (distance > MAX_DISTANCE) {
        wx.showModal({
          title: '距离太远',
          content: `您距离该地点约${Math.round(distance)}米，需要在${MAX_DISTANCE}米范围内才能打卡哦~`,
          showCancel: false
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
        this.setData({ hasCheckedIn: true });
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
          createTime: db.serverDate(),
          latitude: locationRes.latitude,
          longitude: locationRes.longitude,
          distance: Math.round(distance)
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
        'location.checkInCount': (this.data.location.checkInCount || 0) + 1,
        hasCheckedIn: true
      });

      wx.hideLoading();
      wx.showToast({
        title: '打卡成功！',
        icon: 'success'
      });
    } catch (error) {
      console.error('打卡失败:', error);
      wx.hideLoading();

      // 处理定位失败
      if (error.errMsg && error.errMsg.includes('getLocation')) {
        wx.showModal({
          title: '定位失败',
          content: '无法获取您的位置信息，请检查定位权限设置',
          showCancel: false
        });
      } else {
        wx.showToast({
          title: '打卡失败，请重试',
          icon: 'none'
        });
      }
    }
  },

  /**
   * 计算两点之间的距离（米）
   * 使用 Haversine 公式
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // 地球半径（米）
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // 返回距离（米）
  },

  /**
   * 分享给好友
   */
  onShareAppMessage() {
    const { location } = this.data;
    return {
      title: location.name || '线下体验地点',
      path: `/pages/location-detail/location-detail?id=${location._id}`,
      imageUrl: location.coverImage
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    const { location } = this.data;
    return {
      title: location.name || '线下体验地点',
      query: `id=${location._id}`,
      imageUrl: location.coverImage
    };
  },

  /**
   * 分享按钮点击（可选，用于自定义分享按钮）
   */
  onShare() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
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

    // 检查是否已打卡
    if (!this.data.hasCheckedIn) {
      wx.showModal({
        title: '提示',
        content: '需要先打卡后才能评价哦~',
        confirmText: '去打卡',
        success: (res) => {
          if (res.confirm) {
            this.onCheckIn();
          }
        }
      });
      return;
    }

    // 跳转到写评价页面
    wx.navigateTo({
      url: `/pages/write-review/write-review?locationId=${this.data.locationId}&locationName=${this.data.location.name}`
    });
  },

  /**
   * 长按评论 - 自己的可删除,别人的可举报
   */
  onReviewReport(e) {
    const { id, type, content, userid } = e.currentTarget.dataset;
    const currentUserId = app.globalData.userInfo?.openid;

    // 判断是否是自己的评论
    const isMyReview = userid === currentUserId;

    const itemList = isMyReview ? ['删除评论'] : ['举报该评论'];

    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (res.tapIndex === 0) {
          if (isMyReview) {
            this.deleteReview(id);
          } else {
            this.showReportDialog(id, 'review_' + type, content.substring(0, 20));
          }
        }
      }
    });
  },

  /**
   * 删除评论
   */
  async deleteReview(reviewId) {
    try {
      const result = await wx.showModal({
        title: '确认删除',
        content: '确定要删除这条评论吗?',
        confirmText: '删除',
        confirmColor: '#ff6b6b'
      });

      if (!result.confirm) return;

      wx.showLoading({ title: '删除中...' });

      const db = wx.cloud.database();

      // 删除评论
      await db.collection('location_reviews').doc(reviewId).remove();

      // 重新计算地点评分
      const reviewsResult = await db.collection('location_reviews')
        .where({
          locationId: this.data.locationId,
          status: 'approved'
        })
        .get();

      const allReviews = reviewsResult.data;
      const totalRating = allReviews.reduce((sum, review) => sum + (review.rating || 0), 0);
      const avgRating = allReviews.length > 0 ? (totalRating / allReviews.length).toFixed(1) : 0;

      // 更新地点评分
      await db.collection('locations')
        .doc(this.data.locationId)
        .update({
          data: {
            rating: parseFloat(avgRating),
            ratingCount: allReviews.length
          }
        });

      wx.hideLoading();
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });

      // 重新加载评论列表
      this.loadReviews(this.data.locationId);

      // 重新加载地点详情(更新评分显示)
      this.loadLocationDetail(this.data.locationId);
    } catch (err) {
      console.error('删除评论失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  /**
   * 显示举报对话框
   */
  showReportDialog(targetId, targetType, targetName) {
    const reportReasons = [
      '色情低俗',
      '违法违规',
      '虚假信息',
      '侵权内容',
      '垃圾广告',
      '其他原因'
    ];

    wx.showActionSheet({
      itemList: reportReasons,
      success: async (res) => {
        const reason = reportReasons[res.tapIndex];
        await this.submitReport(targetId, targetType, targetName, reason);
      }
    });
  },

  /**
   * 提交举报
   */
  async submitReport(targetId, targetType, targetName, reason) {
    try {
      wx.showLoading({ title: '提交中...' });

      const db = wx.cloud.database();
      await db.collection('reports').add({
        data: {
          targetId,
          targetType,
          targetName,
          reason,
          reporterOpenId: app.globalData.userInfo?.openid || '',
          reporterName: app.globalData.userInfo?.nickName || '匿名用户',
          status: 'pending',
          createTime: new Date(),
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '举报成功',
        icon: 'success'
      });
    } catch (err) {
      console.error('举报失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '举报失败',
        icon: 'none'
      });
    }
  }
})
