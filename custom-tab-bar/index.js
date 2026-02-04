Component({
  data: {
    value: 'template',
    list: [
      {
        value: 'template',
        label: '创意模板',
        icon: '/static/tab-template.png',
        url: '/pages/template/template',
      },
      {
        value: 'experience',
        label: '线下体验',
        icon: '/static/tab-experience.png',
        url: '/pages/experience/experience',
      },
      {
        value: 'purchase',
        label: '产品购买',
        icon: '/static/tab-purchase.png',
        url: '/pages/purchase/purchase',
      },
      {
        value: 'album',
        label: '电子相册',
        icon: '/static/tab-album.png',
        url: '/pages/album/album',
      },
      {
        value: 'my',
        label: '我的',
        icon: '/static/tab-my.png',
        url: '/pages/my/my',
      },
    ],
  },

  methods: {
    onChange(e) {
      const value = e.detail.value;
      const current = this.data.list.find(item => item.value === value);

      if (!current) return;

      wx.switchTab({
        url: current.url,
        fail: (err) => {
          console.error('跳转失败:', err);
        },
      });
    },
  },
});
