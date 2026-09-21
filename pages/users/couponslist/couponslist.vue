<template>
  <view class="page">
    <!-- 自动滚动容器：内容排满才可滚；自带下拉刷新与触底加载 -->
    <auto-scroll
      ref="scrollRef"
      refresher-enabled
      :refresher-triggered="listRefreshing"
      @refresherrefresh="onAutoRefresh"
      @scrolltolower="onLower"
    >
      <view v-if="loading && list.length === 0" class="state-text">加载中...</view>

      <template v-else-if="list.length > 0">
        <view
          v-for="(item, i) in list"
          :key="couponKey(item, i)"
          class="coupon-card"
          :class="['t' + typeOf(item), isInvalid(item) ? 'disabled' : '']"
        >
          <!-- 上半部：票据式券卡 -->
          <view class="card-top">
            <view class="cp-left">
              <text class="cp-tag">{{ typeText(item) }}</text>
              <text class="cp-amount">{{ amountText(item) }}</text>
              <text class="cp-sub">{{ amountSub(item) }}</text>
            </view>

            <view class="cp-right">
              <text class="cp-title">{{ couponOf(item).title || '优惠券' }}</text>

              <view class="cp-cats">
                <text class="cats-label">适用业态</text>
                <template v-if="catsArr(item).length">
                  <text v-for="tag in catsArr(item)" :key="tag" class="cp-chip">{{ tag }}</text>
                </template>
                <text v-else class="cp-chip">不限</text>
              </view>

              <view class="cp-valid">
                <text class="dot"></text>
                <text>有效期 {{ dayText(couponOf(item).starttime) }} 至 {{ dayText(couponOf(item).endtime) }}</text>
              </view>

              <text class="cp-status" :class="'st' + statusOf(item)">{{ statusText(item) }}</text>
            </view>
          </view>

          <!-- 下半部：兑换该券所用的票根（连表信息） -->
          <view v-if="hasTicket(item)" class="card-bottom">
            <image class="tk-img" :src="item.user_image_url || ''" mode="aspectFill" />
            <view class="tk-info">
              <text class="tk-title">{{ item.ticket_title || '票根' }}</text>
              <text class="tk-meta">{{ ticketMeta(item) }}</text>
            </view>
            <text class="tk-time">{{ exchangeText(item.exchanged_at) }}</text>
          </view>
        </view>

        <view class="load-more">
          <text v-if="loading">加载中...</text>
          <text v-else-if="finished">— 没有更多了 —</text>
        </view>
      </template>

      <view v-else-if="!loading" class="state-text">暂无优惠券</view>
    </auto-scroll>
  </view>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getUserCouponList } from '@/api/user.js'
import { usePageList } from '@/utils/usePageList.js'
import AutoScroll from '@/components/auto-scroll/auto-scroll.vue'

// 业态分类（与买单页 coupons.vue 保持一致）
const CAT_MAP = {
  1: '景区',
  2: '住宿',
  3: '餐饮',
  4: '文创零售',
  5: '交通服务',
  6: '演出展览'
}
// 券种：1满减 2折扣 3首道门票折扣 4专属票价
const TYPE_MAP = {
  1: '满减券',
  2: '折扣券',
  3: '首道门票',
  4: '专属票价'
}

const scrollRef = ref(null)
const listRefreshing = ref(false)

const { list, loading, finished, refresh, loadMore } = usePageList((p) =>
  getUserCouponList({ page: p.page, limit: p.limit })
)

// 每次进入页面都刷新第一页（领取新券后返回即可看到）
onShow(async () => {
  await refresh()
  await nextTick()
  if (scrollRef.value && scrollRef.value.sync) scrollRef.value.sync()
})

watch(list, async () => {
  await nextTick()
  if (scrollRef.value && scrollRef.value.sync) scrollRef.value.sync()
})

async function onAutoRefresh() {
  listRefreshing.value = true
  try {
    await refresh()
  } finally {
    listRefreshing.value = false
  }
}

function onLower() {
  loadMore()
}

// ===== 数据取值：列表项 = 票根字段 + coupon 对象 =====
function couponOf(item) {
  return (item && item.coupon) || {}
}

function typeOf(item) {
  return Number(couponOf(item).coupon_type) || 1
}

function typeText(item) {
  return TYPE_MAP[typeOf(item)] || '优惠券'
}

function couponKey(item, i) {
  const c = couponOf(item)
  return c.id != null ? c.id : `row-${i}`
}

// 面额：满减/专属票价显示金额，折扣/首道门票显示折率
function amountText(item) {
  const c = couponOf(item)
  const amt = Number(c.discount_amount) || 0
  const t = typeOf(item)
  if (t === 1 || t === 4) return amt > 0 ? `¥${money(amt)}` : ''
  return foldText(amt) ? `${foldText(amt)}折` : ''
}

function amountSub(item) {
  const c = couponOf(item)
  const min = Number(c.min_point) || 0
  const t = typeOf(item)
  if (t === 1) return min > 0 ? `满 ¥${money(min)} 可用` : '无门槛立减'
  if (t === 2) return '全场通用'
  if (t === 3) return '首道门票'
  return '专属票价'
}

// 状态：1正常发放中 2已抢光 3已下架/过期；已过有效期的一律视为不可用
function statusOf(item) {
  const c = couponOf(item)
  if (isExpired(item)) return 3
  return Number(c.status) || 1
}

function statusText(item) {
  const map = { 1: '可使用', 2: '已抢光', 3: '已过期' }
  return map[statusOf(item)] || '可使用'
}

function isExpired(item) {
  const end = couponOf(item).endtime
  if (!end) return false
  const t = new Date(String(end).replace(/-/g, '/')).getTime()
  return !isNaN(t) && t < Date.now()
}

// 过期 / 已抢光 / 已下架：整卡置灰
function isInvalid(item) {
  const s = statusOf(item)
  return s === 2 || s === 3
}

// 业态："1,3" → ["景区","餐饮"]
function catsArr(item) {
  const raw = couponOf(item).categories
  if (raw == null || raw === '') return []
  const items = Array.isArray(raw) ? raw : String(raw).split(/[,，、;；\s]+/)
  const names = []
  items.forEach((it) => {
    const name = CAT_MAP[Number(String(it).trim())]
    if (name && !names.includes(name)) names.push(name)
  })
  return names
}

// 是否带票根记录
function hasTicket(item) {
  return !!(item && (item.ticket_id || item.ticket_title || item.user_image_url))
}

// 票根副信息：持票人 · 使用日期 · 座位 · 票面金额
function ticketMeta(item) {
  const parts = []
  if (item.holder_name) parts.push(item.holder_name)
  if (item.event_date) parts.push(String(item.event_date).slice(0, 10))
  if (item.seat) parts.push(item.seat)
  if (Number(item.ticket_amount) > 0) parts.push(`票面 ¥${money(item.ticket_amount)}`)
  return parts.join(' · ')
}

function dayText(s) {
  return s ? String(s).slice(0, 10) : '-'
}

// "2026-09-21 10:30:00" → "09-21 10:30"
function exchangeText(s) {
  if (!s) return ''
  return String(s).slice(5, 16).trim()
}

function money(v) {
  return Number(Number(v || 0).toFixed(2))
}

// discount_amount >= 1 视为「X 折」（除以 10），< 1 视为折率本身
function foldText(v) {
  const n = Number(v) || 0
  const raw = n >= 1 ? n : n * 10
  const out = Math.round(raw * 10) / 10
  return out > 0 ? String(out) : ''
}
</script>

<style lang="scss" scoped>
.page {
  /* fixed 而非 100vh：手机动态地址栏下 100vh 大于可视高度会让 body 可滚，
     下拉手势被页面级滚动接管，scroll-view 的 refresher 拉不起来 */
  position: fixed;
  top: var(--window-top, 44px);
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f1f5f9;
  padding: 24rpx;
  box-sizing: border-box;
}

.state-text {
  text-align: center;
  color: #94a3b8;
  font-size: 26rpx;
  padding: 120rpx 0;
}

/* ===== 票据式券卡 ===== */
.coupon-card {
  position: relative;
  background: #fff;
  border-radius: 22rpx;
  overflow: hidden;
  margin-bottom: 22rpx;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.06);

  /* 中缝上下半圆缺口：填充色必须等于页面背景色 */
  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 246rpx;
    width: 26rpx;
    height: 26rpx;
    background: #f1f5f9;
    border-radius: 50%;
    z-index: 2;
  }
  &::before { top: -13rpx; }
  &::after { bottom: -13rpx; }

  &.t1 .cp-left { background: linear-gradient(140deg, #ff7a59 0%, #ff3d5e 100%); }
  &.t2 .cp-left { background: linear-gradient(140deg, #38a0ff 0%, #4f6bff 100%); }
  &.t3 .cp-left { background: linear-gradient(140deg, #23d3a3 0%, #0ea5a5 100%); }
  &.t4 .cp-left { background: linear-gradient(140deg, #a78bfa 0%, #7c3aed 100%); }

  .card-top {
    display: flex;
  }

  .cp-left {
    width: 260rpx;
    flex-shrink: 0;
    box-sizing: border-box;
    padding: 36rpx 16rpx 44rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;

    .cp-tag {
      font-size: 20rpx;
      letter-spacing: 2rpx;
      opacity: 0.9;
      background: rgba(255, 255, 255, 0.22);
      border-radius: 6rpx;
      padding: 4rpx 14rpx;
    }

    .cp-amount {
      margin-top: 18rpx;
      font-size: 56rpx;
      font-weight: 900;
      line-height: 1.1;
      text-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.12);
    }

    .cp-sub {
      margin-top: 12rpx;
      font-size: 22rpx;
      opacity: 0.92;
    }
  }

  .cp-right {
    flex: 1;
    min-width: 0;
    padding: 30rpx 26rpx 26rpx 34rpx;
    display: flex;
    flex-direction: column;
    justify-content: center;

    .cp-title {
      font-size: 30rpx;
      font-weight: 800;
      color: #0f172a;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      overflow: hidden;
    }

    .cp-cats {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 18rpx;

      .cats-label {
        font-size: 20rpx;
        color: #94a3b8;
        margin-right: 12rpx;
      }

      .cp-chip {
        font-size: 20rpx;
        color: #475569;
        background: #f1f5f9;
        border-radius: 6rpx;
        padding: 4rpx 12rpx;
        margin-right: 12rpx;
        margin-bottom: 8rpx;
      }
    }

    .cp-valid {
      display: flex;
      align-items: center;
      margin-top: 16rpx;
      padding-top: 18rpx;
      border-top: 1rpx dashed #e2e8f0;
      font-size: 22rpx;
      color: #94a3b8;

      .dot {
        width: 10rpx;
        height: 10rpx;
        border-radius: 50%;
        background: #f59e0b;
        margin-right: 10rpx;
        flex-shrink: 0;
      }
    }

    .cp-status {
      align-self: flex-start;
      margin-top: 14rpx;
      font-size: 20rpx;
      font-weight: 700;
      border-radius: 999rpx;
      padding: 4rpx 16rpx;

      &.st1 { color: #15803d; background: #dcfce7; }
      &.st2 { color: #b45309; background: #fef3c7; }
      &.st3 { color: #64748b; background: #f1f5f9; }
    }
  }
}

/* 已过期 / 已抢光：整卡置灰 */
.coupon-card.disabled {
  box-shadow: none;

  .cp-left { background: #cbd5e1; }
  .cp-title { color: #94a3b8; }
  .cp-chip { color: #94a3b8; background: #f1f5f9; }
  .cp-valid .dot { background: #cbd5e1; }
}

/* ===== 底部票根信息（兑换该券所用票根） ===== */
.card-bottom {
  display: flex;
  align-items: center;
  padding: 18rpx 26rpx 20rpx;
  border-top: 1rpx dashed #e2e8f0;
  background: #f8fafc;

  .tk-img {
    width: 56rpx;
    height: 72rpx;
    border-radius: 8rpx;
    background: #e2e8f0;
    flex-shrink: 0;
    margin-right: 18rpx;
  }

  .tk-info {
    flex: 1;
    min-width: 0;

    .tk-title {
      display: block;
      font-size: 24rpx;
      font-weight: 700;
      color: #1e293b;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .tk-meta {
      display: block;
      margin-top: 4rpx;
      font-size: 20rpx;
      color: #94a3b8;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  .tk-time {
    flex-shrink: 0;
    margin-left: 16rpx;
    font-size: 20rpx;
    color: #94a3b8;
  }
}

.load-more {
  text-align: center;
  padding: 24rpx 0 40rpx;
  font-size: 24rpx;
  color: #94a3b8;
}
</style>
