// pages/purchase/purchase.js
const app = getApp();

function getDB() {
  return wx.cloud.database()
}

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

    // 推荐图片列表（初始为空，从数据库加载）
    recommendList: [],

    // 产品列表
    goodsList: [],
    enable: false,

    leftList: [],
    rightList: [],
    leftHeight: 0,
    rightHeight: 0,

    // 轮播商品完整数据
    bannerGoodsList: [],

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
    this.loadBannerGoods();  // 加载轮播商品
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
    const { current, source } = e.detail;
    this.setData({ current });
    console.log('swiper change:', current, source);
  },

  /**
   * 轮播点击事件
   */
  onBannerClick(e) {
    // TDesign Swiper 的点击事件，current 在 this.data 中
    const current = this.data.current;
    const bannerGoods = this.data.bannerGoodsList;

    console.log('轮播点击:', current, bannerGoods);

    if (bannerGoods && bannerGoods.length > 0 && bannerGoods[current]) {
      // 显示加载提示
      wx.showLoading({
        title: '加载中...',
        mask: true
      });

      // 延迟跳转，给用户反馈
      setTimeout(() => {
        wx.hideLoading();
        wx.navigateTo({
          url: `/pages/good-info/good-info?id=${bannerGoods[current]._id}`,
          fail: (err) => {
            console.error('跳转失败:', err);
            wx.showToast({
              title: '跳转失败',
              icon: 'none'
            });
          }
        });
      }, 300);
    } else {
      console.warn('轮播商品数据不存在, current:', current, 'bannerGoods:', bannerGoods);
      wx.showToast({
        title: '商品信息加载中',
        icon: 'none'
      });
    }
  },

  /**
   * 加载轮播商品（置顶商品 + 热度混合）
   */
  async loadBannerGoods() {
    try {
      const db = getDB();

      // 1. 获取所有活跃商品
      const { data: allGoods } = await db.collection('goods')
        .where({ status: 'active' })
        .get();

      // 2. 分离置顶商品和普通商品
      const pinnedGoods = allGoods.filter(g => (g.sortOrder || 0) > 0);
      const dynamicGoods = allGoods.filter(g => (g.sortOrder || 0) <= 0);

      // 3. 置顶商品按 sortOrder 升序排列
      pinnedGoods.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      // 4. 普通商品按热度排序
      const goodsWithHot = dynamicGoods.map(item => ({
        ...item,
        hotScore: this.calculateHotScore(item)
      })).sort((a, b) => b.hotScore - a.hotScore);

      // 5. 合并：优先展示置顶商品，不足5个用热门商品补充
      let bannerGoods = [...pinnedGoods];
      if (bannerGoods.length < 5) {
        const needCount = 5 - bannerGoods.length;
        bannerGoods.push(...goodsWithHot.slice(0, needCount));
      } else {
        // 如果置顶商品超过5个，只取前5个
        bannerGoods = bannerGoods.slice(0, 5);
      }

      // 收集轮播商品的ID，用于标记热门
      const bannerGoodsIds = bannerGoods.map(g => g._id);
      this.bannerGoodsIds = bannerGoodsIds; // 保存到实例变量

      console.log('轮播商品:', bannerGoods.map(g => ({
        name: g.name,
        sortOrder: g.sortOrder || 0,
        hotScore: g.hotScore || 0
      })));

      // 6. 处理图片字段
      bannerGoods.forEach(item => {
        if (!item.img && item.coverImage) {
          item.img = item.coverImage;
        }
      });

      // 7. 转换为轮播格式
      const recommendList = bannerGoods.map(item => ({
        value: item.img || item.coverImage,
        ariaLabel: item.name
      }));

      this.setData({
        recommendList,
        bannerGoodsList: bannerGoods
      });

      console.log('轮播商品加载成功:', bannerGoods.length, '个', bannerGoods.map(g => g.name));
    } catch (err) {
      console.error('加载轮播商品失败:', err);
      // 失败时保持默认图片
    }
  },

  /**
   * 计算商品热度分数
   * 热度公式：浏览量*0.5 + 收藏数*5 + 分享次数*4 + 评价数*3
   * 引流模式：重点关注用户互动（收藏、分享、评价）
   */
  calculateHotScore(goods) {
    const now = Date.now();
    const createTime = goods.createTime ? new Date(goods.createTime).getTime() : now;
    const daysSinceCreate = (now - createTime) / (1000 * 60 * 60 * 24);

    // 新品加权（30天内的商品热度 x1.5）
    const timeFactor = daysSinceCreate < 30 ? 1.5 : 1.0;

    // 热度公式（引流模式）
    const hotScore = (
      (goods.viewCount || 0) * 0.5 +        // 浏览量：基础指标
      (goods.favoriteCount || 0) * 5 +      // 收藏数：用户感兴趣
      (goods.shareCount || 0) * 4 +         // 分享次数：传播力
      (goods.reviewCount || 0) * 3          // 评价数：用户参与度
    ) * timeFactor;

    return hotScore;
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  //搜索按钮
  onSearch(e) {
    const keyword = e.detail.value || this.data.searchKeyword || '';
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

    // 创建新的空数组，不使用 data 中的旧数据
    const leftList = [];
    const rightList = [];
    let leftHeight = 0;
    let rightHeight = 0;

    console.log('[瀑布流] 开始分配商品');

    goodsList.forEach((item, index) => {
      // 根据图片比例预估高度（核心）
      const cardWidth = 340 // rpx，与你 swiper 一致

      // 使用真实图片尺寸信息（已通过 wx.getImageInfo 获取）
      const imgWidth = item.imgWidth || 3
      const imgHeight = item.imgHeight || 4

      const calculatedImgHeight = (cardWidth * imgHeight) / imgWidth
      const cardHeight = calculatedImgHeight + 160 // 图片 + 文本区域估算

      console.log(`[瀑布流] 商品${index} 宽高比: ${imgWidth}x${imgHeight}, 计算高度:${cardHeight.toFixed(0)}`);

      if (leftHeight <= rightHeight) {
        leftList.push(item)
        leftHeight += cardHeight
        console.log(`[瀑布流] 商品${index} -> 左列, 高度:${cardHeight.toFixed(0)}, 左列总高:${leftHeight.toFixed(0)}`);
      } else {
        rightList.push(item)
        rightHeight += cardHeight
        console.log(`[瀑布流] 商品${index} -> 右列, 高度:${cardHeight.toFixed(0)}, 右列总高:${rightHeight.toFixed(0)}`);
      }
    })

    console.log('[瀑布流] 分配完成:', {
      totalGoods: goodsList.length,
      leftCount: leftList.length,
      rightCount: rightList.length,
      leftHeight: leftHeight.toFixed(0),
      rightHeight: rightHeight.toFixed(0),
      diff: Math.abs(leftHeight - rightHeight).toFixed(0)
    });

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
      const db = getDB();
      const _ = db.command;
      const { currentCategory, searchKeyword, page, pageSize } = this.data;

      console.log('查询参数：', { currentCategory, searchKeyword, page, pageSize });

      // 构建查询条件
      let query = {
        status: 'active'
      };

      // 分类筛选
      if (currentCategory === '推荐') {
        // 推荐分类：显示所有商品，按热度排序（前端排序）
        // 不添加额外条件
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
      let queryResult;
      if (currentCategory === '推荐') {
        // 推荐分类：获取所有商品，前端按热度排序
        queryResult = await db.collection('goods')
          .where(query)
          .get();

        // 计算热度
        const goodsWithHot = queryResult.data.map(item => ({
          ...item,
          hotScore: this.calculateHotScore(item)
        }));

        // 分离固定排序和动态排序的商品
        const pinnedGoods = goodsWithHot.filter(g => (g.sortOrder || 0) > 0);
        const dynamicGoods = goodsWithHot.filter(g => (g.sortOrder || 0) <= 0);

        // 固定排序的商品按 sortOrder 升序排列
        pinnedGoods.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        // 动态排序的商品按热度降序排列
        dynamicGoods.sort((a, b) => b.hotScore - a.hotScore);

        // 标记热门商品（动态商品中的前3名）
        dynamicGoods.forEach((item, index) => {
          item.isHot = index < 3;
        });

        // 合并：固定排序在前，动态排序在后
        const sortedGoods = [...pinnedGoods, ...dynamicGoods];

        // 分页
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        queryResult.data = sortedGoods.slice(start, end);
      } else {
        // 其他分类：按销量排序
        queryResult = await db.collection('goods')
          .where(query)
          .orderBy('sold', 'desc')
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .get();
      }

      const data = queryResult.data;

      console.log('查询到商品数量：', data.length);

      // 查询总数
      let total;
      if (currentCategory === '推荐') {
        // 推荐分类：总数是所有商品数
        const countResult = await db.collection('goods')
          .where(query)
          .count();
        total = countResult.total;
      } else {
        const countResult = await db.collection('goods')
          .where(query)
          .count();
        total = countResult.total;
      }

      console.log('商品总数：', total);

      // 标记轮播商品为热门
      data.forEach(item => {
        item.img = item.coverImage;
        if (this.bannerGoodsIds && this.bannerGoodsIds.includes(item._id)) {
          item.isHot = true;
        }
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
      const db = getDB();
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

      // 设置商品图片
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

  /**
   * 点击帮助按钮
   */
  onHelpTap() {
    wx.navigateTo({
      url: '/pages/help-center/help-center'
    });
  }

});
