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
   * 立即购买 - 复制商品链接（因微信限制，实物商品小程序无法直接跳转）
   */
  onBuyNow() {
    const { goods } = this.data;

    // 使用短链接（复制到剪贴板）
    if (goods.shortLink) {
      wx.setClipboardData({
        data: goods.shortLink,
        success: () => {
          wx.showModal({
            title: '链接已复制',
            content: '已复制购买链接，请在微信聊天窗口粘贴打开即可购买',
            confirmText: '我知道了',
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
      return;
    }

    // 如果没有配置短链接，提示用户
    wx.showModal({
      title: '提示',
      content: '该商品暂未配置购买链接，请联系客服',
      confirmText: '我知道了',
      showCancel: false
    });
  },

  /**
   * 分享商品
   */
  onShareAppMessage() {
    const { goods } = this.data;
    return {
      title: goods.name,
      path: `/pages/good-info/good-info?id=${goods._id}`,
      imageUrl: goods.coverImage
    };
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
  }
})