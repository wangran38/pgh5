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
		<view v-if="!shopList || shopList.length === 0" class="empty-state">该分类下暂无商家</view>

		<view v-else v-for="shop in shopList" :key="shop.id" class="shop-card" @click="openShopDetail(shop)">
			<view class="shop-cover"
				:style="{ background: shop.themeColor || 'linear-gradient(135deg, #2563eb, #1d4ed8)' }">
				<text class="cover-badge">票根可叠</text>
				<text class="cover-title">{{ shop.short_name || '特惠商家' }}</text>
			</view>

			<view class="shop-body">
				<view class="shop-header">
					<text class="shop-name">{{ shop.name || '精选商户' }}</text>
					<text class="shop-dist" v-if="shop.distance">{{ shop.distance }}</text>
				</view>

				<!-- 亮眼票根优惠标签 -->
				<view class="benefit-box" v-if="shop.discount_tag || shop.discount">
					<text class="benefit-label">票根立减</text>
					<text
						class="benefit-val">{{ shop.discount_tag ? `${shop.discount_tag} (${shop.discount})` : shop.discount }}</text>
				</view>

				<view class="shop-footer">
					<text class="category-tag">{{ shop.category_name || '综合特惠' }}</text>
					<text class="price-wrap" v-if="shop.price">
						<text class="symbol">￥</text>
						<text class="amount">{{ shop.price }}</text>
						<text class="unit">起</text>
					</text>
				</view>
			</view>
		</view>

		<view class="bottom-padding"></view>

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

						<!-- 使用 scroll-view 包裹 message，支持上下滚动查看完整 JSON 且不会撑破弹窗 -->
						<scroll-view scroll-y class="dialog-scroll-box">
							<text class="dialog-sub">{{ uploadDialog.message }}</text>
						</scroll-view>

						<view v-if="recognizedStore" class="match-box">
							<text class="match-head">✨ 票根识别匹配成功</text>
							<text class="match-name">{{ recognizedStore }}</text>
							<text class="match-info" v-if="uploadDialog.ticketInfo">
								类型: {{ uploadDialog.ticketInfo.type }} | 优惠: {{ uploadDialog.ticketInfo.discount }}
							</text>
							<text class="match-info" v-else>已为你调出专属票根打折券！</text>
						</view>

						<button class="confirm-btn" @click="closeDialog">使用票根优惠</button>
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
		getShopCategories
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

	// 1. 基础状态
	const currentLocation = ref('赣州')
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

		try {
			const res = await sendSms({
				mobile: loginForm.value.mobile
			})
			if (res.code === 200) {
				uni.showToast({
					title: res.msg || '发送成功',
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
			} else {
				uni.showToast({
					title: res.msg || '发送失败',
					icon: 'none'
				})
			}
		} catch (error) {
			console.error('❌ 发送验证码异常:', error)
			uni.showToast({
				title: '网络异常，请稍后重试',
				icon: 'none'
			})
		}
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
		try {
			const res = await quickLogin({
				mobile: loginForm.value.mobile,
				code: loginForm.value.code
			})

			if (res.code === 200) {
				const data = res.data
				uni.setStorageSync('pgtoken', data.token)

				isLoggedIn.value = true
				userInfo.value = {
					user_id: data.user_id,
					mobile: loginForm.value.mobile,
					nickname: data.name,
					level: 0,
					avatar: ''
				}

				loginModalVisible.value = false
				uni.showToast({
					title: '登录成功',
					icon: 'success'
				})

				fetchProfileData()
			} else {
				uni.showToast({
					title: res.msg || '登录失败',
					icon: 'none'
				})
			}
		} catch (error) {
			console.error('❌ 登录异常:', error)
			uni.showToast({
				title: '网络异常，请稍后重试',
				icon: 'none'
			})
		} finally {
			loginLoading.value = false
		}
	}

	// 获取会员个人信息接口封装调用
	async function fetchProfileData() {
		try {
			const res = await getUserProfile()
			if (res.error_code === 0 && res.data) {
				userInfo.value = res.data
				isLoggedIn.value = true
			}
		} catch (e) {
			console.error('获取个人信息失败', e)
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
		title: '',
		message: '',
		ticketInfo: null
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
		try {
			const res = await getCitiesByPid({
				pid
			})
			regionOptions.value = extractListData(res)
		} catch (error) {
			console.error('❌ 获取地区失败:', error)
			uni.showToast({
				title: '加载地区失败',
				icon: 'none'
			})
		} finally {
			loadingCities.value = false
		}
	}

	async function onSelectRegionItem(item) {
		const targetId = item.Id ?? item.id
		const targetName = getRegionName(item)
		const isDirectCity = ['北京', '天津', '上海', '重庆', '香港', '澳门', '台湾'].includes(targetName)

		if (currentStep.value === 'province') {
			if (isDirectCity) {
				confirmLocation(targetName)
			} else {
				selectedProvince.value = item
				currentStep.value = 'city'
				await fetchRegionsByPid(targetId)
			}
		} else if (currentStep.value === 'city') {
			if (targetName === '直辖县级') {
				loadingCities.value = true
				try {
					const res = await getCitiesByPid({
						pid: targetId
					})
					const subList = extractListData(res)
					if (subList && subList.length > 0) {
						selectedCity.value = item
						currentStep.value = 'district'
						regionOptions.value = subList
					}
				} catch (e) {
					console.error(e)
				} finally {
					loadingCities.value = false
				}
				return
			}

			loadingCities.value = true
			try {
				const res = await getCitiesByPid({
					pid: targetId
				})
				const subList = extractListData(res)
				if (subList && subList.length > 0) {
					selectedCity.value = item
					currentStep.value = 'district'
					regionOptions.value = subList
				} else {
					confirmLocation(targetName)
				}
			} catch (e) {
				confirmLocation(targetName)
			} finally {
				loadingCities.value = false
			}
		} else {
			confirmLocation(targetName)
		}
	}

	function confirmLocation(cityName) {
		currentLocation.value = cityName
		closeCityPicker()
		uni.showToast({
			title: `已定位: ${cityName}`,
			icon: 'none'
		})
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

	// Mock 商家数据
	const mockShops = ref([{
			id: 101,
			name: '赣州锦江国际酒店',
			short_name: '锦江国际',
			category_id: 1,
			category_name: '酒店住宿',
			discount: '立减 60 元',
			discount_tag: '凭高铁票/机票',
			distance: '距章贡中心 1.5km',
			price: '388',
			themeColor: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)'
		},
		{
			id: 201,
			name: '余记兴国米粉鱼 (灶儿巷店)',
			short_name: '兴国米粉鱼',
			category_id: 2,
			category_name: '地道美食',
			discount: '满 100 减 20',
			discount_tag: '凭古城墙门票',
			distance: '距古城墙 200m',
			price: '45',
			themeColor: 'linear-gradient(135deg, #dc2626, #991b1b)'
		},
		{
			id: 301,
			name: '江南宋城历史文化街区',
			short_name: '江南宋城',
			category_id: 3,
			category_name: '景区景点',
			discount: '夜游船票 8 折',
			discount_tag: '凭酒店住宿票根',
			distance: '章贡区古城内',
			price: '60',
			themeColor: 'linear-gradient(135deg, #0284c7, #0369a1)'
		},
		{
			id: 401,
			name: '赣茶客家擂茶文化馆',
			short_name: '客家擂茶',
			category_id: 4,
			category_name: '特色茶饮',
			discount: '第二杯半价',
			discount_tag: '凭古城景区票根',
			distance: '距郁孤台 200m',
			price: '18',
			themeColor: 'linear-gradient(135deg, #16a34a, #15803d)'
		}
	])

	const shopList = computed(() => {
		let list = mockShops.value
		if (recognizedStore.value) {
			return list.filter(s => s.name.includes(recognizedStore.value) || s.category_name.includes(
				recognizedStore.value))
		}
		if (activeCategory.value) {
			const selectedCategoryName = getCategoryName(activeCategory.value)
			const selectedCategoryId = String(getCategoryId(activeCategory.value))
			return list.filter(s => {
				const matchesId = String(s.category_id) === selectedCategoryId
				const matchesName = selectedCategoryName && (s.category_name.includes(
					selectedCategoryName) || selectedCategoryName.includes(s.category_name))
				return matchesId || matchesName
			})
		}
		return list
	})

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
		try {
			const res = await getShopCategories({
				parent_id: -1
			})
			categoryList.value = extractListData(res)
		} catch (error) {
			console.error('❌ 分类加载失败:', error)
		} finally {
			loadingCategories.value = false
		}
	}

	function onSelectCategory(category) {
		if (isCategoryActive(category)) {
			resetCategoryFilter()
			return
		}
		activeCategory.value = category
		recognizedStore.value = ''
	}

	function resetCategoryFilter() {
		activeCategory.value = null
		recognizedStore.value = ''
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
				const tempFilePath = chooseRes.tempFilePaths[0]

				uploadDialog.value = {
					visible: true,
					title: '票根智能识别',
					message: '正在上传并分析您的票根信息...',
					ticketInfo: null
				}

				try {
					// 调用已封装好的 uploadAndVerifyTicket 方法
					const res = await uploadAndVerifyTicket(tempFilePath, {
						city: currentLocation.value
					})

					// 将整个后端返回的响应对象原封不动转为格式化的 JSON 字符串
					const fullJsonString = JSON.stringify(res, null, 2)

					if (mockShops.value.length > 1) {
						mockShops.value[1] = {
							id: 201,
							name: fullJsonString,
							short_name: '接口完整JSON',
							category_id: 2,
							category_name: 'API Response',
							discount: '查看完整数据',
							discount_tag: 'JSON调试',
							distance: '实时返回',
							price: '0',
							themeColor: 'linear-gradient(135deg, #0f172a, #1e293b)'
						}
					}

					recognizedStore.value = '' // 清空搜索过滤

					// 【核心修改】将弹窗的 message 直接赋值为完整的 JSON 字符串
					uploadDialog.value = {
						visible: true,
						title: '✨ 接口返回的 JSON 数据',
						message: fullJsonString, // 直接显示 JSON
						ticketInfo: {
							type: 'JSON 调试模式',
							discount: '查看弹窗与列表'
						}
					}
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

// ... 省略后面未改动代码 ...

	function closeDialog() {
		uploadDialog.value.visible = false
	}

	function openShopDetail(shop) {
		uni.navigateTo({
			url: `/pages/shop/detail?id=${shop.id}`
		})
	}

	onMounted(() => {
		loadCategories()
		const token = uni.getStorageSync('pgtoken')
		if (token) {
			fetchProfileData()
		}
	})
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
		min-height: 100vh;
		padding: 0 28rpx;
		background-color: #f8fafc;
		color: #1e293b;
		box-sizing: border-box;
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
			width: 160rpx;
			height: 160rpx;
			border-radius: 14rpx;
			color: #fff;
			padding: 12rpx;
			box-sizing: border-box;
			display: flex;
			flex-direction: column;
			justify-content: space-between;

			.cover-badge {
				font-size: 16rpx;
				background: rgba(0, 0, 0, 0.25);
				padding: 2rpx 6rpx;
				border-radius: 4rpx;
				width: fit-content;
			}

			.cover-title {
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
			align-items: center;
			background: #fef2f2;
			border: 1rpx solid #fee2e2;
			padding: 4rpx 10rpx;
			border-radius: 8rpx;
			width: fit-content;
			margin: 8rpx 0;

			.benefit-label {
				font-size: 18rpx;
				font-weight: 800;
				color: #dc2626;
				margin-right: 8rpx;
			}

			.benefit-val {
				font-size: 20rpx;
				font-weight: 700;
				color: #b91c1c;
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

		.confirm-btn {
			margin-top: 32rpx;
			background: #dc2626;
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
		/* 弹窗内部滚动与 JSON 排版优化 */
			.dialog-scroll-box {
				max-height: 45vh;       /* 限制最大高度，防止弹窗超出屏幕 */
				margin-top: 16rpx;
				background: #f8fafc;
				border-radius: 12rpx;
				padding: 16rpx;
				box-sizing: border-box;
				border: 1rpx solid #e2e8f0;
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
