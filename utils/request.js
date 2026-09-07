// utils/request.js
export default function request(options) {
  // 🛑 强制写死绝对路径，不依赖任何环境变量
   const baseURL = 'https://wx.chenpecloud.com/api'
//const baseURL = 'http://localhost:8081/api'
  let url = options.url || ''
  const finalUrl = baseURL + (url.startsWith('/') ? url : '/' + url)

  // 此时控制台打印出来的必须是：https://wx.chenpecloud.com/api/shop-categories
  console.log('【最终检查】发往后端的绝对地址:', finalUrl)

  return new Promise((resolve, reject) => {
    uni.request({
      url: finalUrl,
      method: options.method || 'GET',
	  // 👇 必须加上这行，把外面传进来的 header 透传到底层
	        header: options.header || {},
      data: options.data || options.params,
      success: (res) => {
        resolve(res.data)
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}
