<template>
	<view class="page-shell">
		<!-- 顶栏：融合官方红蓝 Logo 与 登录/会员状态 -->
		<view class="topbar">
			<view class="brand-container">
				<image class="brand-logo-img" src="/static/logo.png" mode="heightFix" />
				<text class="brand-slogan">您的每一次精彩我都懂</text>
			</view>

			<view class="topbar-right">
				<!-- 城市选择按钮 -->
				<view class="location-chip" @click="chooseLocation">
					<text class="pin">📍</text>
					<text class="loc-name">{{ currentLocation || '选择城市' }}</text>
					<text class="chevron">▾</text>
				</view>

				<!-- 会员登录 / 个人中心胶囊 -->
				<view class="member-chip" @click="handleMemberClick">
					<template v-if="isLoggedIn">
						<image class="user-avatar" :src="userInfo.avatar || '/static/default-avatar.png'"
							mode="aspectFill" />
						<text class="user-name">{{ userInfo.nickname || '会员' }}</text>
					</template>
					<template v-else>
						<text class="login-icon">👤</text>
						<text class="login-text">登录</text>
					</template>
				</view>
			</view>
		</view>

		<!-- 核心 Banner 卡片 -->
		<view class="hero-banner">
			<view class="hero-content">
				<view class="badge">TICKET BENEFITS</view>
				<text class="hero-title">{{ isLoggedIn ? `欢迎回来，${userInfo.nickname}` : '凭票根 · 享特惠' }}</text>
				<text class="hero-subtitle">{{ isLoggedIn ? '您已解锁云端电子票根夹，随时享受专属折扣' : '全国景区/餐饮/酒店票根 实时打折立减' }}</text>
				<button class="hero-btn" @click="uploadTicket">
					<text class="btn-icon">📷</text> {{ isLoggedIn ? '上传新票根领福利' : '登录/上传票根领福利' }}
				</button>
			</view>
			<view class="hero-decoration">
				<view class="ticket-stub">
					<text class="stub-tag">CP</text>
					<text class="stub-text">专属票根</text>
				</view>
			</view>
		</view>

		<!-- 票根识别快捷通告 -->
		<view class="notice-bar" @click="uploadTicket">
			<view class="notice-tag">福利</view>
			<text class="notice-text">拿任意高铁/门票/酒店票根，最高可抵扣 60 元</text>
			<text class="notice-arrow">去识别 ›</text>
		</view>

		<!-- 商家分类网格 -->
		<view class="section-head">
			<text class="head-title">探索好店</text>
			<text class="head-all" @click="resetCategoryFilter">查看全部 ›</text>
		</view>

		<view class="category-grid">
			<view v-if="loadingCategories" class="loading-state">加载分类中...</view>
			<template v-else-if="categoryList && categoryList.length > 0">
				<view v-for="(item, index) in categoryList" :key="getCategoryId(item, index)" class="cat-card"
					:class="{ active: isCategoryActive(item) }" @click="onSelectCategory(item)">
					<text class="cat-title">{{ getCategoryName(item) }}</text>
					<text class="cat-count" v-if="getCategoryCount(item)">
						{{ getCategoryCount(item) }}家特惠
					</text>
				</view>
			</template>
			<view v-else class="empty-state">暂无分类数据</view>
		</view>

		<!-- 商家列表区：独立滚动 + 下拉刷新（内容排满容器才允许滚动） -->
		<scroll-view class="list-scroll" scroll-y refresher-enabled
			:refresher-triggered="listRefreshing" refresher-default-style="black" @refresherrefresh="onListRefresh">
			<!-- 商家推荐列表 Heading -->
			<view class="list-heading">
				<view class="title-wrap">
					<text class="dot"></text>
					<text class="title">
						{{ recognizedStore ? `已匹配: ${recognizedStore}` : (activeCategory ? `专区 · ${getCategoryName(activeCategory)}` : `${currentLocation} · 热门票根优惠店`) }}
					</text>
				</view>
				<text class="sub-tip">凭票根到店即享</text>
			</view>

			<!-- 商家推荐列表 -->
			<view v-if="loadingShops" class="loading-state">商家加载中...</view>
			<view v-else-if="!shopList || shopList.length === 0" class="empty-state">该分类下暂无商家</view>

			<view v-else v-for="shop in shopList" :key="shop.id" class="shop-card" @click="openShopDetail(shop)">
				<view class="shop-cover"
					:style="{ background: shop.themeColor || 'linear-gradient(135deg, #2563eb, #1d4ed8)' }">
					<image v-if="shop.logo" class="cover-img" :src="firstImage(shop.logo)" mode="aspectFill" />
					<text class="cover-badge">{{ shop.status === 1 ? '营业中' : '休息中' }}</text>
					<text class="cover-title">{{ shop.name || '特惠商家' }}</text>
				</view>

				<view class="shop-body">
					<view class="shop-header">
						<text class="shop-name">{{ shop.name || '精选商户' }}</text>
						<text class="shop-dist" v-if="shop.distance_km != null && shop.distance_km !== ''">{{ formatDistance(shop.distance_km) }}</text>
					</view>

					<!-- 亮眼票根优惠标签 -->
					<view class="benefit-box" v-if="shop.discounts">
						<text class="benefit-label">票根立减</text>
						<text class="benefit-val">{{ shop.discounts }}</text>
					</view>

					<view class="shop-footer">
						<text class="category-tag">{{ shop.address || '综合特惠' }}</text>
						<text class="price-wrap" v-if="shop.avg_cost > 0">
							<text class="symbol">￥</text>
							<text class="amount">{{ shop.avg_cost }}</text>
							<text class="unit">人均</text>
						</text>
					</view>
				</view>
			</view>

			<view class="bottom-padding"></view>
		</scroll-view>

		<!-- 三级联动城市选择弹窗 -->
		<view v-if="cityPickerVisible" class="modal-mask" @click="closeCityPicker">
			<view class="picker-panel" @click.stop>
				<view class="panel-header">
					<view class="header-titles">
						<text class="panel-title">选择地区</text>
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
						<view v-for="item in regionOptions" :key="item.Id || item.id" class="region-chip"
							:class="{ active: currentLocation === getRegionName(item) }"
							@click="onSelectRegionItem(item)">
							{{ getRegionName(item) }}
						</view>
					</view>
				</scroll-view>
			</view>
		</view>

		<!-- 会员登录注册半屏弹窗 -->
		<view v-if="loginModalVisible" class="modal-mask" @click="closeLoginModal">
			<view class="picker-panel login-panel" @click.stop>
				<view class="panel-header">
					<view class="header-titles">
						<text class="panel-title">会员手机号登录</text>
						<text class="panel-path">登录后同步您的专属票根权益</text>
					</view>
					<text class="panel-close" @click="closeLoginModal">✕</text>
				</view>

				<view class="login-body">
					<view class="input-group">
						<input type="number" v-model="loginForm.mobile" placeholder="请输入手机号码" maxlength="11" />
					</view>

					<view class="input-group code-row">
						<input type="number" v-model="loginForm.code" placeholder="请输入验证码" maxlength="6" />
						<button class="send-btn" :disabled="isCounting" @click="handleSendSmsCode">
							{{ isCounting ? `${countdown}s后重试` : '获取验证码' }}
						</button>
					</view>

					<text class="sms-tip">目前没对接到发短信，输入888888可登录。</text>

					<button class="sms-login-btn primary-sms" :loading="loginLoading" @click="handleQuickLoginSubmit">
						立即登录 / 注册
					</button>
				</view>
			</view>
		</view>

		<!-- 会员个人信息与退出登录弹窗 -->
		<view v-if="profileModalVisible" class="modal-mask" @click="closeProfileModal">
			<view class="picker-panel profile-panel" @click.stop>
				<view class="panel-header">
					<view class="header-titles">
						<text class="panel-title">会员中心</text>
						<text class="panel-path">账号详情与管理</text>
					</view>
					<text class="panel-close" @click="closeProfileModal">✕</text>
				</view>

				<view class="profile-body" v-if="userInfo">
					<view class="profile-card">
						<image class="big-avatar" :src="userInfo.avatar || '/static/default-avatar.png'"
							mode="aspectFill" />
						<view class="info-rows">
							<text class="p-name">{{ userInfo.nickname || '未命名会员' }}</text>
							<text class="p-item">用户 ID：{{ userInfo.user_id }}</text>
							<text class="p-item">手机号码：{{ userInfo.mobile }}</text>
							<text class="p-item">会员等级：Lv.{{ userInfo.level || 0 }}</text>
						</view>
					</view>

					<button class="logout-btn" @click="handleLogout">退出登录</button>
				</view>
			</view>
		</view>

		<!-- 票根识别结果弹窗 -->
		<!-- 票根识别结果弹窗 -->
				<view v-if="uploadDialog.visible" class="modal-mask" @click="closeDialog">
					<view class="dialog-card" @click.stop>
						<view class="dialog-header">
							<text class="dialog-title">{{ uploadDialog.title }}</text>
							<text class="panel-close" @click="closeDialog">✕</text>
						</view>

						<!-- 识别中 -->
						<view v-if="uploadDialog.loading" class="ticket-loading">
							<view class="loading-spinner"></view>
							<text class="loading-text">{{ uploadDialog.message }}</text>
						</view>

						<!-- 识别结果：结构化回显 -->
						<scroll-view v-else scroll-y class="dialog-scroll-box">
							<!-- 核验结果徽标 -->
							<view class="verify-badge" :class="uploadDialog.isValid ? 'ok' : 'bad'">
								{{ uploadDialog.isValid ? '✓ 票根核验通过' : '✗ 票根核验未通过' }}
							</view>

							<!-- 未通过原因 -->
							<view v-if="!uploadDialog.isValid && uploadDialog.message" class="reject-reason">
								<text class="reject-text">{{ uploadDialog.message }}</text>
							</view>

							<!-- 票根图片 -->
							 <view class="ticket-img-container">
							<image v-if="uploadDialog.imageUrl" :src="uploadDialog.imageUrl"
								class="ticket-img" @click="previewTicketImage" /></view>
							<!-- 票据信息明细 -->
							<view v-if="uploadDialog.infoRows.length" class="ticket-info-list">
								<view v-for="(row, idx) in uploadDialog.infoRows" :key="idx" class="ticket-info-row">
									<text class="ticket-info-label">{{ row.label }}</text>
									<text class="ticket-info-value">{{ row.value }}</text>
								</view>
							</view>
						</scroll-view>

						<view v-if="recognizedStore" class="match-box">
							<text class="match-head">✨ 票根识别匹配成功</text>
							<text class="match-name">{{ recognizedStore }}</text>
							<text class="match-info" v-if="uploadDialog.ticketInfo">
								标题: {{ uploadDialog.ticketInfo.type }} | 优惠: {{ uploadDialog.ticketInfo.discount }}
							</text>
							<text class="match-info" v-else>已为你调出专属票根打折券！</text>
						</view>

						<view v-if="uploadDialog.isValid" class="dialog-btns">
							<button class="confirm-btn" @click="closeDialog">使用票根优惠</button>
						</view>
						<view v-else class="dialog-btns">
							<button class="manual-btn" @click="contactSupport">人工审核</button>
							<button class="confirm-btn" @click="closeDialog">知道了</button>
						</view>
					</view>
				</view>
	</view>
</template>

<script setup>
	import {
		ref,
		computed,
		onMounted
	} from 'vue'
	import {
		getShopCategories,
		getShopList
	} from '@/api/shop.js'
	import {
		getCitiesByPid
	} from '@/api/city.js'
	import {
		sendSms,
		quickLogin,
		getUserProfile
	} from '@/api/user.js'
	import {
		uploadAndVerifyTicket
	} from '@/api/ticket.js' // 引入 api/ticket.js 中封装好的票根上传与核验接口
	import {
		getCurrentRegion,
		getGpsPosition
	} from '@/utils/location.js' // GPS 定位 + 高德逆地理编码
	import {
		compressImage
	} from '@/utils/compressImage.js' // 上传前图片压缩

	// 1. 基础状态
	// 从本地缓存恢复上次定位/选择的城市，避免刷新后退回默认"赣州"
	const currentLocation = ref(uni.getStorageSync('city_name') || '赣州')
	const activeCategory = ref(null)
	const categoryList = ref([])
	const recognizedStore = ref('')
	const loadingCategories = ref(false)

	// 2. 会员登录与个人信息状态管理
	const isLoggedIn = ref(false)
	const userInfo = ref(null)
	const loginModalVisible = ref(false)
	const profileModalVisible = ref(false)

	// 登录表单数据
	const loginForm = ref({
		mobile: '',
		code: ''
	})
	const loginLoading = ref(false)

	// 验证码倒计时相关
	const isCounting = ref(false)
	const countdown = ref(60)
	let timer = null

	// 点击右上角会员区域
	async function handleMemberClick() {
		if (isLoggedIn.value) {
			uni.navigateTo({
				url: '/pages/users/center/center'
			})
		} else {
			loginModalVisible.value = true
		}
	}

	function closeLoginModal() {
		loginModalVisible.value = false
	}

	function closeProfileModal() {
		profileModalVisible.value = false
	}

	// 发送短信验证码动作
	async function handleSendSmsCode() {
		if (!loginForm.value.mobile || !(/^1[3-9]\d{9}$/.test(loginForm.value.mobile))) {
			uni.showToast({
				title: '请输入正确的手机号码',
				icon: 'none'
			})
			return
		}

		const res = await sendSms({
			mobile: loginForm.value.mobile
		})
		if (!res) return // 失败已由 request.js 统一提示

		uni.showToast({
			title: '验证码已发送',
			icon: 'success'
		})

		isCounting.value = true
		countdown.value = 60
		timer = setInterval(() => {
			countdown.value--
			if (countdown.value <= 0) {
				clearInterval(timer)
				isCounting.value = false
			}
		}, 1000)
	}

	// 手机号验证码登录提交
	async function handleQuickLoginSubmit() {
		if (!loginForm.value.mobile) {
			uni.showToast({
				title: '请输入手机号码',
				icon: 'none'
			})
			return
		}
		if (!loginForm.value.code) {
			uni.showToast({
				title: '请输入验证码',
				icon: 'none'
			})
			return
		}

		loginLoading.value = true
		const res = await quickLogin({
			mobile: loginForm.value.mobile,
			code: loginForm.value.code
		})
		loginLoading.value = false
		if (!res) return // 失败已由 request.js 统一提示

		const {
			data
		} = res
		uni.setStorageSync('pgtoken', data.token)

		isLoggedIn.value = true
		userInfo.value = {
			user_id: data.user_id,
			mobile: loginForm.value.mobile,
			nickname: data.nickname,
			level: 0,
			avatar: ''
		}

		loginModalVisible.value = false
		uni.showToast({
			title: '登录成功',
			icon: 'success'
		})

		fetchProfileData()
		ensureLocateCity() // GPS 定位所在城市（进入页面/登录成功都会触发，会话内仅一次）
	}

	// 获取会员个人信息接口封装调用（探测登录态，静默失败）
	async function fetchProfileData() {
		const res = await getUserProfile()
		if (res && res.data) {
			userInfo.value = res.data
			isLoggedIn.value = true
		}
	}

	// 退出登录
	function handleLogout() {
		uni.removeStorageSync('pgtoken')
		isLoggedIn.value = false
		userInfo.value = null
		profileModalVisible.value = false
		uni.showToast({
			title: '已退出登录',
			icon: 'none'
		})
	}

	const uploadDialog = ref({
		visible: false,
		title: '票根智能识别',
		loading: false, // 识别中状态
		message: '', // 加载提示文案 / 未通过原因
		imageUrl: '', // 票根图片（后端云存储地址，失败退回本地临时图）
		isValid: false, // 是否核验通过
		infoRows: [], // 结构化票据信息 [{label, value}]
		ticketInfo: null // 匹配商家区展示用
	})

	// 三级城市/县区穿透选择逻辑
	const cityPickerVisible = ref(false)
	const loadingCities = ref(false)
	const currentStep = ref('province')
	const selectedProvince = ref(null)
	const selectedCity = ref(null)
	const regionOptions = ref([])

	// 兼容获取地区名称的公共方法（过滤掉空白 shortname）
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
		await fetchRegionsByPid(0)
	}

	function closeCityPicker() {
		cityPickerVisible.value = false
	}

	function navBackStep() {
		if (currentStep.value === 'district') {
			currentStep.value = 'city'
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
		const res = await getCitiesByPid({
			pid
		})
		regionOptions.value = extractListData(res)
		loadingCities.value = false
	}

	async function onSelectRegionItem(item) {
		const targetId = item.Id ?? item.id
		const targetName = getRegionName(item)
		const isDirectCity = ['北京', '天津', '上海', '重庆', '香港', '澳门', '台湾'].includes(targetName)

		if (currentStep.value === 'province') {
			if (isDirectCity) {
				confirmLocation(targetName, targetId)
			} else {
				selectedProvince.value = item
				currentStep.value = 'city'
				await fetchRegionsByPid(targetId)
			}
		} else if (currentStep.value === 'city') {
			if (targetName === '直辖县级') {
				loadingCities.value = true
				const res = await getCitiesByPid({
					pid: targetId
				})
				const subList = extractListData(res)
				if (subList.length > 0) {
					selectedCity.value = item
					currentStep.value = 'district'
					regionOptions.value = subList
				}
				loadingCities.value = false
				return
			}

			loadingCities.value = true
			const res = await getCitiesByPid({
				pid: targetId
			})
			const subList = extractListData(res)
			if (subList.length > 0) {
				selectedCity.value = item
				currentStep.value = 'district'
				regionOptions.value = subList
			} else {
				confirmLocation(targetName, targetId)
			}
			loadingCities.value = false
		} else {
			confirmLocation(targetName, targetId)
		}
	}

	function confirmLocation(cityName) {
		currentLocation.value = cityName
		uni.setStorageSync('city_name', cityName)
		closeCityPicker()
		uni.showToast({
			title: `已定位: ${cityName}`,
			icon: 'none'
		})
		// 城市变化后重新拉取商家列表
		loadShops()
	}

	// ===== GPS 自动定位城市 =====
	// 名称归一化：去掉"省/市/自治区"等后缀，便于高德返回值与后端城市表匹配
	function normalizeRegionName(name) {
		return String(name || '')
			.replace(/特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|省|市/g, '')
			.trim()
	}

	// 将定位/选择的区域写入状态并缓存（区/县、市、省各级通用）
	function applyRegion(name) {
		currentLocation.value = name
		uni.setStorageSync('city_name', name)
	}

	// 会话内自动 GPS 定位只执行一次（进入页面 onMounted 或登录成功都会调到这里，
	// 避免并发/重复触发多次定位与商家列表请求）；刷新页面会重新执行
	let gpsLocated = false
	async function ensureLocateCity(showTip = true) {
		if (gpsLocated) return
		gpsLocated = true
		await locateCityByGps(showTip)
	}

	// GPS 定位 -> 高德逆地理编码 -> 逐级匹配后端省/市/区，尽量落到区级（区/县）
	async function locateCityByGps(showTip = true) {
		try {
			const region = await getCurrentRegion()

			// 1. 匹配省份
			const provinceRes = await getCitiesByPid({ pid: 0 })
			const provinces = extractListData(provinceRes)
			const province = provinces.find(p =>
				normalizeRegionName(p.name) === normalizeRegionName(region.province) ||
				normalizeRegionName(p.shortname) === normalizeRegionName(region.province)
			)
			if (!province) throw new Error('省份未匹配')

			const provinceId = province.Id ?? province.id
			const provinceName = getRegionName(province)

			// 2. 匹配市级（直辖市/特别行政区：省即市）
			const directCities = ['北京', '天津', '上海', '重庆', '香港', '澳门', '台湾']
			const isDirectCity = directCities.includes(provinceName)
			let cityId = provinceId
			let cityName = provinceName
			if (!isDirectCity) {
				// 高德 city 为空时退回用 district 去市级列表里找
				const matchCityName = region.city || region.district
				const cityRes = await getCitiesByPid({ pid: provinceId })
				const cities = extractListData(cityRes)
				const city = cities.find(c =>
					normalizeRegionName(c.name) === normalizeRegionName(matchCityName) ||
					normalizeRegionName(c.shortname) === normalizeRegionName(matchCityName)
				)
				if (!city) {
					// 市级匹配不上，退回省级
					applyRegion(provinceName, provinceId)
					if (showTip) uni.showToast({ title: `已定位: ${provinceName}`, icon: 'none' })
					return
				}
				cityId = city.Id ?? city.id
				cityName = getRegionName(city)
			}

			// 3. 匹配区级（高德 district），命中则落到区/县，否则退回市级
			const districtRes = await getCitiesByPid({ pid: cityId })
			const districts = extractListData(districtRes)
			const districtName = region.district || ''
			const district = districts.find(d =>
				districtName && (
					normalizeRegionName(d.name) === normalizeRegionName(districtName) ||
					normalizeRegionName(d.shortname) === normalizeRegionName(districtName)
				)
			)

			if (district) {
				applyRegion(getRegionName(district), district.Id ?? district.id)
				if (showTip) uni.showToast({ title: `已定位: ${getRegionName(district)}`, icon: 'none' })
			} else {
				applyRegion(cityName, cityId)
				if (showTip) uni.showToast({ title: `已定位: ${cityName}`, icon: 'none' })
			}
		} catch (e) {
			console.error('定位失败:', e)
			// 定位失败静默处理，不影响登录流程，保持默认城市
		}
	}

	// 分类辅助方法
	function getCategoryId(item, fallbackIndex = 0) {
		if (!item) return fallbackIndex
		return item.id ?? item.category_id ?? item.code ?? fallbackIndex
	}

	function getCategoryName(item) {
		if (!item) return ''
		return item.name || item.title || item.category_name || '未命名'
	}

	function getCategoryCount(item) {
		if (!item) return 0
		return item.shop_count ?? item.count ?? item.total ?? 0
	}

	function isCategoryActive(item) {
		if (!activeCategory.value || !item) return false
		const activeId = getCategoryId(activeCategory.value)
		const currentId = getCategoryId(item)
		return String(activeId) === String(currentId)
	}

	// ===== 商家列表（真实接口）=====
	const shopList = ref([])
	const loadingShops = ref(false)
	// 列表区 scroll-view 下拉刷新动画控制
	const listRefreshing = ref(false)
	// 用户当前经纬度（gcj02），传给接口后才能拿到 distance_km
	const userPosition = ref(null)

	// logo/cover_images 为逗号分隔字符串，取第一张
	function firstImage(str) {
		return String(str || '').split(',')[0].trim()
	}

	function formatDistance(km) {
		const n = Number(km)
		if (isNaN(n)) return ''
		return n < 1 ? `${Math.round(n * 1000)}m` : `${n.toFixed(1)}km`
	}

	// 获取用户经纬度（失败静默，列表仍可展示但不带距离）
	async function ensureUserPosition() {
		if (userPosition.value) return userPosition.value
		try {
			userPosition.value = await getGpsPosition()
		} catch (e) {
			console.warn('获取用户经纬度失败，商家列表将不展示距离', e)
			userPosition.value = null
		}
		return userPosition.value
	}

	async function loadShops(showLoading = true) {
		if (showLoading) loadingShops.value = true
		const category_id = activeCategory.value ? getCategoryId(activeCategory.value) : 0
		const pos = await ensureUserPosition()
		const params = {
			category_id
		}
		if (pos) {
			params.user_lng = pos.longitude
			params.user_lat = pos.latitude
		}
		const res = await getShopList(params)
		shopList.value = extractListData(res)
		loadingShops.value = false
	}

	function extractListData(res) {
		if (!res) return []
		if (Array.isArray(res)) return res
		if (Array.isArray(res.data)) return res.data
		if (Array.isArray(res.list)) return res.list
		if (res.data && Array.isArray(res.data.list)) return res.data.list
		return []
	}

	async function loadCategories() {
		loadingCategories.value = true
		const res = await getShopCategories({
			parent_id: -1
		})
		categoryList.value = extractListData(res)
		loadingCategories.value = false
	}

	function onSelectCategory(category) {
		if (isCategoryActive(category)) {
			resetCategoryFilter()
			return
		}
		activeCategory.value = category
		recognizedStore.value = ''
		loadShops()
	}

	function resetCategoryFilter() {
		activeCategory.value = null
		recognizedStore.value = ''
		loadShops()
	}

// ... 省略前面未改动代码 ...

	// 使用从 api/ticket.js 中导入的 uploadAndVerifyTicket 方法进行票根验证
// 使用从 api/ticket.js 中导入的 uploadAndVerifyTicket 方法进行票根验证
// 使用从 api/ticket.js 中导入的 uploadAndVerifyTicket 方法进行票根验证
// 使用从 api/ticket.js 中导入的 uploadAndVerifyTicket 方法进行票根验证
	function uploadTicket() {
		if (!isLoggedIn.value) {
			loginModalVisible.value = true
			return
		}

		uni.chooseImage({
			count: 1,
			sizeType: ['compressed'],
			sourceType: ['album', 'camera'],
			success: async (chooseRes) => {
				// 先压缩再上传，减小体积（长边超 1600px 等比缩小 + JPEG 0.8 质量）
				const tempFilePath = await compressImage(chooseRes.tempFilePaths[0])

				uploadDialog.value = {
					visible: true,
					title: '票根智能识别',
					loading: true,
					message: '正在上传并分析您的票根信息...',
					imageUrl: '',
					isValid: false,
					infoRows: [],
					ticketInfo: null
				}
				// 开始新一轮识别时清空上一轮残留的匹配商家，避免 match-box 显示旧数据
				recognizedStore.value = ''

				try {
					// 调用已封装好的 uploadAndVerifyTicket 方法（成功与核验未通过都 resolve）
					const res = await uploadAndVerifyTicket(tempFilePath, {
						city: currentLocation.value
					})

					// 后端返回结构: { code, msg, data: { ocr_result: {...}, user_img_url } }
					const ocr = res?.data?.ocr_result || {}
					const inner = ocr.data || {}
					// code=400：核验未通过，隐藏 识别票种/第三方平台/标题/日期，仅展示核验结果与拒绝原因
					const isRejected = Number(res?.code) === 400

					// 组装结构化信息：字符串字段有值才显示，布尔字段（is_valid/is_same_template）存在即显示 是/否
					const infoRows = []
					if (!isRejected && ocr.ticket_category) infoRows.push({ label: '识别票种', value: ocr.ticket_category })
					if (!isRejected && ocr.third_party_name) infoRows.push({ label: '第三方平台', value: ocr.third_party_name })
					if (!isRejected && inner.title) infoRows.push({ label: '标题', value: inner.title })
					if (inner.holder_name) infoRows.push({ label: '持有人', value: inner.holder_name })
					if (!isRejected && inner.event_date) infoRows.push({ label: '日期', value: inner.event_date })
					if (inner.ticket_sn) infoRows.push({ label: '票据编码', value: inner.ticket_sn })
					if (inner.amount > 0) infoRows.push({ label: '票价', value: `¥${Number(inner.amount).toFixed(2)}` })
					if (typeof ocr.is_valid === 'boolean') infoRows.push({ label: '真实票根', value: ocr.is_valid ? '是' : '否' })
					if (typeof ocr.is_same_template === 'boolean') infoRows.push({ label: '票根模版', value: ocr.is_same_template ? '是' : '否' })
					if (ocr.confidence > 0) infoRows.push({ label: '识别置信度', value: `${Math.round(ocr.confidence * 100)}%` })

					const isValid = ocr.is_valid === true

					uploadDialog.value = {
						visible: true,
						loading: false,
						// 云端图加载失败时页面仍可用本地压缩图兜底展示
						imageUrl: res?.data?.user_img_url || tempFilePath,
						isValid,
						infoRows,
						// 未通过时展示拒绝原因
						message: isValid ? '' : (ocr.reject_reason || res?.msg || '票根核验未通过'),
						ticketInfo: isValid ? {
						type: ocr.ticket_category || '票根',
						discount: inner.amount > 0 ? `¥${Number(inner.amount).toFixed(2)}` : '专属折扣'
					} : null
					}

					// 核验通过时展示匹配商家（识别出的票根来源），未通过则清空
					recognizedStore.value = isValid ? (ocr.third_party_name || inner.title || '') : ''
				} catch (error) {
					uploadDialog.value.visible = false
					uni.showToast({
						title: typeof error === 'string' ? error : (error.message || '票根识别或核销失败，请重试'),
						icon: 'none'
					})
				}
			}
		})
	}

	// 点击弹窗中的票根图片放大预览
	function previewTicketImage() {
		if (uploadDialog.value.imageUrl) {
			uni.previewImage({
				current: uploadDialog.value.imageUrl,
				urls: [uploadDialog.value.imageUrl]
			})
		}
	}

// ... 省略后面未改动代码 ...

	function closeDialog() {
		uploadDialog.value.visible = false
	}

	// 票根核验失败 → 人工审核：弹确认后拨打客服电话（临时占位号码）
	function contactSupport() {
		const phone = '400-800-1234'
		uni.showModal({
			title: '人工审核',
			content: `识别失败可联系客服人工审核\n客服电话：${phone}`,
			confirmText: '拨打',
			cancelText: '取消',
			success: (r) => {
				if (r.confirm) {
					uni.makePhoneCall({ phoneNumber: phone.replace(/-/g, '') })
				}
			}
		})
	}

	function openShopDetail(shop) {
		if (!shop || !shop.id) return
		const name = encodeURIComponent(shop.name || shop.short_name || '')
		const logo = encodeURIComponent(shop.logo || '')
		// 先跳商家详情页，详情页内"优惠买单"再进优惠券列表
		uni.navigateTo({
			url: `/pages/shop/detail/detail?shop_id=${shop.id}&name=${name}&logo=${logo}`
		})
	}

	onMounted(() => {
		loadCategories()
		// 进入首页即拉取商家列表；距离由后端按定位经纬度计算 distance_km 返回
		loadShops()
		// 页面加载/刷新即按 GPS 自动定位所在城市（静默，不弹"已定位"提示）
		ensureLocateCity(false)
		// 登录失效被 request.js 重定向回首页时，自动唤起登录弹窗
		if (uni.getStorageSync('NEED_LOGIN')) {
			uni.removeStorageSync('NEED_LOGIN')
			loginModalVisible.value = true
		}
		const token = uni.getStorageSync('pgtoken')
		if (token) {
			fetchProfileData()
		}
	})

	// 商家列表区 scroll-view 下拉刷新：只重拉商家列表（不打断分类/登录态）
	async function onListRefresh() {
		const startAt = Date.now()
		listRefreshing.value = true
		try {
			await loadShops(false)
		} finally {
			// 保证展开态至少渲染一帧且可见 500ms，否则接口秒回时 true→false 同批次抵消，动画卡住不回弹
			const remain = Math.max(50, 500 - (Date.now() - startAt))
			setTimeout(() => {
				listRefreshing.value = false
			}, remain)
		}
	}
</script>

<style lang="scss" scoped>
	.loading-state,
	.empty-state {
		padding: 30rpx;
		text-align: center;
		color: #1e3a8a;
		font-size: 24rpx;
		grid-column: span 4;
	}

	.page-shell {
		/* fixed 而非 100vh：手机动态地址栏下 100vh 大于可视高度会让 body 可滚，
		   下拉手势被页面级滚动接管，scroll-view 的 refresher 就拉不起来 */
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		padding: 0 28rpx;
		background-color: #f8fafc;
		color: #1e293b;
		box-sizing: border-box;
	}

	/* 商家列表独立滚动区（顶部内容固定，仅该区可滚动/下拉刷新） */
	.list-scroll {
		flex: 1;
		min-height: 0;
		height: 0;
		margin-top: 20rpx;
		/* 禁用橡皮筋回弹，内容不足时不上滑虚滚 */
		overscroll-behavior: none;
	}

	/* 顶栏设计 */
	.topbar {
		height: 110rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.brand-container {
		display: flex;
		flex-direction: column;
		justify-content: center;

		.brand-logo-img {
			height: 40rpx;
			width: auto;
			max-width: 200rpx;
			object-fit: contain;
		}

		.brand-slogan {
			font-size: 16rpx;
			color: #64748b;
			font-weight: 600;
			margin-top: 2rpx;
			letter-spacing: 0.5rpx;
		}
	}

	.topbar-right {
		display: flex;
		align-items: center;
		gap: 12rpx;
	}

	.location-chip {
		display: flex;
		align-items: center;
		background: #ffffff;
		padding: 8rpx 16rpx;
		border-radius: 32rpx;
		border: 1rpx solid #cbd5e1;
		box-shadow: 0 2rpx 8rpx rgba(37, 99, 235, 0.04);

		.pin {
			font-size: 22rpx;
			margin-right: 4rpx;
		}

		.loc-name {
			font-size: 22rpx;
			font-weight: 700;
			color: #0f172a;
			max-width: 120rpx;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.chevron {
			font-size: 18rpx;
			color: #2563eb;
			margin-left: 4rpx;
		}
	}

	.member-chip {
		display: flex;
		align-items: center;
		background: #eff6ff;
		padding: 8rpx 16rpx;
		border-radius: 32rpx;
		border: 1rpx solid #93c5fd;

		.login-icon {
			font-size: 22rpx;
			margin-right: 4rpx;
		}

		.login-text {
			font-size: 22rpx;
			font-weight: 700;
			color: #1d4ed8;
		}

		.user-avatar {
			width: 32rpx;
			height: 32rpx;
			border-radius: 50%;
			margin-right: 6rpx;
			background: #cbd5e1;
		}

		.user-name {
			font-size: 22rpx;
			font-weight: 700;
			color: #1e40af;
			max-width: 100rpx;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	.hero-banner {
		margin-top: 10rpx;
		padding: 40rpx;
		border-radius: 24rpx;
		background: linear-gradient(135deg, #1e3a8a 0%, #172554 100%);
		color: #fff;
		position: relative;
		overflow: hidden;
		box-shadow: 0 12rpx 28rpx rgba(30, 58, 138, 0.25);

		.hero-content {
			position: relative;
			z-index: 2;
		}

		.badge {
			font-size: 18rpx;
			letter-spacing: 3rpx;
			background: rgba(239, 68, 68, 0.25);
			color: #fca5a5;
			display: inline-block;
			padding: 4rpx 12rpx;
			border-radius: 6rpx;
			font-weight: 700;
		}

		.hero-title {
			font-size: 42rpx;
			font-weight: 900;
			display: block;
			margin-top: 16rpx;
		}

		.hero-subtitle {
			font-size: 22rpx;
			opacity: 0.85;
			display: block;
			margin-top: 8rpx;
		}

		.hero-btn {
			margin-top: 28rpx;
			display: inline-flex;
			align-items: center;
			background: #dc2626;
			color: #fff;
			font-weight: 800;
			font-size: 26rpx;
			padding: 0 32rpx;
			height: 68rpx;
			line-height: 68rpx;
			border-radius: 34rpx;
			border: none;

			.btn-icon {
				margin-right: 8rpx;
			}

			&::after {
				border: none;
			}
		}

		.hero-decoration {
			position: absolute;
			right: -20rpx;
			bottom: -20rpx;
			opacity: 0.12;

			.ticket-stub {
				width: 200rpx;
				height: 200rpx;
				border: 6rpx dashed #fff;
				border-radius: 20rpx;
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				transform: rotate(-15deg);

				.stub-tag {
					font-size: 40rpx;
					font-weight: 900;
				}

				.stub-text {
					font-size: 20rpx;
				}
			}
		}
	}

	.notice-bar {
		margin: 24rpx 0;
		padding: 18rpx 24rpx;
		background: #eff6ff;
		border: 1rpx solid #bfdbfe;
		border-radius: 16rpx;
		display: flex;
		align-items: center;

		.notice-tag {
			background: #2563eb;
			color: #fff;
			font-size: 18rpx;
			font-weight: 800;
			padding: 2rpx 8rpx;
			border-radius: 6rpx;
			margin-right: 12rpx;
		}

		.notice-text {
			flex: 1;
			font-size: 22rpx;
			color: #1e40af;
			font-weight: 600;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.notice-arrow {
			font-size: 22rpx;
			color: #2563eb;
			font-weight: 800;
		}
	}

	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 36rpx 0 20rpx;

		.head-title {
			font-size: 32rpx;
			font-weight: 800;
			color: #0f172a;
		}

		.head-all {
			font-size: 22rpx;
			color: #2563eb;
			font-weight: 600;
		}
	}

	.category-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16rpx;
	}

	.cat-card {
		background: #ffffff;
		border: 1rpx solid #e2e8f0;
		border-radius: 16rpx;
		padding: 20rpx 10rpx;
		text-align: center;
		box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.02);

		&.active {
			background: #eff6ff;
			border-color: #93c5fd;

			.cat-title {
				color: #1d4ed8;
				font-weight: 800;
			}

			.cat-count {
				color: #2563eb;
			}
		}

		.cat-title {
			font-size: 24rpx;
			font-weight: 700;
			color: #334155;
			display: block;
		}

		.cat-count {
			font-size: 18rpx;
			color: #94a3b8;
			margin-top: 4rpx;
			display: block;
		}
	}

	.list-heading {
		margin: 40rpx 0 20rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;

		.title-wrap {
			display: flex;
			align-items: center;

			.dot {
				width: 12rpx;
				height: 12rpx;
				background: #dc2626;
				border-radius: 50%;
				margin-right: 10rpx;
			}

			.title {
				font-size: 28rpx;
				font-weight: 800;
				color: #0f172a;
			}
		}

		.sub-tip {
			font-size: 20rpx;
			color: #94a3b8;
		}
	}

	.shop-card {
		background: #ffffff;
		border-radius: 20rpx;
		padding: 20rpx;
		margin-bottom: 20rpx;
		display: flex;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);

		.shop-cover {
			position: relative;
			overflow: hidden;
			width: 160rpx;
			height: 160rpx;
			border-radius: 14rpx;
			color: #fff;
			padding: 12rpx;
			box-sizing: border-box;
			display: flex;
			flex-direction: column;
			justify-content: space-between;

			.cover-img {
				position: absolute;
				left: 0;
				top: 0;
				width: 100%;
				height: 100%;
				z-index: 0;
			}

			.cover-badge {
				position: relative;
				z-index: 1;
				font-size: 16rpx;
				background: rgba(0, 0, 0, 0.25);
				padding: 2rpx 6rpx;
				border-radius: 4rpx;
				width: fit-content;
			}

			.cover-title {
				position: relative;
				z-index: 1;
				font-size: 22rpx;
				font-weight: 800;
			}
		}

		.shop-body {
			flex: 1;
			margin-left: 20rpx;
			display: flex;
			flex-direction: column;
			justify-content: space-between;
		}

		.shop-header {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;

.shop-name {
				font-size: 28rpx; // 可以稍微改小一点点方便看代码
				font-weight: 600;
				color: #0f172a;
				flex: 1;
				white-space: pre-wrap; /* 让 JSON 的换行和空格正常显示 */
				word-break: break-all;
				font-family: monospace; /* 使用等宽字体，更像代码编辑器 */
			}

			.shop-dist {
				font-size: 20rpx;
				color: #94a3b8;
				margin-left: 10rpx;
			}
		}

		.benefit-box {
			display: flex;
			align-items: flex-start;
			background: #fef2f2;
			border: 1rpx solid #fee2e2;
			padding: 6rpx 10rpx;
			border-radius: 8rpx;
			width: fit-content;
			max-width: 100%;
			box-sizing: border-box;
			margin: 8rpx 0;

			.benefit-label {
				font-size: 18rpx;
				font-weight: 800;
				color: #dc2626;
				margin-right: 8rpx;
				flex-shrink: 0;
				line-height: 1.5;
				padding-top: 2rpx;
			}

			.benefit-val {
				font-size: 20rpx;
				font-weight: 700;
				color: #b91c1c;
				flex: 1;
				min-width: 0;
				line-height: 1.5;
				/* 内容过多：最多显示 3 行，超出省略 */
				display: -webkit-box;
				-webkit-box-orient: vertical;
				-webkit-line-clamp: 3;
				overflow: hidden;
				word-break: break-all;
			}
		}

		.shop-footer {
			display: flex;
			justify-content: space-between;
			align-items: flex-end;

			.category-tag {
				font-size: 20rpx;
				color: #64748b;
			}

			.price-wrap {
				color: #dc2626;
				font-weight: 800;

				.symbol {
					font-size: 20rpx;
				}

				.amount {
					font-size: 32rpx;
				}

				.unit {
					font-size: 18rpx;
					color: #94a3b8;
					font-weight: 400;
					margin-left: 2rpx;
				}
			}
		}
	}

	.bottom-padding {
		height: 60rpx;
	}

	.modal-mask {
		position: fixed;
		z-index: 999;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(2px);
		display: flex;
		align-items: flex-end;
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

		.panel-header {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
		}

		.panel-title {
			font-size: 32rpx;
			font-weight: 900;
			color: #0f172a;
			display: block;
		}

		.panel-path {
			font-size: 22rpx;
			color: #2563eb;
			margin-top: 4rpx;
			display: block;
			font-weight: 600;
		}

		.panel-close {
			font-size: 32rpx;
			color: #94a3b8;
			padding: 0 10rpx;
		}

		.breadcrumb-bar {
			margin-top: 16rpx;

			.back-link {
				font-size: 22rpx;
				color: #2563eb;
				font-weight: 700;
			}
		}

		.region-scroll {
			margin-top: 24rpx;
			max-height: 55vh;
		}

		.region-grid {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 16rpx;
		}

		.region-chip {
			padding: 20rpx 10rpx;
			background: #f1f5f9;
			border: 1rpx solid #e2e8f0;
			border-radius: 12rpx;
			text-align: center;
			font-size: 24rpx;
			color: #334155;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;

			&.active {
				background: #eff6ff;
				border-color: #93c5fd;
				color: #1d4ed8;
				font-weight: 800;
			}
		}
	}

	/* 登录弹窗专用样式 */
	.login-panel {
		.login-body {
			margin-top: 30rpx;
			display: flex;
			flex-direction: column;

			.input-group {
				margin-bottom: 20rpx;
				background: #f8fafc;
				border: 1rpx solid #cbd5e1;
				border-radius: 12rpx;
				padding: 16rpx 20rpx;
				box-sizing: border-box;

				input {
					font-size: 26rpx;
					color: #0f172a;
					width: 100%;
				}
			}

			.code-row {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding-right: 10rpx;

				input {
					flex: 1;
				}

				.send-btn {
					font-size: 22rpx;
					background: #2563eb;
					color: #fff;
					border-radius: 8rpx;
					padding: 0 20rpx;
					height: 56rpx;
					line-height: 56rpx;
					border: none;

					&::after {
						border: none;
					}

					&[disabled] {
						background: #94a3b8;
					}
				}
			}

			.sms-tip {
				font-size: 22rpx;
				color: #dc2626;
				margin-bottom: 24rpx;
				font-weight: 600;
			}

			.sms-login-btn {
				width: 100%;
				background: #2563eb;
				color: #fff;
				font-weight: 800;
				font-size: 28rpx;
				height: 80rpx;
				line-height: 80rpx;
				border-radius: 16rpx;
				border: none;

				&::after {
					border: none;
				}
			}
		}
	}

	/* 会员资料弹窗专用样式 */
	.profile-panel {
		.profile-body {
			margin-top: 30rpx;
			display: flex;
			flex-direction: column;

			.profile-card {
				display: flex;
				align-items: center;
				background: #f8fafc;
				border: 1rpx solid #e2e8f0;
				border-radius: 20rpx;
				padding: 24rpx;
				margin-bottom: 30rpx;

				.big-avatar {
					width: 100rpx;
					height: 100rpx;
					border-radius: 50%;
					background: #cbd5e1;
					margin-right: 24rpx;
				}

				.info-rows {
					display: flex;
					flex-direction: column;

					.p-name {
						font-size: 32rpx;
						font-weight: 900;
						color: #0f172a;
						margin-bottom: 8rpx;
					}

					.p-item {
						font-size: 22rpx;
						color: #64748b;
						margin-top: 4rpx;
						font-weight: 600;
					}
				}
			}

			.logout-btn {
				width: 100%;
				background: #fef2f2;
				color: #dc2626;
				border: 1rpx solid #fee2e2;
				font-weight: 800;
				font-size: 28rpx;
				height: 80rpx;
				line-height: 80rpx;
				border-radius: 16rpx;

				&::after {
					border: none;
				}
			}
		}
	}

	.dialog-card {
		width: 100%;
		background: #fff;
		padding: 40rpx;
		border-radius: 28rpx 28rpx 0 0;
		box-sizing: border-box;

		.dialog-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		.dialog-title {
			font-size: 32rpx;
			font-weight: 900;
			color: #0f172a;
		}

		.dialog-sub {
			font-size: 24rpx;
			color: #64748b;
			margin-top: 10rpx;
			display: block;
		}

		.match-box {
			margin-top: 24rpx;
			padding: 20rpx;
			background: #eff6ff;
			border: 1rpx solid #bfdbfe;
			border-radius: 12rpx;

			.match-head {
				font-size: 22rpx;
				color: #2563eb;
				font-weight: 800;
				display: block;
			}

			.match-name {
				font-size: 32rpx;
				font-weight: 900;
				color: #1e40af;
				margin-top: 6rpx;
				display: block;
			}

			.match-info {
				font-size: 20rpx;
				color: #1d4ed8;
				margin-top: 4rpx;
				display: block;
			}
		}

		.dialog-btns {
			display: flex;
			gap: 20rpx;
			margin-top: 32rpx;

			.confirm-btn,
			.manual-btn {
				flex: 1;
				color: #fff;
				font-weight: 800;
				font-size: 28rpx;
				height: 84rpx;
				line-height: 84rpx;
				border-radius: 16rpx;
				border: none;

				&::after {
					border: none;
				}
			}

			.confirm-btn {
				background: #dc2626;
			}

			.manual-btn {
				background: #ffffff;
				color: #dc2626;
				border: 2rpx solid #dc2626;
			}
		}
		/* 弹窗内部滚动与票根结果排版 */
		.dialog-scroll-box {
			max-height: 45vh;       /* 限制最大高度，防止弹窗超出屏幕 */
			margin-top: 16rpx;
			background: #f8fafc;
			border-radius: 12rpx;
			padding: 16rpx;
			box-sizing: border-box;
			border: 1rpx solid #e2e8f0;
			overflow: hidden;       /* 外层兜底裁剪，防止内层失效时撑破弹窗 */

			/* 修复 H5 端 scroll-view 不支持 max-height：
			   uni-scroll-view 内层默认 height:100%，百分比高度不参照父级 max-height 解析，
			   需断开高度链，让内层自身成为滚动容器（calc 减去上下 padding 32rpx + 边框 2rpx） */
			:deep(.uni-scroll-view) {
				height: auto;
				max-height: calc(45vh - 34rpx);
				overflow-y: auto;
			}
		}

		/* 识别中 */
		.ticket-loading {
			padding: 60rpx 0;
			display: flex;
			flex-direction: column;
			align-items: center;

			.loading-spinner {
				width: 64rpx;
				height: 64rpx;
				border: 6rpx solid #e2e8f0;
				border-top-color: #dc2626;
				border-radius: 50%;
				animation: spin 0.8s linear infinite;
			}

			.loading-text {
				margin-top: 24rpx;
				font-size: 24rpx;
				color: #64748b;
			}
		}
		@keyframes spin { to { transform: rotate(360deg); } }

		/* 核验结果徽标 */
		.verify-badge {
			display: inline-flex;
			align-items: center;
			padding: 10rpx 24rpx;
			border-radius: 999rpx;
			font-size: 24rpx;
			font-weight: 800;

			&.ok { background: #dcfce7; color: #15803d; }
			&.bad { background: #fee2e2; color: #b91c1c; }
		}

		/* 未通过原因 */
		.reject-reason {
			margin-top: 16rpx;
			padding: 20rpx;
			background: #fef2f2;
			border-radius: 12rpx;

			.reject-text {
				font-size: 24rpx;
				color: #991b1b;
				line-height: 1.6;
			}
		}

		/* 票根图片 */
		.ticket-img {
			width: 200rpx;
			height: 100rpx;
			margin-top: 20rpx;
			border-radius: 12rpx;
			border: 1rpx solid #e2e8f0;
			background: #fff;
		}

		/* 票据信息明细 */
		.ticket-info-list {
			margin-top: 20rpx;
			background: #fff;
			border-radius: 12rpx;
			border: 1rpx solid #e2e8f0;
			overflow: hidden;

			.ticket-info-row {
				display: flex;
				justify-content: space-between;
				align-items: flex-start;
				padding: 20rpx 24rpx;
				border-bottom: 1rpx solid #f1f5f9;

				&:last-child { border-bottom: none; }

				.ticket-info-label {
					font-size: 24rpx;
					color: #64748b;
					flex-shrink: 0;
					margin-right: 24rpx;
				}

				.ticket-info-value {
					font-size: 24rpx;
					color: #0f172a;
					font-weight: 600;
					text-align: right;
					word-break: break-all;
				}
			}
		}

			.dialog-sub {
				font-size: 22rpx;
				color: #334155;
				display: block;
				white-space: pre-wrap;  /* 让 JSON 的换行和空格正常渲染 */
				word-break: break-all;  /* 防止长链接或字段把布局撑坏 */
				font-family: monospace; /* 使用等宽字体，让 JSON 数据格式更美观 */
				line-height: 1.5;
			}
	}
</style>
