// utils/request.js
// 统一请求工具：错误提示已内置，页面无需再写 try/catch
//
// 约定：
// - 业务成功 (code === 200): resolve 完整响应体 { code, data, msg }
// - 业务失败 / 网络失败:     自动 toast 错误信息，resolve null（不会 reject）
// - 探测类接口（失败不该弹窗的）：在 api 层传 options.silent: true
//
// 页面标准用法：
//   import { get, post } from '@/utils/request.js'
//   const res = await get('/user/profile')                    // GET 请求
//   const res = await post('/user/shop/coupon/add', data)     // POST 请求
//   const res = await post(url, data, { header, silent: true }) // 第三个参数透传请求选项
//   if (!res) return          // 失败已被统一提示，直接返回
//   const { data } = res       // 成功取数据

// 所有接口（含 uni.uploadFile 上传）的统一后端地址，改这一处即可全局切换
// export const baseURL = 'http://192.168.0.114:8081/api'
export const baseURL = 'https://wx.chenpecloud.com/api'
// export const baseURL = 'http://localhost:8081/api'

// 核心请求方法：options 兼容 { url, method, data, header, silent, ... }
export function request(options) {
  const url = options.url || ''
  const finalUrl = baseURL + (url.startsWith('/') ? url : '/' + url)

  return new Promise((resolve) => {
    uni.request({
      url: finalUrl,
      method: options.method || 'GET',
      header: options.header || {},
      data: options.data || options.params,
      success: (res) => {
        const body = res.data
        if (body && body.code === 200) {
          resolve(body)
          return
        }
        const msg = (body && (body.msg || body.message)) || '请求失败'
        // 登录失效：清本地凭证并回首页唤起登录弹窗
        if ((body && Number(body.code) === 401) || res.statusCode === 401) {
          handleUnauthorized(msg)
          resolve(null)
          return
        }
        showError(options, msg)
        resolve(null)
      },
      fail: () => {
        showError(options, '网络异常，请稍后重试')
        resolve(null)
      }
    })
  })
}

// 登录失效统一处理：清除本地凭证 → 回首页由首页弹出登录框
// 多个并发请求同时 401 时只跳转一次
let redirectingLogin = false
function handleUnauthorized(msg) {
  if (redirectingLogin) return
  redirectingLogin = true
  uni.removeStorageSync('pgtoken')
  // 首页读取该标记后自动打开登录弹窗
  uni.setStorageSync('NEED_LOGIN', 1)
  uni.showToast({ title: msg || '登录已失效，请重新登录', icon: 'none' })
  setTimeout(() => {
    uni.reLaunch({
      url: '/pages/index/index',
      complete: () => {
        // 跳转完成后释放，避免旧页面残留请求再次触发
        setTimeout(() => {
          redirectingLogin = false
        }, 1000)
      }
    })
  }, 600)
}

// POST 请求便捷方法
// @param {String} url      接口路径，如 '/send-sms'
// @param {Object} data     请求体参数
// @param {Object} options  透传请求选项（header / silent 等）
export function post(url = '', data = {}, options = {}) {
  return request({
    method: 'POST',
    url: url,
    data: data,
    ...options
  })
}

// GET 请求便捷方法（data 会自动拼为查询参数）
// @param {String} url      接口路径，如 '/cities-by-pid'
// @param {Object} data     查询参数
// @param {Object} options  透传请求选项（header / silent 等）
export function get(url = '', data = {}, options = {}) {
  return request({
    method: 'GET',
    url: url,
    data: data,
    ...options
  })
}

// 统一错误提示（options.silent: true 时不弹）
// 延迟弹出：避免被页面里 await 之后紧跟的 uni.hideLoading() 关掉（H5 下二者共享同一实例）
function showError(options, msg) {
  if (options.silent) return
  setTimeout(() => {
    uni.showToast({ title: msg, icon: 'none' })
  }, 50)
}

export default { request, get, post }
