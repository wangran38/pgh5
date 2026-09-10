<template>
  <view class="page">
    <!-- 顶部大图 Hero -->
    <view class="hero">
      <image class="hero-bg" :src="IMAGES.heroBg" mode="aspectFill" />
      <!-- 品牌标识 -->
      <view class="brand">
        <view class="brand-logo"><text>CP</text></view>
      </view>
      <!-- 主标题 -->
      <view class="hero-title">
        <text class="title-line1">跟着赛事</text>
        <view class="title-line2-wrap">
          <text class="title-line2">趣山东</text>
          <view class="swoosh" />
        </view>
      </view>
      <view class="hero-badge">
        <text>精彩赛事 · 畅游齐鲁 · 尽享生活</text>
      </view>
      <text class="hero-city">山东 · 青岛</text>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <text class="search-city">山东</text>
      <view class="search-divider" />
      <text class="search-icon">🔍</text>
      <input
        class="search-input"
        placeholder="搜索赛事、酒店、美食、景区"
        placeholder-class="search-ph"
      />
    </view>

    <!-- 票根兑换 -->
    <view class="exchange">
      <text class="exchange-watermark">🏯</text>
      <text class="exchange-title">票根·兑换 解锁专属权益</text>
      <text class="exchange-sub">解锁美食、酒店、景区、文创等</text>
      <view class="exchange-btns">
        <view class="btn btn-outline">
          <text>查看票根权益</text>
          <text class="btn-arrow">›</text>
        </view>
        <view class="btn btn-solid" @click="goUpload">
          <text>⬆ 上传票根入口</text>
        </view>
      </view>
    </view>

    <!-- 票根权益 -->
    <view class="panel">
      <view class="panel-head">
        <text class="panel-title">票根权益</text>
        <view class="panel-more">
          <text>更多权益</text>
          <text class="more-arrow">›</text>
        </view>
      </view>
      <view class="icon-row">
        <view
          v-for="item in ticketBenefits"
          :key="item.name"
          class="icon-item"
          @click="item.action && item.action()"
        >
          <view class="icon-circle" :style="{ background: item.bg }">
            <text>{{ item.icon }}</text>
          </view>
          <text class="icon-name">{{ item.name }}</text>
          <text class="icon-desc">{{ item.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 足球联赛横幅 -->
    <view class="banner">
      <image class="banner-img" :src="IMAGES.leagueBanner" mode="aspectFill" />
      <view class="banner-mask" />
      <view class="banner-title">
        <text>第二届</text><text class="banner-hl">海南省</text><text>城市足球联赛</text>
      </view>
      <text class="banner-sub">激情开赛 · 逐梦绿茵</text>
      <view class="banner-tag"><text>热血海岛 足球盛宴</text></view>
    </view>

    <!-- 赛事活动 -->
    <view class="panel">
      <view class="panel-head">
        <text class="panel-title">赛事活动</text>
        <view class="panel-more">
          <text>更多</text>
          <text class="more-arrow">›</text>
        </view>
      </view>
      <view class="icon-row">
        <view v-for="item in eventActivities" :key="item.name" class="icon-item">
          <view class="icon-circle" :style="{ background: item.bg }">
            <text>{{ item.icon }}</text>
          </view>
          <text class="icon-name">{{ item.name }}</text>
          <text class="icon-desc">{{ item.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 精选赛事 -->
    <view class="panel">
      <view class="panel-head">
        <view class="panel-title-wrap">
          <text class="panel-fire">🔥</text>
          <text class="panel-title">精选赛事</text>
        </view>
        <view class="panel-more">
          <text>更多</text>
          <text class="more-arrow">›</text>
        </view>
      </view>
      <view class="match-row">
        <!-- 正在直播 -->
        <view class="match-card match-live">
          <image class="match-bg" :src="IMAGES.liveBg" mode="aspectFill" />
          <view class="match-badge badge-live"><text>正在直播</text></view>
          <view class="match-content">
            <view class="team-row">
              <view class="crest crest-red"><text>TSFC</text></view>
              <text class="team-name light">山东队</text>
              <text class="vs">VS</text>
              <text class="team-name light">山东队</text>
              <view class="crest crest-navy"><text>SIPG</text></view>
            </view>
            <text class="score">3 : 4</text>
            <text class="score-time">上半场 · 58'</text>
            <view class="match-btn btn-watch"><text>▶ 进入直播</text></view>
          </view>
        </view>
        <!-- 即将开始 -->
        <view class="match-card match-upcoming">
          <view class="match-badge badge-soon"><text>即将开始</text></view>
          <view class="match-content">
            <view class="team-row">
              <view class="crest crest-red"><text>TSFC</text></view>
              <text class="team-name dark">山东队</text>
              <text class="vs">VS</text>
              <text class="team-name dark">山东队</text>
              <view class="crest crest-blue"><text>QDF</text></view>
            </view>
            <text class="match-time">06.21-19:35</text>
            <text class="match-addr">📍 海口市体育馆中心</text>
            <view class="match-btn btn-buy"><text>⚡ 立即购票</text></view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
// 页面配图（AI 生成素材）
const IMAGES = {
  heroBg:
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Bright%20sunny%20Qingdao%20coastal%20city%20skyline%2C%20blue%20sky%20with%20fluffy%20white%20clouds%2C%20seagulls%20flying%2C%20traditional%20red%20roof%20Chinese%20pavilion%20on%20a%20hill%2C%20white%20lighthouse%2C%20modern%20skyscrapers%2C%20calm%20blue%20sea%2C%20cheerful%20travel%20poster%20background%2C%20no%20text&image_size=landscape_16_9',
  leagueBanner:
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Energetic%20city%20football%20league%20sports%20banner%20background%2C%20tropical%20beach%20city%20skyline%2C%20green%20soccer%20field%2C%20flying%20football%2C%20palm%20trees%2C%20blue%20sky%20with%20light%20rays%2C%20dynamic%20sports%20poster%20style%2C%20no%20text&image_size=landscape_16_9',
  liveBg:
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Night%20football%20stadium%20with%20floodlights%2C%20green%20pitch%2C%20crowd%20atmosphere%2C%20dark%20blue%20tones%2C%20sports%20live%20broadcast%20background%2C%20no%20text&image_size=landscape_4_3'
}

// 跳转：上传票根入口 → 首页票根核验
function goUpload() {
  uni.navigateTo({ url: '/pages/index/index' })
}

// 跳转：商家中心
function goShopCenter() {
  uni.navigateTo({ url: '/pages/shop/center/center' })
}

const ticketBenefits = [
  { icon: '🍽️', name: '餐饮美食', desc: '美味享特惠', bg: '#fdeadd' },
  { icon: '🏨', name: '酒店民宿', desc: '住得更省心', bg: '#dff0e3' },
  { icon: '⛩️', name: '景区门票', desc: '逐景而行', bg: '#dde8fb' },
  { icon: '🎁', name: '本地特色', desc: '品本土好物', bg: '#e8defa' },
  { icon: '🏪', name: '商家入驻', desc: '携手创商机', bg: '#d5eef2', action: goShopCenter }
]

const eventActivities = [
  { icon: '🏆', name: '赛事报名', desc: '组队竞赛场', bg: '#fdeadd' },
  { icon: '🎫', name: '立即购票', desc: '观体育赛事', bg: '#dff0e3' },
  { icon: '🎬', name: '演出购票', desc: '看演艺盛会', bg: '#dde8fb' },
  { icon: '👕', name: '球星风采', desc: '睹球星风采', bg: '#e8defa' },
  { icon: '🛍️', name: '周边商城', desc: '购潮玩文创', bg: '#d5f2f5' }
]
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-bottom: 40rpx;
  background: linear-gradient(180deg, #c9e6f8 0%, #e3f2fc 30%, #eef6fc 100%);
}

/* ---------- Hero ---------- */
.hero {
  position: relative;
  height: 480rpx;
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}
.brand {
  position: absolute;
  top: 36rpx;
  left: 28rpx;
  display: flex;
  align-items: center;
}
.brand-logo {
  width: 76rpx;
  height: 76rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #e23b3b, #c81e1e);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 10rpx rgba(200, 30, 30, 0.35);
}
.brand-logo text {
  color: #fff;
  font-size: 34rpx;
  font-weight: 800;
  font-style: italic;
}


/* ---------- 搜索栏 ---------- */
.search-bar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  height: 62rpx;
  margin: -46rpx 28rpx 0;
  padding: 0 30rpx;
  background: #fff;
  border-radius: 46rpx;
  box-shadow: 0 10rpx 28rpx rgba(31, 86, 140, 0.14);
}
.search-city {
  font-size: 30rpx;
  font-weight: 300;
  color: #333;
}
.search-divider {
  width: 2rpx;
  height: 40rpx;
  margin: 0 24rpx;
  background: #e2e8ef;
}
.search-icon {
  margin-right: 14rpx;
  font-size: 30rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}
.search-ph {
  font-size: 28rpx;
  color: #9aa7b3;
}

/* ---------- 票根兑换 ---------- */
.exchange {
  position: relative;
  overflow: hidden;
  margin: 28rpx 28rpx 0;
  padding: 40rpx 36rpx 44rpx;
  background: linear-gradient(120deg, #f4fbf4 0%, #e2f2e4 55%, #cfe9d6 100%);
  border-radius: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(46, 120, 80, 0.08);
}
.exchange-watermark {
  position: absolute;
  right: -16rpx;
  bottom: -30rpx;
  font-size: 190rpx;
  opacity: 0.14;
}
.exchange-title {
  font-size: 46rpx;
  font-weight: 800;
  color: #176b3f;
  letter-spacing: 2rpx;
}
.exchange-sub {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  color: #51876a;
}
.exchange-btns {
  display: flex;
  margin-top: 40rpx;
}
.btn {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 44rpx;
}
.btn-outline {
    height: 60rpx;
  color: #1e7a4d;
  background: rgba(255, 255, 255, 0.75);
  border: 2rpx solid #1e7a4d;
}
.btn-arrow {
  margin-left: 10rpx;
  font-weight: 400;
}
.btn-solid {
    height: 60rpx;
  margin-left: 24rpx;
  color: #fff;
  background: #1e7a4d;
  box-shadow: 0 8rpx 18rpx rgba(30, 122, 77, 0.35);
}

/* ---------- 通用白卡片 ---------- */
.panel {
  margin: 28rpx 28rpx 0;
  padding: 32rpx 26rpx 36rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(30, 80, 130, 0.06);
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel-title-wrap {
  display: flex;
  align-items: center;
}
.panel-fire {
  margin-right: 8rpx;
  font-size: 32rpx;
}
.panel-title {
  font-size: 36rpx;
  font-weight: 800;
  color: #222;
}
.panel-more {
  display: flex;
  align-items: center;
}
.panel-more text {
  font-size: 26rpx;
  color: #8a94a0;
}
.more-arrow {
  margin-left: 6rpx;
  font-size: 30rpx;
  color: #b6bfc9;
}
.icon-row {
  display: flex;
  margin-top: 40rpx;
}
.icon-item {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
}
.icon-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 110rpx;
  height: 110rpx;
  border-radius: 50%;
}
.icon-circle text {
  font-size: 54rpx;
}
.icon-name {
  margin-top: 20rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #2f3a45;
}
.icon-desc {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #98a2ad;
}

/* ---------- 联赛横幅 ---------- */
.banner {
  position: relative;
  overflow: hidden;
  height: 210rpx;
  margin: 28rpx 28rpx 0;
  border-radius: 20rpx;
}
.banner-img {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}
.banner-mask {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, rgba(8, 30, 70, 0.55), rgba(8, 30, 70, 0.15) 60%, transparent);
}
.banner-title {
  position: absolute;
  top: 44rpx;
  left: 30rpx;
  font-size: 42rpx;
  font-weight: 900;
  color: #fff;
  letter-spacing: 2rpx;
  text-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.4);
}
.banner-hl {
  color: #ffd23e;
}
.banner-sub {
  position: absolute;
  top: 116rpx;
  left: 32rpx;
  font-size: 24rpx;
  color: #eaf3ff;
  letter-spacing: 2rpx;
}
.banner-tag {
  position: absolute;
  right: 20rpx;
  bottom: 18rpx;
  padding: 8rpx 18rpx;
  background: #ffd23e;
  border-radius: 10rpx;
}
.banner-tag text {
  font-size: 22rpx;
  font-weight: 700;
  color: #a3490f;
}

/* ---------- 精选赛事 ---------- */
.match-row {
  display: flex;
  margin-top: 30rpx;
}
.match-card {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 330rpx;
  overflow: hidden;
  border-radius: 18rpx;
}
.match-live {
  background: #0b1f4b;
}
.match-bg {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: 0.55;
}
.match-upcoming {
  margin-left: 20rpx;
  background: linear-gradient(160deg, #dbeafe 0%, #eef6ff 100%);
}
.match-badge {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 2;
  padding: 8rpx 22rpx;
  font-size: 22rpx;
  font-weight: 600;
  color: #fff;
  border-radius: 18rpx 0 18rpx 0;
}
.badge-live {
  background: #16a34a;
}
.badge-soon {
  background: #5b8def;
}
.match-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-top: 30rpx;
}
.team-row {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
.crest {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.25);
}
.crest text {
  font-size: 16rpx;
  font-weight: 800;
}
.crest-red text {
  color: #c81e1e;
}
.crest-navy text {
  color: #1d3f8f;
}
.crest-blue text {
  color: #0b6ba5;
}
.team-name {
  margin: 0 12rpx;
  font-size: 26rpx;
  font-weight: 700;
}
.team-name.light {
  color: #fff;
}
.team-name.dark {
  color: #1f2937;
}
.vs {
  margin: 0 4rpx;
  font-size: 24rpx;
  font-weight: 800;
  color: #ef4444;
}
.score {
  margin-top: 12rpx;
  font-size: 54rpx;
  font-weight: 900;
  color: #fff;
  letter-spacing: 4rpx;
}
.score-time {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
}
.match-time {
  margin-top: 12rpx;
  font-size: 30rpx;
  font-weight: 800;
  color: #1f2937;
}
.match-addr {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #64748b;
}
.match-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56rpx;
  margin-top: 18rpx;
  padding: 0 34rpx;
  border-radius: 28rpx;
}
.match-btn text {
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
}
.btn-watch {
  background: #22c55e;
}
.btn-buy {
  background: linear-gradient(90deg, #fbbf24, #f97316);
}
</style>
