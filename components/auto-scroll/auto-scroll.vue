<template>
  <scroll-view
    ref="scrollViewRef"
    class="auto-scroll"
    :scroll-y="canScroll"
    :refresher-enabled="refresherEnabled"
    :refresher-triggered="innerTriggered"
    refresher-default-style="black"
    @refresherrefresh="onRefresh"
    @scrolltolower="$emit('scrolltolower')"
  >
    <!-- 内容由父级放入；内部包一层便于测量 -->
    <view class="auto-scroll-inner">
      <slot />
    </view>
  </scroll-view>
</template>

<script setup>
import { ref, nextTick, watch, onUnmounted } from 'vue'

const props = defineProps({
  // 是否开启下拉刷新
  refresherEnabled: { type: Boolean, default: false },
  // 下拉刷新动画状态（父级控制）
  refresherTriggered: { type: Boolean, default: false }
})

const emit = defineEmits(['refresherrefresh', 'scrolltolower'])

const scrollViewRef = ref(null)
// 开启下拉刷新时恒可滚（否则 refresher 失效）；未开启时内容排满才允许滚动，避免虚滚
const canScroll = ref(props.refresherEnabled)

// ===== 下拉刷新动画控制 =====
// 父级 prop 只作为"刷新中"信号；组件内部保证展开态至少渲染一帧 + 最短可见时长，
// 避免接口秒回时 true→false 在同一渲染批次抵消导致 refresher 卡住不回弹
const innerTriggered = ref(false)
let refreshStartAt = 0
let endTimer = null

watch(
  () => props.refresherTriggered,
  (val) => {
    if (endTimer) {
      clearTimeout(endTimer)
      endTimer = null
    }
    if (val) {
      refreshStartAt = Date.now()
      innerTriggered.value = true
    } else if (innerTriggered.value) {
      // 至少让转圈可见 500ms，再真正收起
      const remain = Math.max(0, 500 - (Date.now() - refreshStartAt))
      endTimer = setTimeout(() => {
        innerTriggered.value = false
        endTimer = null
        // 展开期间跳过的测量，收起后补测
        sync()
      }, remain)
    }
  }
)

// 用户下拉触发，通知父级开始刷新
function onRefresh() {
  emit('refresherrefresh')
}

// 测量实际是否溢出（H5 真正滚动体是内部 .uni-scroll-view）
function measure() {
  // 开启下拉刷新时 scroll-y 必须恒为 true：
  // scroll-y=false 会连同 refresher 的触摸下拉检测一起禁用，手势冒泡成页面级滚动
  if (props.refresherEnabled) {
    canScroll.value = true
    return
  }
  if (typeof document === 'undefined') {
    canScroll.value = true
    return
  }
  const host = scrollViewRef.value && (scrollViewRef.value.$el || scrollViewRef.value)
  if (!host || !host.querySelector) return

  const box = host.querySelector('.uni-scroll-view') || host
  const inner = host.querySelector('.auto-scroll-inner') || host
  const scrollH = inner.scrollHeight || box.scrollHeight || 0
  const clientH = box.clientHeight || 0
  canScroll.value = scrollH > clientH + 2
}

// 内容变化后调用重新测量
function sync() {
  nextTick(measure)
}

// 内容变更（异步渲染/窗口尺寸）后自动复核
if (typeof window !== 'undefined') {
  window.addEventListener('resize', sync)
}

onUnmounted(() => {
  if (endTimer) clearTimeout(endTimer)
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', sync)
  }
})

defineExpose({ sync, canScroll })
</script>

<style lang="scss" scoped>
/* 父级用 flex 分配高度；内部内容变化时按需滚动 */
.auto-scroll {
  flex: 1;
  min-height: 0;
  height: 0;
  width: 100%;
  overscroll-behavior: none;
}
</style>
