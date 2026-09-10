<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */

	/* 全局隐藏滚动条（H5）：保留滚动能力，仅不显示滚动条 */
	::-webkit-scrollbar {
		width: 0 !important;
		height: 0 !important;
		background: transparent !important;
		display: none !important;
	}

	html,
	body,
	uni-page-body,
	uni-page-wrapper,
	uni-scroll-view,
	.uni-scroll-view,
	.uni-scroll-view-content,
	scroll-view {
		scrollbar-width: none !important; /* Firefox */
		-ms-overflow-style: none !important; /* IE/Edge 旧版 */
	}

	/* 滚动容器各层默认白底会盖住页面灰底，统一透明由页面自身背景透出 */
	uni-scroll-view,
	.uni-scroll-view,
	.uni-scroll-view-content {
		background: transparent !important;
	}
</style>
