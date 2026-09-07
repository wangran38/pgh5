<template>
  <view class="page-shell">
    <view class="page-header">
      <text class="page-title">商家入驻申请</text>
      <text class="page-subtitle">填写店铺资料，开启您的专属票根特惠专区</text>
    </view>

    <!-- 状态判断：若已有申请记录，展示状态面板 -->
    <view v-if="hasLoadedStatus && applyStatusData" class="status-card">
      <view class="status-badge" :class="getStatusClass(applyStatusData.status)">
        {{ getStatusText(applyStatusData.status) }}
      </view>
      <text class="status-desc">{{ getStatusDesc(applyStatusData.status) }}</text>

      <!-- 👇 当审核通过（status === 1）时，展示前往编辑资料的按钮 -->
      <view v-if="applyStatusData.status === 1" class="action-box">
        <button class="edit-shop-btn" @click="goToShopInfo">
          编辑/补充商家资料
        </button>
      </view>
    </view>

    <!-- 表单卡片区域（当没有申请记录或状态为审核驳回、未通过时可重新填写/提交） -->
    <block v-else>
      <view class="form-card">
        <!-- 商家名称 -->
        <view class="form-item">
          <text class="label"><text class="required">*</text>商家名称</text>
          <input
            v-model="formData.name"
            placeholder="请输入申请商家的完整名称"
            placeholder-style="color:#94a3b8"
            class="input-box"
          />
        </view>

        <!-- 所属分类 -->
        <view class="form-item" @click="openCategoryPicker">
          <text class="label"><text class="required">*</text>所属分类</text>
          <view class="picker-value-box">
            <text :class="selectedCategoryText ? 'val-text' : 'placeholder-text'">
              {{ selectedCategoryText || '请选择商家所属分类' }}
            </text>
            <text class="chevron">▾</text>
          </view>
        </view>

        <!-- 所属城市 -->
        <view class="form-item" @click="chooseLocation">
          <text class="label"><text class="required">*</text>所属城市 / 区域</text>
          <view class="picker-value-box">
            <text :class="selectedCityPathText ? 'val-text' : 'placeholder-text'">
              {{ selectedCityPathText || '请选择省 / 市 / 区县' }}
            </text>
            <text class="chevron">▾</text>
          </view>
        </view>

        <!-- 负责人姓名 -->
        <view class="form-item">
          <text class="label"><text class="required">*</text>联系负责人</text>
          <input
            v-model="formData.contact_name"
            placeholder="请输入负责人姓名"
            placeholder-style="color:#94a3b8"
            class="input-box"
          />
        </view>

        <!-- 负责人电话 -->
        <view class="form-item">
          <text class="label"><text class="required">*</text>负责人电话</text>
          <input
            type="number"
            maxlength="11"
            v-model="formData.contact_phone"
            placeholder="请输入11位手机号码"
            placeholder-style="color:#94a3b8"
            class="input-box"
          />
        </view>

        <!-- 详细地址 -->
        <view class="form-item column-item">
          <text class="label"><text class="required">*</text>详细经营地址</text>
          <textarea
            v-model="formData.address"
            placeholder="请输入街道门牌号等详细地址"
            placeholder-style="color:#94a3b8"
            class="textarea-box"
          />
        </view>
      </view>

      <!-- 提交按钮 -->
      <button class="submit-btn" :loading="submitting" @click="submitApply">
        提交入驻审核
      </button>
    </block>

    <view class="bottom-space"></view>

    <!-- 1. 分类选择弹窗 -->
    <view v-if="categoryPickerVisible" class="modal-mask" @click="closeCategoryPicker">
      <view class="picker-panel" @click.stop>
        <view class="panel-header">
          <view class="header-titles">
            <text class="panel-title">选择商家分类</text>
            <text class="panel-path">选择与您店铺最契合的类目</text>
          </view>
          <text class="panel-close" @click="closeCategoryPicker">✕</text>
        </view>

        <view v-if="loadingCategories" class="loading-state">分类加载中...</view>
        <scroll-view v-else scroll-y class="region-scroll">
          <view class="region-grid">
            <view
              v-for="item in categoryList"
              :key="item.id || item.category_id"
              class="region-chip"
              :class="{ active: formData.category_id === (item.id || item.category_id) }"
              @click="onSelectCategoryItem(item)"
            >
              {{ item.name || item.title || item.category_name }}
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 2. 三级联动城市选择弹窗 -->
    <view v-if="cityPickerVisible" class="modal-mask" @click="closeCityPicker">
      <view class="picker-panel" @click.stop>
        <view class="panel-header">
          <view class="header-titles">
            <text class="panel-title">选择所在地区</text>
            <text class="panel-path">{{ currentPathText }}</text>
          </view>
          <text class="panel-close" @click="closeCityPicker">✕</text>
        </view>

        <view class="breadcrumb-bar" v-if="currentStep !== 'province'">
          <text class="back-link" @click="navBackStep">‹ 返回上一级</text>
        </view>

        <view v-if="loadingCities" class="loading-state">地区数据加载中...</view>
        <scroll-view v-else scroll-y class="region-scroll">
          <view class="region-grid">
            <view
              v-for="item in regionOptions"
              :key="item.Id || item.id"
              class="region-chip"
              @click="onSelectRegionItem(item)"
            >
              {{ getRegionName(item) }}
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getShopCategories, applyShop, getShopApplyStatus } from '@/api/shop.js'
import { getCitiesByPid } from '@/api/city.js'

// 表单数据模型
const formData = ref({
  name: '',
  category_id: '',
  city_id: '',
  contact_name: '',
  contact_phone: '',
  address: '',
  logo: '',
  cover_images: '',
  longitude: 116.397428,
  latitude: 39.90923,
  discounts: '',
  description: ''
})

const submitting = ref(false)

// 申请状态相关变量
const hasLoadedStatus = ref(false)   // 是否已完成状态请求
const applyStatusData = ref(null)    // 存储后端返回的 status 和 has_apply 数据

// 初始化页面时请求状态接口
async function checkShopApplyStatus() {
  const token = uni.getStorageSync('pgtoken')
  if (!token) {
    hasLoadedStatus.value = true
    return
  }

  try {
    const res = await getShopApplyStatus()
    // 状态码为 200 表示成功查询到记录
    if (res && res.code === 200 && res.data) {
      const { has_apply, status, shop_id, id } = res.data
      // 判断 has_apply 为真（如 "1" 或 true）时表示已有申请记录
      if (String(has_apply) === '1' || has_apply === true) {
        applyStatusData.value = {
          has_apply,
          status: Number(status),
          shop_id: shop_id || id // 兼容不同字段的店铺 ID
        }
      }
    }
  } catch (err) {
    console.error('获取商家申请状态异常:', err)
  } finally {
    hasLoadedStatus.value = true
  }
}

// 跳转到店铺资料编辑/补充页面
function goToShopInfo() {
  const shopId = applyStatusData.value?.shop_id
  if (!shopId) {
    return uni.showToast({ title: '未获取到店铺ID', icon: 'none' })
  }
  uni.navigateTo({
    url: `/pages/shop/shopinfo/shopinfo?shop_id=${shopId}`
  })
}

// 状态文本解析
function getStatusText(status) {
  const map = {
    '-1': '审核未通过',
    '0': '审核中',
    '1': '营业中',
    '2': '休息中',
    '3': '已冻结',
    '4': '审核驳回'
  }
  return map[String(status)] || '已提交申请'
}

// 状态描述解析
function getStatusDesc(status) {
  const descMap = {
    '0': '您的商家入驻申请正在加急审核中，请耐心等待...',
    '1': '您的店铺已成功入驻并处于营业状态！',
    '2': '您的店铺目前处于休息中。',
    '3': '您的店铺已被冻结，如有疑问请联系客服。',
    '-1': '您的申请未通过审核，请修改后重新提交。',
    '4': '您的申请已被驳回，请根据要求重新调整信息。'
  }
  return descMap[String(status)] || '您已提交过商家入驻申请。'
}

// 状态对应的样式类
function getStatusClass(status) {
  if (status === 1) return 'badge-success'
  if (status === 0) return 'badge-warning'
  return 'badge-danger'
}

// --- 分类选择相关 ---
const categoryPickerVisible = ref(false)
const loadingCategories = ref(false)
const categoryList = ref([])
const selectedCategoryText = ref('')

function openCategoryPicker() {
  categoryPickerVisible.value = true
  if (categoryList.value.length === 0) {
    loadCategories()
  }
}
function closeCategoryPicker() {
  categoryPickerVisible.value = false
}

async function loadCategories() {
  loadingCategories.value = true
  try {
    const res = await getShopCategories({ parent_id: -1 })
    categoryList.value = extractListData(res)
  } catch (err) {
    console.error('获取分类失败', err)
  } finally {
    loadingCategories.value = false
  }
}

function onSelectCategoryItem(item) {
  const id = item.id ?? item.category_id ?? item.code
  const name = item.name || item.title || item.category_name
  formData.value.category_id = id
  selectedCategoryText.value = name
  closeCategoryPicker()
}

// --- 城市三级联动弹窗相关 ---
const cityPickerVisible = ref(false)
const loadingCities = ref(false)
const currentStep = ref('province')
const selectedProvince = ref(null)
const selectedCity = ref(null)
const selectedDistrict = ref(null)
const regionOptions = ref([])
const selectedCityPathText = ref('')

function getRegionName(item) {
  if (!item) return ''
  const short = item.shortname ? item.shortname.trim() : ''
  return short || item.name || item.title || item.area_name || item.city_name || '未知地区'
}

const currentPathText = computed(() => {
  const pName = getRegionName(selectedProvince.value)
  const cName = getRegionName(selectedCity.value)
  if (currentStep.value === 'province') return '选择省份 / 直辖市'
  if (currentStep.value === 'city') return `${pName} › 选择城市/县`
  return `${pName} › ${cName} › 选择区县`
})

async function chooseLocation() {
  cityPickerVisible.value = true
  currentStep.value = 'province'
  selectedProvince.value = null
  selectedCity.value = null
  selectedDistrict.value = null
  await fetchRegionsByPid(0)
}

function closeCityPicker() {
  cityPickerVisible.value = false
}

function navBackStep() {
  if (currentStep.value === 'district') {
    currentStep.value = 'city'
    selectedCity.value = null
    const pid = selectedProvince.value?.Id ?? selectedProvince.value?.id
    fetchRegionsByPid(pid)
  } else if (currentStep.value === 'city') {
    currentStep.value = 'province'
    selectedProvince.value = null
    fetchRegionsByPid(0)
  }
}

async function fetchRegionsByPid(pid = 0) {
  loadingCities.value = true
  try {
    const res = await getCitiesByPid({ pid })
    regionOptions.value = extractListData(res)
  } catch (error) {
    console.error('获取地区失败:', error)
  } finally {
    loadingCities.value = false
  }
}

async function onSelectRegionItem(item) {
  const targetId = item.Id ?? item.id
  const targetName = getRegionName(item)
  const isDirectCity = ['北京', '天津', '上海', '重庆', '香港', '澳门', '台湾'].includes(targetName)

  if (currentStep.value === 'province') {
    selectedProvince.value = item
    if (isDirectCity) {
      finalizeCitySelection(targetId, targetName)
    } else {
      currentStep.value = 'city'
      await fetchRegionsByPid(targetId)
    }
  } else if (currentStep.value === 'city') {
    selectedCity.value = item
    if (targetName === '直辖县级') {
      loadingCities.value = true
      try {
        const res = await getCitiesByPid({ pid: targetId })
        const subList = extractListData(res)
        if (subList && subList.length > 0) {
          currentStep.value = 'district'
          regionOptions.value = subList
          return
        }
      } catch (e) {
        console.error(e)
      } finally {
        loadingCities.value = false
      }
    }

    loadingCities.value = true
    try {
      const res = await getCitiesByPid({ pid: targetId })
      const subList = extractListData(res)
      if (subList && subList.length > 0) {
        currentStep.value = 'district'
        regionOptions.value = subList
      } else {
        finalizeCitySelection(targetId, targetName)
      }
    } catch (e) {
      finalizeCitySelection(targetId, targetName)
    } finally {
      loadingCities.value = false
    }
  } else {
    selectedDistrict.value = item
    finalizeCitySelection(targetId, targetName)
  }
}

function finalizeCitySelection(id, name) {
  formData.value.city_id = id

  const pName = getRegionName(selectedProvince.value)
  const cName = getRegionName(selectedCity.value)
  const dName = getRegionName(selectedDistrict.value)

  let pathArr = []
  if (pName) pathArr.push(pName)
  if (cName && cName !== pName) pathArr.push(cName)
  if (dName) pathArr.push(dName)

  selectedCityPathText.value = pathArr.join(' / ') || name
  closeCityPicker()
}

function extractListData(res) {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (Array.isArray(res.list)) return res.list
  if (res.data && Array.isArray(res.data.list)) return res.data.list
  return []
}

// 提交申请表单
async function submitApply() {
  const token = uni.getStorageSync('pgtoken')
  if (!token) {
    uni.showToast({ title: '请先登录后再提交申请', icon: 'none' })
    return
  }

  if (!formData.value.name) return uni.showToast({ title: '请输入商家名称', icon: 'none' })
  if (!formData.value.category_id) return uni.showToast({ title: '请选择商家所属分类', icon: 'none' })
  if (!formData.value.city_id) return uni.showToast({ title: '请选择所属城市区域', icon: 'none' })
  if (!formData.value.contact_name) return uni.showToast({ title: '请输入联系负责人姓名', icon: 'none' })
  if (!formData.value.contact_phone || !(/^1[3-9]\d{9}$/.test(formData.value.contact_phone))) {
    return uni.showToast({ title: '请输入正确的11位手机号', icon: 'none' })
  }
  if (!formData.value.address) return uni.showToast({ title: '请输入详细经营地址', icon: 'none' })

  submitting.value = true
  try {
    const res = await applyShop(formData.value)

    if (res.code === 200 || res.error_code === 0 || res.code === 0) {
      uni.showToast({ title: '提交成功，请等待审核', icon: 'success' })
      setTimeout(() => {
        checkShopApplyStatus() // 提交成功后重新校验状态，切换为状态展示视图
      }, 1500)
    } else {
      uni.showToast({ title: res.msg || res.message || '提交失败', icon: 'none' })
    }
  } catch (err) {
    console.error('提交入驻申请异常:', err)
    uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadCategories()
  checkShopApplyStatus() // 一进页面就请求状态
})
</script>

<style lang="scss" scoped>
.page-shell {
  min-height: 100vh;
  padding: 24rpx;
  background-color: #f8fafc;
  box-sizing: border-box;
  color: #1e293b;
}

.page-header {
  margin-bottom: 24rpx;
  .page-title { font-size: 36rpx; font-weight: 900; color: #0f172a; display: block; }
  .page-subtitle { font-size: 22rpx; color: #64748b; margin-top: 6rpx; display: block; }
}

/* 状态展示卡片样式 */
.status-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 48rpx 32rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);
  margin-top: 40rpx;

  .status-badge {
    display: inline-block;
    padding: 12rpx 32rpx;
    border-radius: 40rpx;
    font-size: 30rpx;
    font-weight: 800;
    margin-bottom: 20rpx;

    &.badge-success { background: #dcfce7; color: #166534; }
    &.badge-warning { background: #fef9c3; color: #854d0e; }
    &.badge-danger { background: #fee2e2; color: #991b1b; }
  }

  .status-desc {
    font-size: 26rpx;
    color: #64748b;
    display: block;
  }
}

.action-box {
  margin-top: 36rpx;
  padding: 0 40rpx;

  .edit-shop-btn {
    background: #2563eb;
    color: #fff;
    font-weight: 700;
    font-size: 28rpx;
    height: 80rpx;
    line-height: 80rpx;
    border-radius: 16rpx;
    border: none;
    box-shadow: 0 6rpx 16rpx rgba(37, 99, 235, 0.2);
    &::after { border: none; }
  }
}

.form-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);
}

.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f1f5f9;

  &:last-child { border-bottom: none; }

  &.column-item {
    flex-direction: column;
    align-items: flex-start;
    .label { margin-bottom: 12rpx; }
  }

  .label {
    font-size: 26rpx;
    font-weight: 700;
    color: #334155;
    min-width: 160rpx;
    .required { color: #dc2626; margin-right: 4rpx; }
  }

  .input-box {
    flex: 1;
    text-align: right;
    font-size: 26rpx;
    color: #0f172a;
  }

  .textarea-box {
    width: 100%;
    height: 140rpx;
    background: #f8fafc;
    border: 1rpx solid #e2e8f0;
    border-radius: 12rpx;
    padding: 16rpx;
    box-sizing: border-box;
    font-size: 26rpx;
    color: #0f172a;
    text-align: left;
  }

  .picker-value-box {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex: 1;
    .val-text { font-size: 26rpx; font-weight: 600; color: #0f172a; }
    .placeholder-text { font-size: 26rpx; color: #94a3b8; }
    .chevron { font-size: 22rpx; color: #94a3b8; margin-left: 8rpx; }
  }
}

.submit-btn {
  margin-top: 40rpx;
  background: #2563eb;
  color: #fff;
  font-weight: 800;
  font-size: 30rpx;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 20rpx;
  border: none;
  box-shadow: 0 8rpx 20rpx rgba(37, 99, 235, 0.25);
  &::after { border: none; }
}

.bottom-space { height: 60rpx; }

/* 弹窗通用样式 */
.modal-mask {
  position: fixed; z-index: 999; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.45); backdrop-filter: blur(2px);
  display: flex; align-items: flex-end;
}

.picker-panel {
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 36rpx;
  box-sizing: border-box;
  max-height: 75vh;
  display: flex;
  flex-direction: column;

  .panel-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .panel-title { font-size: 32rpx; font-weight: 900; color: #0f172a; display: block; }
  .panel-path { font-size: 22rpx; color: #2563eb; margin-top: 4rpx; display: block; font-weight: 600; }
  .panel-close { font-size: 32rpx; color: #94a3b8; padding: 0 10rpx; }

  .breadcrumb-bar {
    margin-top: 16rpx;
    .back-link { font-size: 22rpx; color: #2563eb; font-weight: 700; }
  }

  .loading-state { text-align: center; padding: 40rpx; color: #64748b; font-size: 24rpx; }
  .region-scroll { margin-top: 24rpx; max-height: 55vh; }
  .region-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }

  .region-chip {
    padding: 20rpx 10rpx;
    background: #f1f5f9;
    border: 1rpx solid #e2e8f0;
    border-radius: 12rpx;
    text-align: center;
    font-size: 24rpx;
    color: #334155;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;

    &.active {
      background: #eff6ff;
      border-color: #93c5fd;
      color: #1d4ed8;
      font-weight: 800;
    }
  }
}
</style>
