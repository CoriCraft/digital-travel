// pages/purchase/purchase.js
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 顶部导航栏
    statusBarHeight: 0,
    navBarHeight: 0,

    // 推荐产品轮播
    current: 0,
    autoplay: true,
    duration: 500,
    interval: 5000,

    // 推荐图片列表
    recommendList: [
      '/static/pages/purchase/rec1.png',
      '/static/pages/purchase/rec2.png',
      '/static/pages/purchase/rec3.png',
      '/static/pages/purchase/rec4.png'
    ],

    // 产品列表
    goodsList: [],
    enable: false,

    leftList: [],
    rightList: [],
    leftHeight: 0,
    rightHeight: 0,

    // 当前分类
    currentCategory: '推荐',
    // 搜索关键词
    searchKeyword: '',
    // 分页
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('产品购买页面加载');
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    });
    this.loadGoods();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onShow() {
    console.log("------------purchase");
    if (typeof this.getTabBar === "function") {
      const tabBar = this.getTabBar();
      tabBar.setData({
        value: "purchase",
      });
    }
  },

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
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {},

  // 左上角home键
  onHomeTap() {
    wx.switchTab({
      url: '/pages/template/template',
    })
  },

  //推荐产品轮播
  onSwiperChange(e) {
    const { current, source } = e.detail
    this.setData({ current })
    console.log('swiper:', current, source)
  },

  //搜索按钮
  onSearch(e) {
    const keyword = e.detail.value || '';
    this.setData({
      searchKeyword: keyword,
      page: 1,
      leftList: [],
      rightList: [],
      leftHeight: 0,
      rightHeight: 0,
    });
    this.loadGoods();
  },

  //产品分类
  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      currentCategory: category,
      page: 1,
      leftList: [],
      rightList: [],
      leftHeight: 0,
      rightHeight: 0,
    });
    this.loadGoods();
  },

  //产品列表
  buildWaterfall(goodsList) {
    console.log('buildWaterfall 接收到的商品数量：', goodsList.length);

    let {
      leftList,
      rightList,
      leftHeight,
      rightHeight,
    } = this.data

    console.log('当前左右列表长度：', leftList.length, rightList.length);

    goodsList.forEach((item) => {
      // 根据图片比例预估高度（核心）
      const cardWidth = 340 // rpx，与你 swiper 一致
      const imgHeight =
        (cardWidth * item.imgHeight) / item.imgWidth

      const cardHeight = imgHeight + 160 // 图片 + 文本区域估算

      if (leftHeight <= rightHeight) {
        leftList.push(item)
        leftHeight += cardHeight
      } else {
        rightList.push(item)
        rightHeight += cardHeight
      }
    })

    console.log('构建后左右列表长度：', leftList.length, rightList.length);

    this.setData({
      leftList,
      rightList,
      leftHeight,
      rightHeight,
    })

    console.log('setData 完成');
  },

  onGoodsTap(e) {
    const item = e.currentTarget.dataset.item
    console.log('点击商品：', item)

    wx.navigateTo({
      url: `/pages/good-info/good-info?id=${item._id}`
    })
  },

  // 加载商品列表
  async loadGoods() {
    console.log('开始加载商品列表');
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const db = wx.cloud.database();
      const _ = db.command;
      const { currentCategory, searchKeyword, page, pageSize } = this.data;

      console.log('查询参数：', { currentCategory, searchKeyword, page, pageSize });

      // 构建查询条件
      let query = {
        status: 'active'
      };

      // 分类筛选
      if (currentCategory === '推荐') {
        query.isRecommend = true;
      } else {
        query.category = currentCategory;
      }

      // 搜索关键词
      if (searchKeyword && searchKeyword.trim() !== '') {
        const keyword = searchKeyword.trim();
        query = _.and([
          query,
          { name: db.RegExp({ regexp: keyword, options: 'i' }) }
        ]);
      }

      console.log('查询条件：', query);

      // 查询商品列表
      const { data } = await db.collection('goods')
        .where(query)
        .orderBy('sold', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get();

      console.log('查询到商品数量：', data.length);

      // 查询总数
      const { total } = await db.collection('goods')
        .where(query)
        .count();

      console.log('商品总数：', total);

      // SVG图片直接使用coverImage，无需转换
      data.forEach(item => {
        item.img = item.coverImage;
      });

      console.log('开始构建瀑布流');
      this.buildWaterfall(data);
      this.setData({
        hasMore: page * pageSize < total,
        loading: false
      });
      console.log('商品列表加载完成');
    } catch (err) {
      console.error('加载商品失败：', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 加载更多
  async loadMore() {
    const nextPage = this.data.page + 1;
    this.setData({
      page: nextPage,
      loading: true
    });

    try {
      const db = wx.cloud.database();
      const _ = db.command;
      const { currentCategory, searchKeyword, pageSize } = this.data;

      // 构建查询条件
      let query = {
        status: 'active'
      };

      // 分类筛选
      if (currentCategory === '推荐') {
        query.isRecommend = true;
      } else {
        query.category = currentCategory;
      }

      // 搜索关键词
      if (searchKeyword && searchKeyword.trim() !== '') {
        const keyword = searchKeyword.trim();
        query = _.and([
          query,
          { name: db.RegExp({ regexp: keyword, options: 'i' }) }
        ]);
      }

      // 查询商品列表
      const { data } = await db.collection('goods')
        .where(query)
        .orderBy('sold', 'desc')
        .skip((nextPage - 1) * pageSize)
        .limit(pageSize)
        .get();

      // 查询总数
      const { total } = await db.collection('goods')
        .where(query)
        .count();

      // SVG图片直接使用coverImage，无需转换
      data.forEach(item => {
        item.img = item.coverImage;
      });

      this.buildWaterfall(data);
      this.setData({
        hasMore: nextPage * pageSize < total,
        loading: false
      });
    } catch (err) {
      console.error('加载更多失败：', err);
      this.setData({ loading: false });
    }
  },

});
