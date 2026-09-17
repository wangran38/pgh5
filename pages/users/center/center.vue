<template>
  <view class="center-container">
    <!-- 头部用户信息卡片 -->
    <view class="user-card" @click="goToProfile">
      <image class="avatar" :src="userInfo.avatar || '/static/default-avatar.png'" mode="aspectFill" />
      <view class="info">
        <text class="nickname">{{ userInfo.nickname || '未命名会员' }}</text>
        <text class="meta">手机号：{{ userInfo.mobile || '未绑定' }} | Lv.{{ userInfo.level || 0 }}</text>
      </view>
      <text class="arrow">›</text>
    </view>

    <!-- 商家中心入口卡（按入驻状态分态） -->
    <view class="shop-entry" @click="goTo('/pages/shop/center/center')">
      <view class="entry-badge">商家版</view>
      <view class="entry-main">
        <text class="entry-icon">🏬</text>
        <view class="entry-text">
          <text class="entry-title">商家中心</text>
          <text class="entry-desc">{{ shopEntryDesc }}</text>
        </view>
      </view>
      <text class="entry-arrow">›</text>
    </view>

    <!-- 功能核心宫格列表 -->
    <view class="menu-card">
      <view class="menu-item" @click="goTo('/pages/users/ticket-wallet/ticket-wallet')">
        <text class="icon">🎫</text>
        <text class="text">我的票根</text>
        <text class="arrow">›</text>
      </view>

      <view class="menu-item" @click="goTo('/pages/users/couponslist/couponslist')">
        <text class="icon">🧧</text>
        <text class="text">我的优惠券</text>
        <text class="arrow">›</text>
      </view>

      <view class="menu-item" @click="goTo('/pages/users/order/order')">
        <text class="icon">📦</text>
        <text class="text">我的订单</text>
        <text class="arrow">›</text>
      </view>

      <view class="menu-item" @click="goTo('/pages/users/profile/profile')">
        <text class="icon">⚙️</text>
        <text class="text">个人资料</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <!-- 退出登录按钮 -->
    <button class="logout-btn" @click="handleLogout">退出登录</button>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getUserProfile } from '@/api/user.js'
import { getShopApplyStatus } from '@/api/shop.js'

const userInfo = ref({
  nickname: '加载中...',
  mobile: '',
  level: 0,
  avatar: ''
})

// ===== 商家入驻状态（驱动入口卡文案分态）=====
// status: 无值=未入驻, 0=审核中, 1=营业中, 2=休息中, 3=已冻结, -1/4=驳回
const shopStatus = ref(null)
const shopName = ref('')

const shopEntryDesc = computed(() => {
  if (shopStatus.value == null) return '0 元开店，立即入驻'
  const s = String(shopStatus.value)
  if (s === '0') return '资料审核中，点击查看进度'
  if (s === '1' || s === '2') {
    return shopName.value ? `${shopName.value} · 进入商家工作台` : '进入商家工作台'
  }
  if (s === '3') return '店铺已被冻结，点击查看'
  return '申请未通过，点击重新提交'
})

onMounted(async () => {
  const res = await getUserProfile()
  if (res && res.data) {
    userInfo.value = res.data
  }
  // 未登录/无申请记录时静默失败，入口卡保持"未入驻"态
  const applyRes = await getShopApplyStatus()
  if (applyRes && applyRes.data) {
    shopStatus.value = applyRes.data.status
    shopName.value = applyRes.data.name || applyRes.data.shop_name || ''
  }
})

// 统一跳转方法
function goTo(url) {
  uni.navigateTo({ url })
}

// 单独跳转个人资料
function goToProfile() {
  uni.navigateTo({ url: '/pages/users/profile/profile' })
}

// 退出登录
function handleLogout() {
  uni.removeStorageSync('pgtoken')
  uni.showToast({ title: '已退出登录', icon: 'none' })
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/index/index' })
  }, 1000)
}
</script>

<style lang="scss" scoped>
.center-container {
  background-color: #f8fafc;
  padding: 30rpx;
  box-sizing: border-box;
}

.user-card {
  background: linear-gradient(135deg, #1e3a8a, #1d4ed8);
  padding: 36rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  color: #fff;
  margin-bottom: 30rpx;
  box-shadow: 0 8rpx 20rpx rgba(30, 58, 138, 0.2);

  .avatar {
    width: 110rpx;
    height: 110rpx;
    border-radius: 50%;
    background: #cbd5e1;
    border: 3rpx solid rgba(255,255,255,0.8);
    margin-right: 24rpx;
  }

  .info {
    flex: 1;
    .nickname { font-size: 34rpx; font-weight: 900; display: block; }
    .meta { font-size: 22rpx; opacity: 0.8; margin-top: 8rpx; display: block; }
  }

  .arrow { font-size: 36rpx; opacity: 0.7; }
}

/* 商家中心入口卡：与用户卡同色系，形成"身份区" */
.shop-entry {
  position: relative;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #1e3a8a, #1d4ed8);
  border-radius: 24rpx;
  padding: 30rpx 32rpx;
  margin-bottom: 30rpx;
  color: #fff;
  box-shadow: 0 8rpx 20rpx rgba(30, 58, 138, 0.2);
  overflow: hidden;

  .entry-badge {
    position: absolute;
    top: 0;
    right: 0;
    font-size: 20rpx;
    font-weight: 700;
    color: #fff;
    background: rgba(255, 255, 255, 0.22);
    padding: 6rpx 18rpx;
    border-radius: 0 24rpx 0 24rpx;
  }

  .entry-main {
    flex: 1;
    display: flex;
    align-items: center;
    min-width: 0;

    .entry-icon {
      font-size: 44rpx;
      margin-right: 22rpx;
    }

    .entry-text {
      flex: 1;
      min-width: 0;

      .entry-title {
        display: block;
        font-size: 32rpx;
        font-weight: 900;
      }

      .entry-desc {
        display: block;
        margin-top: 8rpx;
        font-size: 22rpx;
        opacity: 0.85;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    }
  }

  .entry-arrow {
    flex-shrink: 0;
    font-size: 36rpx;
    opacity: 0.7;
    margin-left: 16rpx;
  }
}

.menu-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 0 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02);
  margin-bottom: 40rpx;

  .menu-item {
    display: flex;
    align-items: center;
    padding: 32rpx 0;
    border-bottom: 1rpx solid #f1f5f9;

    &:last-child { border-bottom: none; }

    .icon { font-size: 32rpx; margin-right: 20rpx; }
    .text { flex: 1; font-size: 28rpx; font-weight: 700; color: #1e293b; }
    .arrow { font-size: 28rpx; color: #cbd5e1; }
  }
}

.logout-btn {
  background: #fef2f2;
  color: #dc2626;
  border: 1rpx solid #fee2e2;
  font-weight: 800;
  font-size: 28rpx;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 16rpx;
  &::after { border: none; }
}
</style>
