<template>
  <view class="page">
    <!-- 搜索栏（固定） -->
    <view class="search-card">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="输入订单号搜索"
          placeholder-class="search-ph"
          confirm-type="search"
          @confirm="doSearch"
        />
        <text v-if="keyword" class="search-clear" @click="clearSearch">✕</text>
      </view>
      <text class="search-btn" @click="doSearch">搜索</text>
    </view>

    <!-- 状态筛选（固定） -->
    <scroll-view class="tabs-wrap" scroll-x>
      <view class="tabs">
        <view
          v-for="t in statusTabs"
          :key="String(t.value)"
          class="tab"
          :class="{ on: activeStatus === t.value }"
          @click="switchStatus(t.value)"
        >
          <text>{{ t.label }}</text>
        </view>
      </view>
    </scroll-view>

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
        <view v-for="o in list" :key="o.id" class="order-card">
          <view class="card-head">
            <text class="order-no">{{ o.order_no }}</text>
            <text class="status" :class="'s' + Number(o.status)">{{ statusText(o.status) }}</text>
          </view>

          <view class="tag-row">
            <text v-if="payTypeText(o.pay_type)" class="tag payway">{{ payTypeText(o.pay_type) }}</text>
            <text v-if="Number(o.is_lock) === 1" class="tag locked">已锁定</text>
            <text v-if="o.user_id" class="tag buyer">买家 #{{ o.user_id }}</text>
          </view>

          <view class="amount-row">
            <text class="pay-label">实付</text>
            <text class="pay-num">¥{{ money(o.payable_amount) }}</text>
            <text v-if="Number(o.original_amount) > 0" class="orig">原价 ¥{{ money(o.original_amount) }}</text>
          </view>

          <view class="meta-row">
            <text class="saved">已优惠 ¥{{ money(o.discount_amount) }}</text>
            <text class="time">{{ timeText(o) }}</text>
          </view>
        </view>

        <view class="load-more">
          <text v-if="loading">加载中...</text>
          <text v-else-if="finished">— 没有更多了 —</text>
        </view>
      </template>

      <view v-else-if="!loading" class="state-text">暂无订单</view>
    </auto-scroll>
  </view>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getShopOrderList, payTypeText } from '@/api/order.js'
import { usePageList } from '@/utils/usePageList.js'
import AutoScroll from '@/components/auto-scroll/auto-scroll.vue'

// 商家订单状态：1待支付 2待核销 3已核销 4已取消
const STATUS_MAP = {
  1: '待支付',
  2: '待核销',
  3: '已核销',
  4: '已取消'
}

const statusTabs = [
  { label: '全部', value: null },
  { label: '待支付', value: 1 },
  { label: '待核销', value: 2 },
  { label: '已核销', value: 3 },
  { label: '已取消', value: 4 }
]

const keyword = ref('')
const activeStatus = ref(null)
const scrollRef = ref(null)
const listRefreshing = ref(false)

// 分页拉取：keyword / status 变化后由 refresh() 重新请求
const { list, loading, finished, refresh, loadMore } = usePageList((p) => {
  const params = { page: p.page, limit: p.limit }
  const kw = keyword.value.trim()
  if (kw) params.order_no = kw
  if (activeStatus.value != null) params.status = activeStatus.value
  return getShopOrderList(params)
})

// 每次进入页面（含从核销页返回）都刷新第一页
onShow(async () => {
  await refresh()
  await nextTick()
  if (scrollRef.value && scrollRef.value.sync) scrollRef.value.sync()
})

// 列表数据变化后重新测量容器
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

function doSearch() {
  refresh()
}

function clearSearch() {
  keyword.value = ''
  refresh()
}

function switchStatus(v) {
  if (activeStatus.value === v) return
  activeStatus.value = v
  refresh()
}

function statusText(s) {
  return STATUS_MAP[Number(s)] || '未知'
}

// 已核销展示核销时间，其余展示下单时间
function timeText(o) {
  if (Number(o.status) === 3 && o.verified_at) return `核销 ${fmtTime(o.verified_at)}`
  return fmtTime(o.created_at || o.verified_at)
}

// 兼容后端三种时间格式：秒级时间戳 / 毫秒时间戳 / "2026-09-08T17:12:02+08:00"
function fmtTime(v) {
  if (!v) return ''
  const raw = String(v)
  if (/^\d+$/.test(raw)) {
    const n = Number(raw)
    const ms = raw.length <= 10 ? n * 1000 : n
    const d = new Date(ms)
    if (!isNaN(d.getTime())) {
      const p = (x) => String(x).padStart(2, '0')
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
    }
    return raw
  }
  return raw.replace('T', ' ').slice(0, 16)
}

// 金额展示，去掉多余的尾数（550 / 550.5）
function money(v) {
  return Number(Number(v || 0).toFixed(2))
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
  background-color: #f8fafc;
  padding: 24rpx;
  box-sizing: border-box;
}

/* ===== 搜索栏 ===== */
.search-card {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 24rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  .search-box {
    flex: 1;
    display: flex;
    align-items: center;
    background: #f8fafc;
    border-radius: 16rpx;
    padding: 0 20rpx;
    height: 72rpx;

    .search-icon {
      font-size: 24rpx;
      margin-right: 12rpx;
      opacity: 0.7;
    }

    .search-input {
      flex: 1;
      font-size: 26rpx;
      color: #0f172a;
    }

    .search-ph {
      color: #94a3b8;
    }

    .search-clear {
      font-size: 24rpx;
      color: #cbd5e1;
      padding: 4rpx 0 4rpx 12rpx;
    }
  }

  .search-btn {
    flex-shrink: 0;
    margin-left: 18rpx;
    font-size: 28rpx;
    font-weight: 700;
    color: #2563eb;
    padding: 0 8rpx;
  }
}

/* ===== 状态筛选：横向可滚，避免 5 个 tab 挤压 ===== */
.tabs-wrap {
  flex-shrink: 0;
  margin-bottom: 24rpx;
  white-space: nowrap;
}

.tabs {
  display: inline-flex;
  align-items: center;
  background: #fff;
  border-radius: 24rpx;
  padding: 12rpx 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  .tab {
    padding: 14rpx 28rpx;
    text-align: center;
    font-size: 26rpx;
    font-weight: 600;
    color: #64748b;
    border-radius: 999rpx;

    &.on {
      background: #2563eb;
      color: #fff;
      font-weight: 700;
    }
  }
}

.state-text {
  text-align: center;
  color: #94a3b8;
  font-size: 26rpx;
  padding: 120rpx 0;
}

/* ===== 订单卡 ===== */
.order-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 26rpx 28rpx;
  margin-bottom: 22rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .order-no {
      flex: 1;
      font-size: 24rpx;
      font-weight: 700;
      color: #64748b;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      margin-right: 16rpx;
    }

    .status {
      flex-shrink: 0;
      font-size: 22rpx;
      font-weight: 700;
      border-radius: 999rpx;
      padding: 4rpx 16rpx;

      &.s1 { color: #b45309; background: #fef3c7; }
      &.s2 { color: #1d4ed8; background: #eff6ff; }
      &.s3 { color: #15803d; background: #dcfce7; }
      &.s4 { color: #64748b; background: #f1f5f9; }
    }
  }

  .tag-row {
    display: flex;
    flex-wrap: wrap;
    margin-top: 16rpx;

    .tag {
      font-size: 20rpx;
      font-weight: 700;
      border-radius: 6rpx;
      padding: 4rpx 12rpx;
      margin-right: 12rpx;
      color: #475569;
      background: #f1f5f9;
    }

    .payway { color: #1d4ed8; background: #eff6ff; }
    .locked { color: #b45309; background: #fef3c7; }
    .buyer { color: #64748b; background: #f8fafc; }
  }

  .amount-row {
    display: flex;
    align-items: baseline;
    margin-top: 20rpx;

    .pay-label {
      font-size: 24rpx;
      font-weight: 600;
      color: #475569;
      margin-right: 12rpx;
    }

    .pay-num {
      font-size: 44rpx;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.1;
    }

    .orig {
      margin-left: 16rpx;
      font-size: 24rpx;
      color: #94a3b8;
      text-decoration: line-through;
    }
  }

  .meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 20rpx;
    padding-top: 20rpx;
    border-top: 1rpx dashed #e2e8f0;
    font-size: 24rpx;
    color: #94a3b8;

    .saved {
      color: #ff2d55;
      font-weight: 600;
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
