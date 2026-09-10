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

    <!-- 5大功能核心宫格列表 -->
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

      <view class="menu-item" @click="goTo('/pages/shop/center/center')">
        <text class="icon">🏬</text>
        <text class="text">商家中心</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <!-- 退出登录按钮 -->
    <button class="logout-btn" @click="handleLogout">退出登录</button>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getUserProfile } from '@/api/user.js'

const userInfo = ref({
  nickname: '加载中...',
  mobile: '',
  level: 0,
  avatar: ''
})

onMounted(async () => {
  const res = await getUserProfile()
  if (res && res.data) {
    userInfo.value = res.data
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
