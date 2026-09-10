<template>
  <view class="page">
    <!-- 总数统计（固定头部） -->
    <view v-if="total > 0" class="summary">
      <text>共 {{ total }} 张优惠券</text>
    </view>

    <!-- 自动滚动容器：内容排满才可滚；自带下拉刷新与触底加载 -->
    <auto-scroll
      ref="scrollRef"
      refresher-enabled
      :refresher-triggered="listRefreshing"
      @refresherrefresh="onAutoRefresh"
      @scrolltolower="onLower"
    >
      <!-- 首次加载 -->
      <view v-if="loading && list.length === 0" class="state-text">加载中...</view>

      <!-- 列表 -->
      <template v-else-if="list.length > 0">
        <view
          v-for="c in list"
          :key="c.id"
          class="coupon-card"
          :class="'t' + (Number(c.coupon_type) || 1)"
          @click="goEdit(c)"
        >
          <!-- 左侧：面额主视觉（按券种变色） -->
          <view class="cp-left">
            <text class="cp-tag">{{ typeText(c.coupon_type) }}</text>
            <text class="cp-amount">{{ amountPart(c) }}</text>
            <text class="cp-sub">{{ amountSub(c) }}</text>
          </view>

          <!-- 右侧：详情 -->
          <view class="cp-right">
            <text class="cp-title">{{ c.title }}</text>

            <view class="cp-cats">
              <text class="cats-label">适用业态</text>
              <template v-if="catsArr(c.categories).length">
                <text v-for="tag in catsArr(c.categories)" :key="tag" class="cp-chip">{{ tag }}</text>
              </template>
              <text v-else class="cp-chip">不限</text>
            </view>

            <view class="cp-stats">
              <text>库存 <text class="num">{{ c.total_count ?? '-' }}</text></text>
              <text>已领 <text class="num">{{ c.receive_count ?? 0 }}</text></text>
              <text>已核 <text class="num">{{ c.use_count ?? 0 }}</text></text>
            </view>

            <view class="cp-valid">
              <text class="dot"></text>
              <text>{{ dateText(c.starttime) }} 至 {{ dateText(c.endtime) }}</text>
            </view>
          </view>
        </view>

        <!-- 触底加载状态 -->
        <view class="load-more">
          <text v-if="loading">加载中...</text>
          <text v-else-if="finished">— 没有更多了 —</text>
          <text v-else @click="loadMore">上拉加载更多</text>
        </view>
      </template>

      <!-- 空状态 -->
      <view v-else-if="!loading" class="state-text">暂无优惠券</view>
    </auto-scroll>
  </view>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getCouponList } from '@/api/shop.js'
import { usePageList } from '@/utils/usePageList.js'
import AutoScroll from '@/components/auto-scroll/auto-scroll.vue'

// 业态分类与优惠券形式文案（与新增页一致）
const CAT_MAP = {
  1: '景区',
  2: '住宿',
  3: '餐饮',
  4: '文创零售',
  5: '交通服务',
  6: '演出展览'
}
const TYPE_MAP = {
  1: '满减券',
  2: '折扣券',
  3: '首道门票折扣',
  4: '专属票价'
}

// 分页拉取优惠券列表：fetcher 接收 { page, limit }，自动带 pgtoken
const { list, total, loading, finished, refresh, loadMore } = usePageList((p) => getCouponList(p))

// 滚动容器引用 + 下拉刷新状态
const scrollRef = ref(null)
const listRefreshing = ref(false)

// 每次进入页面（含从编辑页返回）都回到第一页拉最新数据
onShow(async () => {
  await refresh()
  await nextTick()
  if (scrollRef.value && scrollRef.value.sync) scrollRef.value.sync()
})

// 列表数据变化后重新测量"内容是否排满、可否滚动"
watch(list, async () => {
  await nextTick()
  if (scrollRef.value && scrollRef.value.sync) scrollRef.value.sync()
})

// 容器内下拉刷新：回到第一页重新拉取
async function onAutoRefresh() {
  listRefreshing.value = true
  try {
    await refresh()
  } finally {
    listRefreshing.value = false
  }
}

// 容器触底加载更多
function onLower() {
  loadMore()
}

// 点击卡片 → 编辑页（把整条券数据序列化带给 promo 做回填）
function goEdit(c) {
  const data = encodeURIComponent(JSON.stringify(c))
  uni.navigateTo({ url: `/pages/shop/promo/promo?mode=edit&data=${data}` })
}

function typeText(type) {
  return TYPE_MAP[Number(type)] || '优惠券'
}

// 单个值 → 名称：只认 CAT_MAP 里 1~6 的映射，识别不了返回 ''
function labelOf(item) {
  if (item == null) return ''
  // 对象形态：优先 { id } 映射，其次已有名称直接命中
  if (typeof item === 'object') {
    if (item.id != null && CAT_MAP[Number(item.id)]) return CAT_MAP[Number(item.id)]
    const direct = item.name || item.title || item.category_name || item.label
    if (direct && CAT_MAP_NAME.has(String(direct).trim())) return String(direct).trim()
    return ''
  }
  const t = String(item).trim()
  if (!t) return ''
  // 已是名称文本（如对象映射的 value），直接命中允许集合才返回
  if (CAT_MAP_NAME.has(t)) return t
  return CAT_MAP[Number(t)] || ''
}

// CAT_MAP 全部名称集合，用于判断"已是名称"的输入
const CAT_MAP_NAME = new Set(Object.values(CAT_MAP))

// 兼容后端多种传法并去重：'1,2,5' / '1，2、5' / [1,2,5] / [{id,name}] / {1:'景区',2:'住宿'}
function catsArr(v) {
  if (v == null || v === '') return []
  let items
  if (Array.isArray(v)) {
    items = v
  } else if (typeof v === 'object') {
    items = Object.keys(v)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => v[k])
  } else {
    items = String(v).split(/[,，、;；\s]+/)
  }
  const names = []
  items.forEach((it) => {
    const name = labelOf(it)
    if (name && !names.includes(name)) names.push(name)
  })
  return names
}

// 金额展示，去掉多余的尾数（30 / 30.5 / 0.88）
function money(v) {
  return Number(Number(v || 0).toFixed(2))
}

// 左侧大号主视觉：¥30 / 8.8折 等
function amountPart(c) {
  const type = Number(c.coupon_type)
  const amt = money(c.discount_amount)
  if (type === 1 || type === 4) return amt > 0 ? `¥${amt}` : ''
  if (type === 2 || type === 3) {
    const fold = foldText(amt)
    return fold ? `${fold}折` : ''
  }
  return amt > 0 ? `¥${amt}` : ''
}

// 左侧小字说明：满200可用 / 专属票价 / 首道门票
function amountSub(c) {
  const type = Number(c.coupon_type)
  const min = money(c.min_point)
  if (type === 1) return min > 0 ? `满 ¥${min} 可用` : '无门槛立减'
  if (type === 2) return '全场通用'
  if (type === 3) return '首道门票'
  if (type === 4) return '专属票价'
  return ''
}

// 后端时间形如 "2026-09-08T00:00:00+08:00"，只取日期
function dateText(s) {
  return s ? String(s).slice(0, 10) : '-'
}

// 折扣率去尾 0：0.8 → 8、8 → 8、0.88 → 8.8
function foldText(v) {
  const n = Number(v) || 0
  const raw = n >= 1 ? n : n * 10
  const out = Math.round(raw * 10) / 10
  return Number.isInteger(out) ? String(out) : String(out)
}
</script>

<style lang="scss" scoped>
.page {
  /* fixed 而非 100vh：手机动态地址栏下 100vh 大于可视高度会让 body 可滚，
     下拉手势被页面级滚动接管，scroll-view 的 refresher 拉不起来。
     top 用 --window-top 避开系统导航栏 */
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

.summary {
  flex-shrink: 0;
  font-size: 24rpx;
  color: #64748b;
  margin-bottom: 20rpx;
  padding-left: 8rpx;
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
  display: flex;
  background: #fff;
  border-radius: 22rpx;
  overflow: hidden;
  margin-bottom: 22rpx;
  box-shadow: 0 6rpx 18rpx rgba(15, 23, 42, 0.06);

  // 券身中缝的上下半圆缺口（模拟票据锯齿）
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

  // 券种主题色：满减/折扣/首道门票/专属票价
  &.t1 .cp-left { background: linear-gradient(140deg, #ff7a59 0%, #ff3d5e 100%); }
  &.t2 .cp-left { background: linear-gradient(140deg, #38a0ff 0%, #4f6bff 100%); }
  &.t3 .cp-left { background: linear-gradient(140deg, #23d3a3 0%, #0ea5a5 100%); }
  &.t4 .cp-left { background: linear-gradient(140deg, #a78bfa 0%, #7c3aed 100%); }

  // 左侧面额区
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

  // 右侧信息区
  .cp-right {
    flex: 1;
    min-width: 0;
    padding: 30rpx 26rpx 26rpx 34rpx;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

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
      margin-top: 10rpx;

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

    .cp-stats {
      display: flex;
      margin-top: 10rpx;
      font-size: 22rpx;
      color: #94a3b8;

      text { margin-right: 26rpx; }

      .num { color: #475569; font-weight: 700; }
    }

    .cp-valid {
      display: flex;
      align-items: center;
      margin-top: 10rpx;
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
      }
    }
  }
}

.load-more {
  text-align: center;
  padding: 24rpx 0 40rpx;
  font-size: 24rpx;
  color: #94a3b8;
}
</style>
