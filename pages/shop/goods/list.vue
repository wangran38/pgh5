<template>
  <view class="page">
    <!-- 搜索 + 新增（固定）：搜索与主操作同行，避免按钮孤行 -->
    <view class="search-card">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索商品标题"
          placeholder-class="search-ph"
          confirm-type="search"
          @confirm="doSearch"
        />
        <text v-if="keyword" class="search-clear" @click="clearSearch">✕</text>
      </view>
      <text class="search-btn" @click="doSearch">搜索</text>
      <text class="add-btn" @click="goAdd"> 新增</text>
    </view>

    <!-- 状态筛选（固定） -->
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
        <view v-for="g in list" :key="g.id" class="goods-card" @click="goEdit(g)">
          <image class="g-cover" :src="g.cover_image || ''" mode="aspectFill" />

          <view class="g-body">
            <view class="g-head">
              <text class="g-title">{{ g.title || '团购商品' }}</text>
              <text class="g-status" :class="'st' + Number(g.status)">{{ statusText(g.status) }}</text>
            </view>

            <text v-if="g.sub_title" class="g-sub">{{ g.sub_title }}</text>

            <view class="g-tags">
              <text class="g-chip">{{ bizText(g.biz_type) }}</text>
              <text class="g-chip">{{ productText(g.product_type) }}</text>
            </view>

            <view class="g-price-row">
              <text class="g-price">¥{{ money(g.selling_price) }}</text>
              <text v-if="Number(g.original_price) > 0" class="g-orig">¥{{ money(g.original_price) }}</text>
            </view>

            <view class="g-meta">
              <text>已售 {{ g.sales_count || 0 }}</text>
              <text v-if="Number(g.total_stock) > 0">库存 {{ g.total_stock }}</text>
              <text v-if="validText(g)">{{ validText(g) }}</text>
            </view>
          </view>
        </view>

        <view class="load-more">
          <text v-if="loading">加载中...</text>
          <text v-else-if="finished">— 没有更多了 —</text>
        </view>
      </template>

      <view v-else-if="!loading" class="state-text">— 没有更多了 —</view>
    </auto-scroll>
  </view>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getShopGoodsList } from '@/api/shop.js'
import { getShopApplyStatus } from '@/api/shop.js'
import { usePageList } from '@/utils/usePageList.js'
import AutoScroll from '@/components/auto-scroll/auto-scroll.vue'

// 业态：EAT吃 HOTEL住 TRAVEL行 TOUR游 SHOP购 FUN娱
const BIZ_MAP = {
  EAT: '吃',
  HOTEL: '住',
  TRAVEL: '行',
  TOUR: '游',
  SHOP: '购',
  FUN: '娱'
}
// 形态：SET_MEAL套餐 VOUCHER代金券 ROOM_NIGHT房晚 TICKET门票 TRANSFER接送机 RENTAL租车
const PRODUCT_MAP = {
  SET_MEAL: '套餐',
  VOUCHER: '代金券',
  ROOM_NIGHT: '房晚',
  TICKET: '门票',
  TRANSFER: '接送机',
  RENTAL: '租车'
}
// 状态：0草稿(灰) 1待审核(橙) 2已上架(绿) 3已下架(红)
const STATUS_MAP = {
  0: '草稿',
  1: '待审核',
  2: '已上架',
  3: '已下架'
}
// status=0 表示全部（后端约定），故不单列「草稿」筛选项
const statusTabs = [
  { label: '全部', value: 0 },
  { label: '待审核', value: 1 },
  { label: '已上架', value: 2 },
  { label: '已下架', value: 3 }
]

const shopId = ref(null)
const keyword = ref('')
const activeStatus = ref(0)
const scrollRef = ref(null)
const listRefreshing = ref(false)

const { list, loading, finished, refresh, loadMore } = usePageList((p) => {
  const params = { page: p.page, limit: p.limit, status: activeStatus.value }
  const kw = keyword.value.trim()
  if (kw) params.title = kw
  // 不传 shop_id 时由后端按当前商户查其名下全部店铺
  if (shopId.value) params.shop_id = Number(shopId.value)
  return getShopGoodsList(params)
})

// 每次进入（含新增商品返回）都刷新第一页
onShow(async () => {
  await refresh()
  await nextTick()
  if (scrollRef.value && scrollRef.value.sync) scrollRef.value.sync()
})

onLoad((query) => {
  shopId.value = Number(query && query.shop_id) || null
  // 未传 shop_id 时取当前登录商家归属店铺
  if (!shopId.value) {
    getShopApplyStatus().then((res) => {
      if (res && res.data) shopId.value = res.data.shop_id || res.data.id || null
    })
  }
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

// 新增团购商品
function goAdd() {
  const query = shopId.value ? `?shop_id=${shopId.value}` : ''
  uni.navigateTo({ url: `/pages/shop/goods/add${query}` })
}

// 编辑：只传 id 与店铺，编辑页自行请求详情接口回显（含全部子表数据）
function goEdit(g) {
  uni.navigateTo({
    url: `/pages/shop/goods/add?id=${g.id}&shop_id=${g.shop_id || shopId.value || ''}`
  })
}

function statusText(s) {
  return STATUS_MAP[Number(s)] || '未知'
}

function bizText(v) {
  return BIZ_MAP[v] || ''
}

function productText(v) {
  return PRODUCT_MAP[v] || ''
}

// 有效期：1 指定时间段 / 2 购买后 X 天内有效
function validText(g) {
  if (Number(g.valid_type) === 2 && Number(g.valid_days) > 0) {
    return `购买后 ${g.valid_days} 天内有效`
  }
  const start = dayText(g.valid_start)
  const end = dayText(g.valid_end)
  if (start && end) return `${start} 至 ${end}`
  return ''
}

function dayText(s) {
  return s ? String(s).slice(0, 10) : ''
}

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

  /* 搜索与新增：同形状同尺寸，仅靠底色/文字色区分主次，避免层级突兀 */
  .search-btn {
    flex-shrink: 0;
    margin-left: 16rpx;
    height: 64rpx;
    line-height: 64rpx;
    padding: 0 22rpx;
    border-radius: 16rpx;
    background: #f1f5f9;
    color: #475569;
    font-size: 26rpx;
    font-weight: 600;
  }

  .add-btn {
    flex-shrink: 0;
    margin-left: 14rpx;
    height: 64rpx;
    line-height: 64rpx;
    padding: 0 22rpx;
    border-radius: 16rpx;
    background: #eff6ff;
    color: #2563eb;
    font-size: 26rpx;
    font-weight: 700;
  }

}

/* ===== 状态筛选 ===== */
.tabs {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 24rpx;
  padding: 12rpx 16rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  .tab {
    flex: 1;
    text-align: center;
    font-size: 26rpx;
    font-weight: 600;
    color: #64748b;
    padding: 14rpx 0;
    border-radius: 999rpx;

    &.on {
      background: #2563eb;
      color: #fff;
      font-weight: 700;
    }
  }
}

/* ===== 新增入口 ===== */
.state-text {
  text-align: center;
  color: #94a3b8;
  font-size: 26rpx;
  padding: 120rpx 0;
}

/* 空态引导（已取消按钮，仅保留文案） */

/* ===== 商品卡片 ===== */
.goods-card {
  display: flex;
  background: #fff;
  border-radius: 24rpx;
  padding: 22rpx;
  margin-bottom: 22rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  .g-cover {
    width: 180rpx;
    height: 180rpx;
    border-radius: 16rpx;
    background: #e2e8f0;
    flex-shrink: 0;
    margin-right: 22rpx;
  }

  .g-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;

    .g-head {
      display: flex;
      align-items: flex-start;

      .g-title {
        flex: 1;
        min-width: 0;
        font-size: 30rpx;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.4;
        /* 单行显示，超出省略 */
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .g-status {
        flex-shrink: 0;
        margin-left: 16rpx;
        font-size: 20rpx;
        font-weight: 700;
        border-radius: 999rpx;
        padding: 4rpx 16rpx;

        &.st0 { color: #64748b; background: #f1f5f9; }
        &.st1 { color: #b45309; background: #fef3c7; }
        &.st2 { color: #15803d; background: #dcfce7; }
        &.st3 { color: #dc2626; background: #fee2e2; }
      }
    }

    .g-sub {
      margin-top: 8rpx;
      font-size: 22rpx;
      color: #64748b;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .g-tags {
      display: flex;
      flex-wrap: wrap;
      margin-top: 12rpx;

      .g-chip {
        font-size: 20rpx;
        color: #475569;
        background: #f1f5f9;
        border-radius: 6rpx;
        padding: 4rpx 12rpx;
        margin-right: 12rpx;
      }
    }

    .g-price-row {
      display: flex;
      align-items: baseline;
      margin-top: 14rpx;

      .g-price {
        font-size: 36rpx;
        font-weight: 900;
        color: #ff2d55;
        line-height: 1.1;
      }

      .g-orig {
        margin-left: 14rpx;
        font-size: 22rpx;
        color: #94a3b8;
        text-decoration: line-through;
      }
    }

    .g-meta {
      display: flex;
      flex-wrap: wrap;
      margin-top: 12rpx;
      font-size: 22rpx;
      color: #94a3b8;

      text + text {
        margin-left: 18rpx;
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
