<template>
  <view class="page">
    <!-- 自动滚动容器：自带下拉刷新与触底加载 -->
    <auto-scroll
      ref="scrollRef"
      refresher-enabled
      :refresher-triggered="listRefreshing"
      @refresherrefresh="onAutoRefresh"
      @scrolltolower="onLower"
    >
      <view v-if="loading && list.length === 0" class="state-text">加载中...</view>

      <template v-else-if="list.length > 0">
        <view v-for="t in list" :key="t.id" class="ticket-card">
          <!-- 票根图 -->
          <image
            class="ticket-img"
            :src="t.user_image_url || ''"
            mode="aspectFill"
            @click="previewTicket(t)"
          />

          <!-- 信息 -->
          <view class="info">
            <view class="row-top">
              <text class="title">{{ t.title || '未知票根' }}</text>
              <text class="status" :class="isExchanged(t) ? 'done' : 'ok'">
                {{ isExchanged(t) ? '已兑换' : '可用' }}
              </text>
            </view>

            <view class="chip-row">
              <text v-if="t.ticket_category" class="chip">{{ t.ticket_category }}</text>
              <text v-if="t.ticket_sn" class="chip">{{ t.ticket_sn }}</text>
            </view>

            <view class="meta">
              <text v-if="t.event_date">📅 {{ fmtTime(t.event_date) }}</text>
              <text v-if="t.seat">💺 {{ t.seat }}</text>
            </view>
          </view>
        </view>

        <view class="load-more">
          <text v-if="loading">加载中...</text>
          <text v-else-if="finished">— 没有更多了 —</text>
          <text v-else @click="loadMore">上拉加载更多</text>
        </view>
      </template>

      <view v-else-if="!loading" class="state-text">暂无票根，去首页上传识别一张吧</view>
    </auto-scroll>
  </view>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getUserTicketList } from '@/api/user.js'
import { usePageList } from '@/utils/usePageList.js'
import AutoScroll from '@/components/auto-scroll/auto-scroll.vue'

// 分页拉取我的票根
const { list, loading, finished, refresh, loadMore } = usePageList((p) => getUserTicketList(p))

// 滚动容器引用 + 下拉刷新状态
const scrollRef = ref(null)
const listRefreshing = ref(false)

// 每次进入页面都刷新（从上传/兑换页返回可见最新）
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

// 容器内下拉刷新
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

// 已兑换判断：exchange_status>0 或已回填 exchanged_at / coupon_id
function isExchanged(t) {
  return (t && (t.exchange_status > 0 || !!t.exchanged_at || t.coupon_id > 0)) || false
}

// 时间 "2026-04-11 19:30:00" / "2026-09-08T11:53:15+08:00" → "2026-04-11 19:30"
function fmtTime(s) {
  if (!s) return ''
  return String(s).replace('T', ' ').slice(0, 16)
}

// 点击票根图放大预览
function previewTicket(t) {
  if (!t.user_image_url) return
  uni.previewImage({
    current: t.user_image_url,
    urls: [t.user_image_url]
  })
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

.state-text {
  text-align: center;
  color: #94a3b8;
  font-size: 26rpx;
  padding: 140rpx 0;
}

.ticket-card {
  display: flex;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(15, 23, 42, 0.04);

  .ticket-img {
    width: 190rpx;
    height: 240rpx;
    border-radius: 12rpx;
    background: #e2e8f0;
    flex-shrink: 0;
  }

  .info {
    flex: 1;
    min-width: 0;
    margin-left: 22rpx;
    display: flex;
    flex-direction: column;

    .row-top {
      display: flex;
      align-items: flex-start;

      .title {
        flex: 1;
        font-size: 28rpx;
        font-weight: 800;
        color: #0f172a;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
        margin-right: 12rpx;
      }

      .status {
        flex-shrink: 0;
        font-size: 20rpx;
        padding: 4rpx 14rpx;
        border-radius: 999rpx;
        font-weight: 700;

        &.ok { color: #15803d; background: #dcfce7; }
        &.done { color: #b45309; background: #fef3c7; }
      }
    }

    .chip-row {
      display: flex;
      flex-wrap: wrap;
      margin-top: 14rpx;

      .chip {
        font-size: 20rpx;
        color: #2563eb;
        background: #eff6ff;
        border-radius: 6rpx;
        padding: 3rpx 12rpx;
        margin-right: 12rpx;
        margin-bottom: 8rpx;
        max-width: 100%;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    }

    .meta {
      display: flex;
      flex-direction: column;
      margin-top: auto;
      padding-top: 12rpx;

      text {
        font-size: 22rpx;
        color: #64748b;
        margin-top: 6rpx;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
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
