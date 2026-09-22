<template>
  <view class="center-container">
    <!-- 顶部店铺状态卡片 -->
    <view class="shop-card" :class="statusCardClass">
      <view class="shop-info">
        <view class="shop-icon">{{ statusIcon }}</view>
        <view class="info-text">
          <text class="shop-name">{{ shopName || '尚未入驻商家' }}</text>
          <text class="shop-status">{{ statusText }}</text>
        </view>
      </view>
      <text v-if="shopId" class="shop-id">ID: {{ shopId }}</text>
    </view>

    <!-- 状态描述 -->
    <view v-if="statusDesc" class="status-desc-card">
      <text class="desc-text">{{ statusDesc }}</text>
    </view>

    <!-- 常用功能（高频 4 项放大图标，其余收进下方列表） -->
    <view v-if="canManageShop" class="quick-card">
      <text class="section-title">常用功能</text>
      <view class="quick-grid">
        <view v-for="q in QUICK_ITEMS" :key="q.text" class="quick-item" @click="onQuick(q)">
          <view class="quick-icon">{{ q.icon }}</view>
          <text class="quick-text">{{ q.text }}</text>
        </view>
      </view>
    </view>

    <!-- 功能菜单（次要功能） -->
    <view class="menu-card">
      <template v-if="canManageShop">
        <text class="section-title">店铺管理</text>

        <view class="menu-item" @click="goToShopInfo">
          <text class="icon">📋</text>
          <text class="text">店铺资料管理</text>
          <text class="arrow">›</text>
        </view>

        <view class="menu-item" @click="goToPromoList">
          <text class="icon">🧧</text>
          <text class="text">优惠券列表</text>
          <text class="arrow">›</text>
        </view>
      </template>
    </view>

    <!-- 非入驻商家引导 -->
    <view v-if="!canManageShop" class="guide-card">
      <text class="guide-title">{{ guideTitle }}</text>
      <text class="guide-desc">{{ guideDesc }}</text>
      <button class="guide-btn" @click="goToApply">{{ guideBtnText }}</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getShopApplyStatus } from '@/api/shop.js'

// 常用功能宫格：只放最高频的 4 项，action 对应下方跳转方法
const QUICK_ITEMS = [
  // 「团购商品」进入列表页，发布入口在列表页右上角
  { icon: '🛍', text: '团购商品', action: 'goodsList' },
  { icon: '📦', text: '订单管理', action: 'orders' },
  { icon: '🎫', text: '核销中心', action: 'tickets' },
  { icon: '🧧', text: '发布优惠券', action: 'promo' }
]

function onQuick(item) {
  const map = {
    goods: goToAddGoods,
    goodsList: goToGoodsList,
    orders: goToOrders,
    tickets: goToTickets,
    promo: goToPromo
  }
  const fn = map[item.action]
  if (fn) fn()
}

const applyStatusData = ref(null)
const shopId = ref(null)
const shopName = ref('')

const hasApplied = computed(() => {
  return applyStatusData.value && applyStatusData.value.status !== undefined
})

// 审核通过且非冻结状态可管理店铺
const canManageShop = computed(() => {
  const s = applyStatusData.value?.status
  return s === 1 || s === 2
})

const statusText = computed(() => {
  if (!hasApplied.value) return '未入驻'
  const map = {
    '-1': '审核未通过',
    '0': '审核中',
    '1': '营业中',
    '2': '休息中',
    '3': '已冻结',
    '4': '审核驳回'
  }
  return map[String(applyStatusData.value.status)] || '已提交申请'
})

const statusDesc = computed(() => {
  if (!hasApplied.value) return ''
  const descMap = {
    '0': '您的商家资料正在审核中，请耐心等待...',
    '1': '您的店铺已成功入驻并处于营业状态！',
    '2': '您的店铺目前处于休息中。',
    '3': '您的店铺已被冻结，如有疑问请联系客服。',
    '-1': '您的申请未通过审核，请修改后重新提交。',
    '4': '您的申请已被驳回，请根据要求重新调整信息。'
  }
  return descMap[String(applyStatusData.value.status)] || ''
})

const statusIcon = computed(() => {
  if (!hasApplied.value) return '🏪'
  const s = applyStatusData.value.status
  if (s === 1) return '✅'
  if (s === 0) return '⏳'
  if (s === 2) return '😴'
  return '⚠️'
})

const statusCardClass = computed(() => {
  if (!hasApplied.value) return 'card-default'
  const s = applyStatusData.value.status
  if (s === 1) return 'card-success'
  if (s === 0) return 'card-warning'
  return 'card-danger'
})

// 非可管理状态下的引导文案与按钮
const guideTitle = computed(() => {
  if (!hasApplied.value) return '开启您的专属票根特惠专区'
  const s = applyStatusData.value.status
  if (s === 0) return '审核进行中'
  if (s === 3) return '店铺已冻结'
  return '申请未通过'
})

const guideDesc = computed(() => {
  if (!hasApplied.value) return '入驻后即可凭票根享专属折扣，吸引更多到店客流'
  return statusDesc.value || '如有疑问请联系平台客服'
})

const guideBtnText = computed(() => {
  if (!hasApplied.value) return '立即申请入驻'
  const s = applyStatusData.value.status
  if (s === 0) return '查看申请进度'
  return '重新申请'
})

onMounted(async () => {
  const res = await getShopApplyStatus()
  if (res && res.data) {
    applyStatusData.value = res.data
    shopId.value = res.data.shop_id || res.data.id || null
    shopName.value = res.data.name || res.data.shop_name || ''
  }
})

function goToApply() {
  uni.navigateTo({ url: '/pages/shop/shopapply/shop-apply' })
}

function goToShopInfo() {
  if (shopId.value) {
    uni.navigateTo({ url: `/pages/shop/shopinfo/shopinfo?shop_id=${shopId.value}` })
  } else {
    uni.navigateTo({ url: '/pages/shop/shopinfo/shopinfo' })
  }
}

function goToTickets() {
  const query = shopId.value ? `?shop_id=${shopId.value}` : ''
  uni.navigateTo({ url: `/pages/shop/verify/verify${query}` })
}

function goToOrders() {
  uni.navigateTo({ url: '/pages/shop/order/order' })
}

function goToAddGoods() {
  const query = shopId.value ? `?shop_id=${shopId.value}` : ''
  uni.navigateTo({ url: `/pages/shop/goods/add${query}` })
}

function goToGoodsList() {
  const query = shopId.value ? `?shop_id=${shopId.value}` : ''
  uni.navigateTo({ url: `/pages/shop/goods/list${query}` })
}

function goToPromo() {
  const query = shopId.value ? `?shop_id=${shopId.value}` : ''
  uni.navigateTo({ url: `/pages/shop/promo/promo${query}` })
}

function goToPromoList() {
  uni.navigateTo({ url: '/pages/shop/couponlist/couponlist' })
}
</script>

<style lang="scss" scoped>
.center-container {
  min-height: 100vh;
  background-color: #f8fafc;
  padding: 30rpx;
  box-sizing: border-box;
}

.shop-card {
  padding: 36rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.1);

  .shop-info {
    display: flex;
    align-items: center;
    flex: 1;
  }

  .shop-icon {
    font-size: 56rpx;
    margin-right: 24rpx;
  }

  .info-text {
    flex: 1;
    .shop-name { font-size: 34rpx; font-weight: 900; display: block; }
    .shop-status { font-size: 24rpx; opacity: 0.85; margin-top: 8rpx; display: block; }
  }

  .shop-id { font-size: 20rpx; opacity: 0.7; }
}

.card-default { background: linear-gradient(135deg, #64748b, #475569); }
.card-success { background: linear-gradient(135deg, #16a34a, #15803d); }
.card-warning { background: linear-gradient(135deg, #f59e0b, #d97706); }
.card-danger { background: linear-gradient(135deg, #dc2626, #b91c1c); }

.status-desc-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  .desc-text {
    font-size: 26rpx;
    color: #475569;
    line-height: 1.6;
  }
}

/* 分组标题：宫格与列表共用 */
.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 8rpx;
}

/* ===== 常用功能宫格（4 列，超出自动换行） ===== */
.quick-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 24rpx 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  margin-bottom: 24rpx;

  .quick-grid {
    display: flex;
    flex-wrap: wrap;
  }

  .quick-item {
    width: 25%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 18rpx 0 20rpx;
  }

  .quick-icon {
    width: 96rpx;
    height: 96rpx;
    line-height: 96rpx;
    text-align: center;
    font-size: 40rpx;
    background: #f1f5f9;
    border-radius: 20rpx;
    margin-bottom: 14rpx;
  }

  .quick-text {
    font-size: 24rpx;
    font-weight: 600;
    color: #1e293b;
  }
}

.menu-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 24rpx 4rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  margin-bottom: 40rpx;

  .menu-item {
    display: flex;
    align-items: center;
    padding: 32rpx 0;
    border-bottom: 1rpx solid #f1f5f9;

    &:last-child { border-bottom: none; }

    .icon { font-size: 32rpx; margin-right: 20rpx; }
    .text { flex: 1; font-size: 28rpx; font-weight: 700; color: #1e293b; }
    .sub-text { font-size: 22rpx; color: #94a3b8; margin-right: 12rpx; }
    .arrow { font-size: 28rpx; color: #cbd5e1; }
  }
}

.guide-card {
  background: linear-gradient(135deg, #1e3a8a, #1d4ed8);
  border-radius: 24rpx;
  padding: 40rpx 30rpx;
  text-align: center;
  color: #fff;

  .guide-title { font-size: 30rpx; font-weight: 800; display: block; }
  .guide-desc { font-size: 24rpx; opacity: 0.85; margin-top: 12rpx; display: block; line-height: 1.6; }

  .guide-btn {
    margin-top: 30rpx;
    background: #fff;
    color: #1d4ed8;
    font-weight: 800;
    font-size: 28rpx;
    height: 80rpx;
    line-height: 80rpx;
    border-radius: 16rpx;
    &::after { border: none; }
  }
}
</style>
