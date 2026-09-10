// 高德地图定位工具：GPS 坐标 -> 省市区名称（逆地理编码）
// key 与 manifest.json h5.sdkConfigs.maps.amap 保持一致
const AMAP_KEY = '3ac12da8e709853de761a13f8e03eebe'
const AMAP_SECURITY_JS_CODE = 'b8c62648a74d6493cd21c0c3b1feb40b'

let amapPromise = null

// 动态加载高德 JS API（带 Geocoder 插件），重复调用只加载一次
function loadAMap() {
  if (amapPromise) return amapPromise
  amapPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('仅支持浏览器环境'))
    if (window.AMap) return resolve(window.AMap)

    // 必须在 JS API 脚本加载前注入安全密钥
    window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_JS_CODE }

    const callbackName = '__amap_ready_cb__'
    window[callbackName] = () => resolve(window.AMap)

    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.Geocoder,AMap.Geolocation&callback=${callbackName}`
    script.onerror = () => {
      amapPromise = null
      reject(new Error('高德地图脚本加载失败'))
    }
    document.body.appendChild(script)
  })
  return amapPromise
}

// ===== WGS84 -> GCJ02 纠偏（火星坐标）=====
// 高德/腾讯地图使用 GCJ02，浏览器原生定位返回 WGS84，两者有数百米系统偏移。
// 仅 H5 需要纠偏；App/小程序由 uni.getLocation(type=gcj02) 底层 SDK 完成转换。
const A = 6378245.0
const EE = 0.00669342162296594323

function outOfChina(lng, lat) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(x, y) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320.0 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0
  return ret
}

function transformLng(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0
  return ret
}

// WGS84 经纬度 -> GCJ02（返回 [lng, lat]）
function wgs84ToGcj02(lng, lat) {
  if (outOfChina(lng, lat)) return [lng, lat]
  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = (lat / 180.0) * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * Math.PI)
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * Math.PI)
  return [lng + dLng, lat + dLat]
}

// H5 端优先用高德定位（返回即 gcj02，与地图标点零偏移）；失败则回退原生定位 + WGS84 纠偏
async function getH5Position() {
  try {
    const AMap = await loadAMap()
    return await new Promise((resolve, reject) => {
      AMap.plugin('AMap.Geolocation', () => {
        const geolocation = new AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 8000,
          zoomToAccuracy: false
        })
        geolocation.getCurrentPosition((status, result) => {
          if (status === 'complete' && result && result.position) {
            resolve({ longitude: result.position.getLng(), latitude: result.position.getLat() })
          } else {
            reject(new Error((result && result.message) || '高德定位失败'))
          }
        })
      })
    })
  } catch (e) {
    // 高德 SDK 不可用/定位失败 → 原生定位拿到的 WGS84 纠偏为 GCJ02
    return new Promise((resolve, reject) => {
      uni.getLocation({
        type: 'wgs84',
        success: (res) => {
          const [lng, lat] = wgs84ToGcj02(res.longitude, res.latitude)
          resolve({ longitude: lng, latitude: lat })
        },
        fail: (err) => reject(new Error(err?.errMsg || '获取定位失败'))
      })
    })
  }
}

// 获取定位坐标（统一返回 gcj02，与高德一致）
function getGpsPosition() {
  // #ifdef H5
  return getH5Position()
  // #endif
  // #ifndef H5
  return new Promise((resolve, reject) => {
    uni.getLocation({
      type: 'gcj02',
      success: (res) => resolve({ longitude: res.longitude, latitude: res.latitude }),
      fail: (err) => reject(new Error(err?.errMsg || '获取定位失败'))
    })
  })
  // #endif
}

// 逆地理编码：经纬度 -> 省市区名称
async function reverseGeocode(longitude, latitude) {
  const AMap = await loadAMap()
  return new Promise((resolve, reject) => {
    AMap.plugin('AMap.Geocoder', () => {
      const geocoder = new AMap.Geocoder()
      geocoder.getAddress([longitude, latitude], (status, result) => {
        if (status === 'complete' && result?.info === 'OK') {
          const c = result.regeocode.addressComponent || {}
          resolve({
            // 直辖市/省直辖县时 city 可能是空数组
            province: Array.isArray(c.province) ? '' : c.province || '',
            city: Array.isArray(c.city) ? '' : c.city || '',
            district: Array.isArray(c.district) ? '' : c.district || ''
          })
        } else {
          reject(new Error('逆地理编码失败'))
        }
      })
    })
  })
}

// 一步到位：GPS -> 省市区名称
async function getCurrentRegion() {
  const pos = await getGpsPosition()
  return reverseGeocode(pos.longitude, pos.latitude)
}

export { loadAMap, getGpsPosition, reverseGeocode, getCurrentRegion }
