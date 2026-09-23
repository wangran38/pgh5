<template>
  <view class="gc">
    <!-- 月份切换 -->
    <view class="gc-head">
      <text class="gc-nav" :class="{ dis: !canPrev }" @click="changeMonth(-1)">‹</text>
      <text class="gc-title">{{ viewYear }} 年 {{ viewMonth }} 月</text>
      <text class="gc-nav" :class="{ dis: !canNext }" @click="changeMonth(1)">›</text>
    </view>

    <!-- 星期表头 -->
    <view class="gc-week">
      <text v-for="w in WEEK" :key="w" class="gc-wk">{{ w }}</text>
    </view>

    <!-- 日期格子 -->
    <view class="gc-grid">
      <view
        v-for="(cell, i) in cells"
        :key="i"
        class="gc-cell"
        :class="cellClass(cell)"
        @click="onPick(cell)"
      >
        <template v-if="cell.date">
          <text class="gc-day">{{ cell.day }}</text>
          <text class="gc-sub" v-if="cell.start">入住</text>
          <text class="gc-sub" v-else-if="cell.end">离店</text>
          <text class="gc-sub" v-else>{{ cell.subText }}</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// 可复用日历：按日历价数组渲染每日「价格/库存/可售」，点击选择日期。
// 未命中日期的计价/库存按「未命中回落策略」回落到主表（fallbackPrice / fallbackStock）。
const props = defineProps({
  // 日历记录数组：[{ sku_id, date(YYYY-MM-DD 或 ISO), price, stock, status }]
  calendar: { type: Array, default: () => [] },
  // 当前规格 ID：0 表示商品维度（无规格）
  skuId: { type: [Number, String], default: 0 },
  // 未命中回落：主表售价 / 库存
  fallbackPrice: { type: [Number, String], default: 0 },
  fallbackStock: { type: [Number, String], default: 0 },
  // 选中日期（v-model）
  modelValue: { type: String, default: '' },
  // 可选范围（YYYY-MM-DD）
  minDate: { type: String, default: '' },
  maxDate: { type: String, default: '' },
  // 选择模式：single 单选（默认）/ range 区间（入住-离店）
  mode: { type: String, default: 'single' },
  // 区间模式初始值（回显用）
  start: { type: String, default: '' },
  end: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'change'])

// 区间选择（mode='range'）：入住日 / 离店日 / 晚数
const checkin = ref(props.start || '')
const checkout = ref(props.end || '')

const nights = computed(() => {
  if (!checkin.value || !checkout.value) return 0
  const a = new Date(`${checkin.value}T00:00:00`).getTime()
  const b = new Date(`${checkout.value}T00:00:00`).getTime()
  return Math.max(0, Math.round((b - a) / 86400000))
})

// 校验区间 [a, b) 内每一晚均可售（任一晚不可售则整段不可选）
function allNightsSellable(a, b) {
  const DAY = 86400000
  let t = new Date(`${a}T00:00:00`).getTime()
  const end = new Date(`${b}T00:00:00`).getTime()
  while (t < end) {
    if (!resolve(fmtDate(new Date(t))).sellable) return false
    t += DAY
  }
  return true
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

function pad2(n) {
  return String(n).padStart(2, '0')
}
function fmtDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const minStr = computed(() => (props.minDate ? String(props.minDate).slice(0, 10) : ''))
const maxStr = computed(() => (props.maxDate ? String(props.maxDate).slice(0, 10) : ''))

// 视图月份：优先选中日期所在月，否则取可选范围起点，最后取今天
const initDate = props.modelValue || minStr.value || fmtDate(new Date())
const _init = new Date(`${String(initDate).slice(0, 10)}T00:00:00`)
const viewYear = ref(_init.getFullYear())
const viewMonth = ref(_init.getMonth() + 1) // 1-12

// 选中日期变化（如默认选日、外部设置）时，把视图切到该月，避免与已选日期不一致
watch(
  () => props.modelValue,
  (v) => {
    if (!v) return
    const d = new Date(`${String(v).slice(0, 10)}T00:00:00`)
    if (isNaN(d.getTime())) return
    if (d.getFullYear() !== viewYear.value || d.getMonth() + 1 !== viewMonth.value) {
      viewYear.value = d.getFullYear()
      viewMonth.value = d.getMonth() + 1
    }
  }
)

// 按日期解析价格/库存/可售：命中日历用日历值，未命中回落主表
function resolve(dateStr) {
  const skuId = Number(props.skuId || 0)
  const hit = props.calendar.find(
    (c) => Number(c.sku_id || 0) === skuId && String(c.date || '').slice(0, 10) === dateStr
  )
  if (hit) {
    const stock = Number(hit.stock || 0)
    const open = Number(hit.status) === 1
    return {
      price: Number(hit.price != null ? hit.price : props.fallbackPrice),
      stock,
      sellable: open && stock > 0,
      closed: !open
    }
  }
  const stock = Number(props.fallbackStock || 0)
  return {
    price: Number(props.fallbackPrice || 0),
    stock,
    sellable: stock > 0,
    closed: false
  }
}

const cells = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value - 1, 1)
  const lead = first.getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value, 0).getDate()
  const list = []
  for (let i = 0; i < lead; i++) list.push({ date: '' })

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear.value}-${pad2(viewMonth.value)}-${pad2(d)}`
    const info = resolve(dateStr)
    let disabled = false
    let subText = `¥${info.price}`
    if (minStr.value && dateStr < minStr.value) {
      disabled = true
    } else if (maxStr.value && dateStr > maxStr.value) {
      disabled = true
    } else if (!info.sellable) {
      disabled = true
      subText = info.closed ? '停售' : '售罄'
    }
    const isStart = props.mode === 'range' && dateStr === checkin.value
    const isEnd = props.mode === 'range' && dateStr === checkout.value
    const inRange =
      props.mode === 'range' && checkin.value && checkout.value && dateStr > checkin.value && dateStr < checkout.value
    list.push({
      date: dateStr,
      day: d,
      price: info.price,
      disabled,
      subText,
      // 高亮：单选模式用 modelValue；区间模式只由 start(入住)/end(离店) 决定。
      // 若区间模式也用 modelValue，会出现「默认日期」与「入住日」两个格子同时高亮
      selected: props.mode !== 'range' && dateStr === String(props.modelValue || '').slice(0, 10),
      start: isStart,
      end: isEnd,
      inRange
    })
  }
  return list
})

// 是否还能往前/往后翻月
const canPrev = computed(() => {
  if (!minStr.value) return true
  return `${viewYear.value}-${pad2(viewMonth.value)}` > minStr.value.slice(0, 7)
})
const canNext = computed(() => {
  if (!maxStr.value) return true
  return `${viewYear.value}-${pad2(viewMonth.value)}` < maxStr.value.slice(0, 7)
})

function changeMonth(delta) {
  if (delta < 0 && !canPrev.value) return
  if (delta > 0 && !canNext.value) return
  let y = viewYear.value
  let m = viewMonth.value + delta
  if (m < 1) {
    m = 12
    y--
  } else if (m > 12) {
    m = 1
    y++
  }
  viewYear.value = y
  viewMonth.value = m
}

function cellClass(cell) {
  return {
    empty: !cell.date,
    dis: cell.disabled,
    on: cell.selected || cell.start || cell.end,
    inr: cell.inRange
  }
}

function onPick(cell) {
  if (!cell.date || cell.disabled) return
  // 区间模式：第一次点=入住，第二次点=离店（需晚于入住且整段可售）
  if (props.mode === 'range') {
    if (!checkin.value || (checkin.value && checkout.value)) {
      checkin.value = cell.date
      checkout.value = ''
    } else if (cell.date <= checkin.value) {
      // 早于或等于入住日 → 以该日作为新的入住日重选
      checkin.value = cell.date
      checkout.value = ''
    } else if (!allNightsSellable(checkin.value, cell.date)) {
      uni.showToast({ title: '区间内含不可售日期', icon: 'none' })
      return
    } else {
      checkout.value = cell.date
    }
    emit('change', { checkin: checkin.value, checkout: checkout.value, nights: nights.value })
    return
  }
  // 单选模式（原逻辑）
  if (cell.date === props.modelValue) return
  emit('update:modelValue', cell.date)
  emit('change', cell.date)
}
</script>

<style lang="scss" scoped>
.gc {
  background: #fff;
}

.gc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 12rpx;

  .gc-title {
    font-size: 26rpx;
    font-weight: 800;
    color: #0f172a;
  }

  .gc-nav {
    width: 52rpx;
    height: 52rpx;
    line-height: 48rpx;
    text-align: center;
    border-radius: 50%;
    background: #f1f5f9;
    color: #0f172a;
    font-size: 30rpx;

    &.dis {
      color: #cbd5e1;
      background: #f8fafc;
    }
  }
}

.gc-week {
  display: flex;

  .gc-wk {
    flex: 1;
    text-align: center;
    font-size: 20rpx;
    color: #94a3b8;
    padding-bottom: 8rpx;
  }
}

.gc-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6rpx;
}

.gc-cell {
  height: 74rpx;
  box-sizing: border-box;
  border-radius: 10rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f8fafc;

  &.empty {
    background: transparent;
  }

  .gc-day {
    font-size: 24rpx;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.15;
  }

  .gc-sub {
    font-size: 16rpx;
    color: #ff6a00;
    line-height: 1.2;
  }

  &.dis {
    .gc-day {
      color: #cbd5e1;
    }

    .gc-sub {
      color: #cbd5e1;
    }
  }

  &.inr {
    background: #dbeafe;

    .gc-day {
      color: #1e40af;
    }
  }

  &.on {
    background: #2563eb;

    .gc-day {
      color: #fff;
    }

    .gc-sub {
      color: #dbeafe;
    }
  }
}
</style>
