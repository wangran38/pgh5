// utils/usePageList.js
// 可复用的分页列表组合式函数（Vue3 + uni-app）
//
// 用法：
//   import { usePageList } from '@/utils/usePageList.js'
//
//   // fetcher 接收 { page, limit }，返回 request 响应（成功 {code,data,...}，失败 resolve null 且已自动 toast）
//   const { list, loading, finished, refresh, loadMore } = usePageList((p) => getCouponList(p))
//
//   onMounted(refresh)          // 首次加载 / 下拉刷新
//   onReachBottom(loadMore)     // 触底加载下一页
//
// 默认从 res.data.{list,total} 取值；后端结构不同时用 options 自定义
//   const pg = usePageList(fn, { pageSize: 20, listKey: 'rows', totalKey: 'count', rootOf: r => r?.result })
import { ref, computed } from 'vue'

export function usePageList(fetcher, options = {}) {
  const pageSize = options.pageSize ?? 10
  const listKey = options.listKey || 'list'
  const totalKey = options.totalKey || 'total'
  // 从响应中取分页数据体，默认 res.data
  const rootOf = options.rootOf || ((res) => (res ? res.data : null))

  const list = ref([])
  const page = ref(1)
  const total = ref(0)
  const loading = ref(false)
  // 是否已加载完全部数据（触底后不再请求）
  const finished = ref(false)

  const hasMore = computed(() => list.value.length < total.value)

  // 请求指定页；replace=true 表示第一页（覆盖旧数据），否则追加
  async function loadPage(targetPage, replace) {
    if (loading.value) return false
    loading.value = true
    const res = await fetcher({ page: targetPage, limit: pageSize })
    loading.value = false

    // 请求失败（request 已自动 toast 并 resolve null）
    if (!res) return false

    const payload = rootOf(res) || {}
    const rows = Array.isArray(payload[listKey]) ? payload[listKey] : []
    total.value = Number(payload[totalKey]) || 0

    if (replace) {
      list.value = rows
    } else {
      // 按 id 去重，避免服务端数据变动导致重复项
      const seen = new Set(list.value.map((it) => it.id))
      list.value = list.value.concat(rows.filter((it) => it && it.id !== undefined && !seen.has(it.id)))
    }
    page.value = targetPage
    finished.value = rows.length < pageSize || list.value.length >= total.value
    return true
  }

  // 刷新（回到第一页）
  async function refresh() {
    return loadPage(1, true)
  }

  // 触底加载下一页
  async function loadMore() {
    if (loading.value || finished.value) return false
    return loadPage(page.value + 1, false)
  }

  return { list, page, total, pageSize, loading, finished, hasMore, refresh, loadMore }
}
