// pages/good-info/good-info.js
const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 顶部导航栏
    statusBarHeight: 0,
    navBarHeight: 0,

    // 商品信息
    goodsId: '',
    goods: null,
    loading: true,

    // 收藏状态
    isFavorite: false,

    // 评价相关
    reviews: [],
    reviewCount: 0,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { id } = options;
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      goodsId: id
    });

    this.loadGoodsDetail();
    this.checkFavoriteStatus();
    this.loadReviews();
  },

  /**
   * 加载商品详情
   */
  async loadGoodsDetail() {
    try {
      const db = wx.cloud.database();
      const { data } = await db.collection('goods')
        .doc(this.data.goodsId)
        .get();

      if (data) {
        // 处理图片路径
        data.img = data.coverImage;

        this.setData({
          goods: data,
          loading: false
        });
      } else {
        wx.showToast({
          title: '商品不存在',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (err) {
      console.error('加载商品详情失败：', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 检查收藏状态
   */
  checkFavoriteStatus() {
    const favoriteGoods = wx.getStorageSync('favoriteGoods') || [];
    const isFavorite = favoriteGoods.includes(this.data.goodsId);
    this.setData({ isFavorite });
  },

  /**
   * 切换收藏状态
   */
  toggleFavorite() {
    const { goodsId, isFavorite } = this.data;
    let favoriteGoods = wx.getStorageSync('favoriteGoods') || [];

    if (isFavorite) {
      // 取消收藏
      favoriteGoods = favoriteGoods.filter(id => id !== goodsId);
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      });
    } else {
      // 添加收藏
      favoriteGoods.push(goodsId);
      wx.showToast({
        title: '收藏成功',
        icon: 'success'
      });
    }

    wx.setStorageSync('favoriteGoods', favoriteGoods);
    this.setData({ isFavorite: !isFavorite });
  },

  /**
   * 立即购买
   */
  onBuyNow() {
    const { goods } = this.data;

    // 使用短链接
    if (goods.shortLink) {
      this.copyLink(goods.shortLink);
      // 统计复制次数（一天内只算一次）
      this.incrementCopyCount();
      return;
    }

    // 没有配置购买方式
    wx.showModal({
      title: '暂无购买链接',
      content: '该商品暂未配置购买链接\n\n如需购买，请联系客服咨询',
      confirmText: '知道了',
      showCancel: false
    });
  },

  /**
   * 增加复制次数统计（一天内只算一次）
   */
  incrementCopyCount() {
    const { goodsId } = this.data;
    const storageKey = `goods_copy_${goodsId}`;
    const lastCopyTime = wx.getStorageSync(storageKey) || 0;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // 24小时

    // 如果距离上次复制超过24小时，才增加复制量
    if (now - lastCopyTime > oneDay) {
      const db = wx.cloud.database();
      const _ = db.command;

      db.collection('goods')
        .doc(goodsId)
        .update({
          data: {
            copyCount: _.inc(1)
          }
        })
        .then(() => {
          console.log('复制次数+1');
          // 记录本次复制时间
          wx.setStorageSync(storageKey, now);
        })
        .catch(err => {
          console.error('更新复制次数失败:', err);
        });
    } else {
      console.log('24小时内已复制过，不重复计数');
    }
  },

  /**
   * 增加分享次数统计
   */
  incrementShareCount() {
    const db = wx.cloud.database();
    const _ = db.command;

    db.collection('goods')
      .doc(this.data.goodsId)
      .update({
        data: {
          shareCount: _.inc(1)
        }
      })
      .then(() => {
        console.log('分享次数+1');
      })
      .catch(err => {
        console.error('更新分享次数失败:', err);
      });
  },

  /**
   * 复制链接
   */
  copyLink(url) {
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showModal({
          title: '购买链接已复制',
          content: '购买链接已复制到剪贴板\n\n请在微信聊天窗口中粘贴打开链接，即可完成购买',
          confirmText: '知道了',
          showCancel: false
        });
      },
      fail: () => {
        wx.showToast({
          title: '复制失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 分享商品
   */
  onShareAppMessage() {
    const { goods } = this.data;

    // 统计分享次数
    this.incrementShareCount();

    return {
      title: goods.name,
      path: `/pages/good-info/good-info?id=${goods._id}`,
      imageUrl: goods.coverImage
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    const { goods } = this.data;

    // 统计分享次数
    this.incrementShareCount();

    return {
      title: goods.name,
      query: `id=${goods._id}`,
      imageUrl: goods.coverImage
    };
  },

  /**
   * 加载商品评价
   */
  async loadReviews() {
    try {
      const db = wx.cloud.database();
      const { data } = await db.collection('goods_reviews')
        .where({
          goodsId: this.data.goodsId,
          status: 'approved'
        })
        .orderBy('createTime', 'desc')
        .limit(10)
        .get();

      // 格式化时间
      const reviews = data.map(item => ({
        ...item,
        createTime: this.formatTime(item.createTime)
      }));

      this.setData({
        reviews,
        reviewCount: data.length
      });
    } catch (err) {
      console.error('加载评价失败：', err);
    }
  },

  /**
   * 格式化时间
   */
  formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;

    // 一分钟内
    if (diff < 60000) {
      return '刚刚';
    }
    // 一小时内
    if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟前';
    }
    // 一天内
    if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时前';
    }
    // 一周内
    if (diff < 604800000) {
      return Math.floor(diff / 86400000) + '天前';
    }
    // 超过一周，显示日期
    return `${d.getMonth() + 1}-${d.getDate()}`;
  },

  /**
   * 写评价
   */
  onWriteReview() {
    const { goodsId, goods } = this.data;
    wx.navigateTo({
      url: `/pages/write-review/write-review?type=goods&goodsId=${goodsId}&goodsName=${goods.name}`
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 从评价页面返回时，重新加载评价列表
    if (this.data.goodsId) {
      this.loadReviews();
    }
  },

  // 左上角返回按钮
  onBack() {
    const pages = getCurrentPages()

    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({
        url: '/pages/purchase/purchase'
      })
    }
  },

  /**
   * 长按举报评论
   */
  /**
   * 长按评论 - 自己的可删除,别人的可举报
   */
  onReviewReport(e) {
    const { id, type, content, userid } = e.currentTarget.dataset;
    const app = getApp();
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
      await db.collection('goods_reviews').doc(reviewId).remove();

      // 重新计算商品评分
      const reviewsResult = await db.collection('goods_reviews')
        .where({
          goodsId: this.data.goodsId,
          status: 'approved'
        })
        .get();

      const allReviews = reviewsResult.data;
      const totalRating = allReviews.reduce((sum, review) => sum + (review.rating || 0), 0);
      const avgRating = allReviews.length > 0 ? (totalRating / allReviews.length).toFixed(1) : 0;

      // 更新商品评分
      await db.collection('goods')
        .doc(this.data.goodsId)
        .update({
          data: {
            rating: parseFloat(avgRating),
            reviewCount: allReviews.length
          }
        });

      wx.hideLoading();
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });

      // 重新加载评论列表
      this.loadReviews();

      // 重新加载商品详情(更新评分显示)
      this.loadGoodsDetail();
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

      const app = getApp();
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