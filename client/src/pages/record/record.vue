<template>
  <view class="record-page dd-page">
    <view class="record-hero dd-card">
      <text class="record-kicker">SPOT CAPTURE</text>
      <text class="record-title">记录一个新标点</text>
      <text class="record-subtitle">位置、鱼种、标签和图片统一按首页的视觉语言组织，整体会更清爽。</text>
    </view>
    <view class="style-section">
      <button
        v-for="s in ['路亚', '台钓']" :key="s"
        :class="['style-btn', { active: stylesSelected.includes(s) }]"
        @tap="toggleStyle(s)"
      >{{ s }}</button>
    </view>

    <view class="field location-card dd-card">
      <view class="card-head">
        <text class="dd-field-label">位置</text>
        <text class="location-state" :class="{ active: !!geo }">{{ geo ? '已选位置' : '待选位置' }}</text>
      </view>
      <view class="location-inline-row">
        <button class="map-btn map-btn-full" @tap="pickOnMap">地图选点</button>
      </view>
      <view v-if="geo" class="location-result">
        <text v-if="address" class="geo-text">{{ address }}</text>
        <text v-if="regionText || resolvingRegion" class="region-text">
          {{ resolvingRegion ? '正在识别省市区…' : regionText }}
        </text>
      </view>
      <text v-else class="location-hint">请直接在地图上选择标点位置。</text>
    </view>

    <view class="core-card dd-card" :class="{ 'species-open-card': speciesOpen }">
      <view class="section-copy">
        <text class="section-title">标点信息</text>
        <text class="section-meta">先写清位置名，再补上目标鱼种，后面找点会更快。</text>
      </view>
      <view class="field primary-field">
        <text class="dd-field-label">标点名称</text>
        <input class="dd-input" v-model="name" placeholder="定位后自动带出当前位置" @input="onNameInput" />
      </view>
      <view class="field species-field">
        <text class="dd-field-label">鱼种</text>
        <view class="species-combobox" :class="{ focus: speciesOpen }" @tap="speciesOpen = true">
          <view v-if="selectedSpecies.length" class="species-selected">
            <view v-for="fish in selectedSpecies" :key="fish" class="species-tag">
              <text>{{ fish }}</text>
              <button class="species-remove" @tap.stop="removeSpecies(fish)">×</button>
            </view>
          </view>
          <input
            class="species-input"
            v-model="speciesKeyword"
            :placeholder="selectedSpecies.length ? '继续添加' : '输入鱼种或选择'"
            confirm-type="done"
            @focus="speciesOpen = true"
            @input="onSpeciesInput"
            @confirm="addSpecies()"
          />
          <button v-if="speciesKeyword.trim()" class="species-add" @tap.stop="addSpecies()">添加</button>
        </view>
        <view v-if="speciesOpen" class="species-panel dd-card">
          <view class="species-panel-head">
            <text>{{ speciesKeyword.trim() ? '匹配鱼种' : '常见鱼种' }}</text>
            <button class="species-done" @tap.stop="speciesOpen = false">完成</button>
          </view>
          <view class="species-options">
            <button
              v-for="fish in speciesSuggestions"
              :key="fish"
              class="species-option"
              @tap.stop="addSpecies(fish)"
            >
              <text class="species-check" />
              <text>{{ fish }}</text>
            </button>
          </view>
          <text v-if="!speciesSuggestions.length" class="species-empty">这个鱼种已添加</text>
        </view>
      </view>
    </view>

    <view class="share-card dd-card">
      <view class="card-head">
        <text class="dd-field-label">分享设置</text>
        <text class="share-current">{{ shareModeText }}</text>
      </view>
      <view class="share-options">
        <button
          v-for="option in shareOptions"
          :key="option.value"
          :class="['share-option', { active: shareMode === option.value }]"
          @tap="shareMode = option.value"
        >
          <text class="share-title">{{ option.label }}</text>
        </button>
      </view>
    </view>

    <view class="field tag-card dd-card">
      <text class="dd-field-label">标点标签</text>
      <view v-if="tags.length" class="tag-list">
        <view v-for="tag in tags" :key="tag" class="spot-tag">
          <text>{{ tag }}</text>
          <button class="tag-remove" @tap.stop="removeTag(tag)">×</button>
        </view>
      </view>
      <view class="tag-input-row">
        <input
          class="dd-input tag-input"
          v-model="tagKeyword"
          placeholder="例如：好停车、不收费"
          confirm-type="done"
          @confirm="addTag()"
        />
        <button class="tag-add" @tap="addTag()">添加</button>
      </view>
      <scroll-view class="tag-presets" scroll-x>
        <view class="tag-presets-inner">
          <button
            v-for="tag in tagPresets"
            :key="tag"
            :class="['preset-tag', { active: tags.includes(tag) }]"
            @tap="toggleTag(tag)"
          >{{ tag }}</button>
        </view>
      </scroll-view>
    </view>

    <view class="photo-section dd-card" @tap="takePhoto">
      <image v-if="photoUrls.length" :src="photoUrls[0]" mode="aspectFill" class="photo-preview" />
      <view v-else class="photo-placeholder">
        <text class="photo-mark" />
        <text>拍照 / 选图</text>
      </view>
    </view>
    <view v-if="photoUrls.length" class="photo-meta-row">
      <text class="photo-meta-text">已上传 {{ photoUrls.length }} 张图片</text>
      <button class="photo-meta-clear" @tap="clearPhotos">清空图片</button>
    </view>

    <button class="extra-toggle dd-secondary-btn" @tap="extraOpen = !extraOpen">
      {{ extraOpen ? '收起补充信息' : extraButtonText }}
    </button>

    <view v-if="extraOpen" class="extra-panel dd-card">
      <view class="section-copy section-copy-tight">
        <text class="section-title">补充找点线索</text>
        <text class="section-meta">把抖音、小红书、视频号链接和现场备注补进去，后面回看会轻松很多。</text>
      </view>
      <view class="field compact-field">
        <text class="dd-field-label">补充链接</text>
        <input
          class="dd-input"
          v-model="sourceLink"
          placeholder="只填一个抖音 / 小红书 / 视频号链接"
        />
      </view>

      <view class="field compact-field">
        <text class="dd-field-label">备注</text>
        <textarea class="textarea" v-model="note" placeholder="记录水情、作钓时间、停车口、入水点、避坑信息…" />
      </view>
    </view>

    <view class="submit-bar">
      <button class="save-btn dd-primary-btn" @tap="save" :disabled="saving">
        {{ saving ? '保存中…' : '保存到我的点库' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ApiError } from '@/api/request';
import { uploadApi } from '@/api/upload';
import { useAuthStore } from '@/stores/auth';
import { useSpotStore } from '@/stores/spot';
import { spotApi } from '@/api/spots';
import { allFishOptions, fishOptionsByStyle } from '@/utils/fish';
import { normalizeTags, standardTags } from '@/utils/fish';

const auth = useAuthStore();
const spotStore = useSpotStore();

const stylesSelected = ref<string[]>(['路亚']);
const name = ref('');
const nameEditedManually = ref(false);
const selectedSpecies = ref<string[]>([]);
const speciesKeyword = ref('');
const speciesOpen = ref(false);
const tags = ref<string[]>([]);
const tagKeyword = ref('');
const tagPresets = standardTags;
const amapWebServiceKey = import.meta.env.VITE_AMAP_WEB_KEY || '';
const sourceLink = ref('');
const note = ref('');
const photo = ref('');
const photoUrls = ref<string[]>([]);
const extraOpen = ref(false);
const geo = ref<{ lat: number; lng: number } | null>(null);
const address = ref('');
const province = ref('');
const city = ref('');
const district = ref('');
const located = ref(false);
const resolvingRegion = ref(false);
const regionError = ref('');
const saving = ref(false);
const defaultGeo = { lat: 30.274, lng: 120.155 };
const shareMode = ref<'private' | 'public'>('private');
const shareOptions = [
  { value: 'private' as const, label: '私密', desc: '只进我的点库' },
  { value: 'public' as const, label: '公开', desc: '审核通过后展示到大厅' },
];
const fishOptions = computed(() => {
  const allOpts: string[] = [];
  stylesSelected.value.forEach(s => {
    const opts = fishOptionsByStyle[s];
    if (opts) allOpts.push(...opts);
  });
  return allOpts.length ? Array.from(new Set(allOpts)) : fishOptionsByStyle['路亚'];
});
const speciesSuggestionSource = computed(() => Array.from(new Set([...fishOptions.value, ...allFishOptions])));
const speciesSuggestions = computed(() => {
  const keyword = speciesKeyword.value.trim();
  const selected = new Set(selectedSpecies.value);
  const matched = keyword
    ? speciesSuggestionSource.value.filter(fish => fish.includes(keyword) || keyword.includes(fish))
    : speciesSuggestionSource.value;
  const suggestions = keyword && !selected.has(keyword) && !speciesSuggestionSource.value.includes(keyword)
    ? [keyword, ...matched]
    : matched;
  return Array.from(new Set(suggestions)).filter(fish => !selected.has(fish)).slice(0, 10);
});
const species = computed(() => selectedSpecies.value.join('、'));
const shareModeText = computed(() => shareOptions.find(option => option.value === shareMode.value)?.desc || '');
const regionText = computed(() => [province.value, city.value, district.value].filter(Boolean).join(' · '));
const extraCount = computed(() => {
  let count = 0;
  if (sourceLink.value.trim()) count += 1;
  if (note.value.trim()) count += 1;
  return count;
});
const extraButtonText = computed(() => extraCount.value ? `补充找点线索和备注 ${extraCount.value}` : '补充找点线索和备注');

  function toggleStyle(s: string) {
    if (stylesSelected.value.includes(s)) {
      if (stylesSelected.value.length > 1) {
        stylesSelected.value = stylesSelected.value.filter(item => item !== s);
      }
    } else {
      stylesSelected.value = [...stylesSelected.value, s];
    }
  }

function onSpeciesInput(e: any) {
  speciesKeyword.value = e.detail?.value ?? e.target?.value ?? '';
  speciesOpen.value = true;
}

function addSpecies(fish?: string) {
  const value = (fish || speciesKeyword.value).trim();
  if (!value) return;
  if (!selectedSpecies.value.includes(value)) {
    selectedSpecies.value = [...selectedSpecies.value, value];
  }
  speciesKeyword.value = '';
  speciesOpen.value = true;
}

function removeSpecies(fish: string) {
  selectedSpecies.value = selectedSpecies.value.filter(item => item !== fish);
}

function addTag(tag?: string) {
  const value = (tag || tagKeyword.value).trim().slice(0, 20);
  if (!value) return;
  if (!tags.value.includes(value)) {
    tags.value = [...tags.value, value].slice(0, 12);
  }
  tagKeyword.value = '';
}

function removeTag(tag: string) {
  tags.value = tags.value.filter(item => item !== tag);
}

function toggleTag(tag: string) {
  if (tags.value.includes(tag)) {
    removeTag(tag);
    return;
  }
  addTag(tag);
}

type RegionInfo = {
  province?: string;
  city?: string;
  district?: string;
  address?: string;
};

declare const window: any;
declare const document: any;

function assignRegion(info: RegionInfo) {
  province.value = info.province || '';
  city.value = info.city || '';
  district.value = info.district || '';
  if (!address.value && info.address) address.value = info.address;
}

function buildLocationName(source?: string) {
  const text = String(source || '').trim();
  if (!text) return '';
  return text.replace(/\s+/g, '');
}

function isAutoLocationName(value?: string) {
  const current = buildLocationName(value || name.value);
  if (!current) return false;
  const candidates = [
    buildLocationName(address.value),
    buildLocationName(regionText.value),
  ].filter(Boolean);
  return candidates.includes(current);
}

function syncNameWithLocation(source?: string) {
  const locationName = buildLocationName(source || address.value || regionText.value);
  if (!locationName) return;
  if (!nameEditedManually.value || !name.value.trim() || isAutoLocationName(name.value)) {
    name.value = locationName;
    nameEditedManually.value = false;
  }
}

function onNameInput(e: any) {
  name.value = e.detail?.value ?? e.target?.value ?? '';
  nameEditedManually.value = !!name.value.trim() && !isAutoLocationName(name.value);
}

function parseRegionFromText(text: string): RegionInfo {
  const source = text.trim();
  if (!source) return {};

  const municipality = source.match(/(北京市|上海市|天津市|重庆市)/)?.[1] || '';
  if (municipality) {
    const rest = source.slice(source.indexOf(municipality) + municipality.length);
    const districtMatch = rest.match(/^([\u4e00-\u9fa5]{2,}(?:区|县|旗|市))/)?.[1] || '';
    return {
      province: municipality,
      city: municipality,
      district: districtMatch,
    };
  }

  let rest = source;
  const provinceMatch = rest.match(/^([\u4e00-\u9fa5]{2,}(?:省|自治区|特别行政区))/)?.[1] || '';
  if (provinceMatch) rest = rest.slice(provinceMatch.length);
  const cityMatch = rest.match(/^([\u4e00-\u9fa5]{2,}(?:市|自治州|州|盟|地区))/)?.[1] || '';
  if (cityMatch) rest = rest.slice(cityMatch.length);
  const districtMatch = rest.match(/^([\u4e00-\u9fa5]{2,}(?:区|县|旗|市))/)?.[1] || '';

  return {
    province: provinceMatch,
    city: cityMatch,
    district: districtMatch,
  };
}

function getAmapConfig() {
  const config = ((typeof globalThis !== 'undefined' && (globalThis as any).__uniConfig)
    || (typeof window !== 'undefined' && window.__uniConfig)
    || {}) as any;
  const amapConfig = config.sdkConfigs?.maps?.amap || {};
  return {
    key: config.aMapKey || amapConfig.key || '',
    securityJsCode: config.aMapSecurityJsCode || amapConfig.securityJsCode || '',
  };
}

function loadAmapSdk() {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (window.__diaodianAmapLoading) return window.__diaodianAmapLoading;

  const { key, securityJsCode } = getAmapConfig();
  if (!key) return Promise.reject(new Error('高德地图 Key 未配置'));
  if (securityJsCode) window._AMapSecurityConfig = { securityJsCode };

  window.__diaodianAmapLoading = new Promise((resolve, reject) => {
    const callbackName = `__diaodianAmapReady_${Date.now()}`;
    const script = document.createElement('script');
    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.AMap);
    };
    script.onerror = () => {
      delete window[callbackName];
      reject(new Error('高德地图加载失败'));
    };
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&callback=${callbackName}`;
    document.body.appendChild(script);
  });
  return window.__diaodianAmapLoading;
}

async function reverseGeocodeH5(lat: number, lng: number): Promise<RegionInfo> {
  try {
    const amap = await loadAmapSdk();
    return await new Promise((resolve) => {
      amap.plugin('AMap.Geocoder', () => {
        const geocoder = new amap.Geocoder();
        geocoder.getAddress([lng, lat], (status: string, result: any) => {
          const regeocode = result?.regeocode;
          if (status !== 'complete' || !regeocode) {
            resolve({});
            return;
          }

          const component = regeocode.addressComponent || {};
          const cityName = Array.isArray(component.city) ? '' : String(component.city || '');
          const provinceName = String(component.province || '');
          resolve({
            province: provinceName,
            city: cityName || provinceName,
            district: String(component.district || ''),
            address: String(regeocode.formattedAddress || ''),
          });
        });
      });
    });
  } catch {
    return {};
  }
}

function reverseGeocodeByRest(lat: number, lng: number): Promise<RegionInfo> {
  return new Promise((resolve) => {
    if (!amapWebServiceKey) {
      regionError.value = '未配置高德 Web 服务 key';
      resolve({});
      return;
    }
    uni.request({
      url: 'https://restapi.amap.com/v3/geocode/regeo',
      method: 'GET',
      data: {
        key: amapWebServiceKey,
        location: `${lng},${lat}`,
        extensions: 'base',
      },
      success: (res: any) => {
        if (res.statusCode && res.statusCode !== 200) {
          regionError.value = `高德服务异常（HTTP ${res.statusCode}）`;
          resolve({});
          return;
        }
        const regeocode = res.data?.regeocode;
        const component = regeocode?.addressComponent || {};
        if (!regeocode) {
          const info = res.data?.info || res.data?.infocode || '未返回地址结果';
          regionError.value = `高德逆地理失败：${info}`;
          resolve({});
          return;
        }

        regionError.value = '';
        const cityName = Array.isArray(component.city) ? '' : String(component.city || '');
        const provinceName = String(component.province || '');
        resolve({
          province: provinceName,
          city: cityName || provinceName,
          district: String(component.district || ''),
          address: String(regeocode.formatted_address || ''),
        });
      },
      fail: (err: any) => {
        const errMsg = err?.errMsg || '请求失败';
        if (String(errMsg).includes('url not in domain list')) {
          regionError.value = '未配置 request 合法域名：restapi.amap.com';
        } else {
          regionError.value = `高德逆地理请求失败：${errMsg}`;
        }
        resolve({});
      },
    });
  });
}

async function resolveRegion(lat: number, lng: number, fallbackText = '') {
  resolvingRegion.value = true;
  regionError.value = '';
  try {
    let info: RegionInfo = {};
    // #ifdef H5
    info = await reverseGeocodeH5(lat, lng);
    // #endif
    // #ifndef H5
    info = await reverseGeocodeByRest(lat, lng);
    // #endif

    if (!info.province && !info.city && !info.district) {
      info = parseRegionFromText(fallbackText || address.value);
    }
    assignRegion(info);
    if (info.address) address.value = info.address;
    syncNameWithLocation(info.address || fallbackText || regionText.value);
    if (!info.address && regionError.value) {
      uni.showToast({ title: regionError.value, icon: 'none' });
    }
  } finally {
    resolvingRegion.value = false;
  }
}

function readCurrentLocation() {
  return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
    uni.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 3000,
      success: (res) => {
        resolve({ lat: res.latitude, lng: res.longitude });
      },
      fail: reject,
    });
  });
}

async function pickOnMap() {
  let initialGeo = geo.value || defaultGeo;
  try {
    const current = await readCurrentLocation();
    initialGeo = current;
  } catch {
    // fall back to the last selected point or default center
  }

  uni.chooseLocation({
    latitude: initialGeo.lat,
    longitude: initialGeo.lng,
    keyword: name.value || address.value || '',
    success: (res) => {
      geo.value = { lat: res.latitude, lng: res.longitude };
      address.value = res.address || res.name || '';
      syncNameWithLocation(res.address || res.name || '');
      located.value = true;
      resolveRegion(res.latitude, res.longitude, address.value);
    },
    fail: () => {
      uni.showToast({ title: '地图选点失败，请稍后重试', icon: 'none' });
    },
  });
}

function takePhoto() {
  uni.chooseImage({
    count: Math.max(1, 9 - photoUrls.value.length),
    success: async (res) => {
      const files = (res.tempFilePaths || []).slice(0, 9 - photoUrls.value.length);
      if (!files.length) return;
      try {
        uni.showLoading({ title: '上传图片中', mask: true });
        const uploaded: string[] = [];
        for (const file of files) {
          const result = await uploadApi.image(file);
          if (result.data?.url) {
            uploaded.push(result.data.url);
          }
        }
        photoUrls.value = [...photoUrls.value, ...uploaded].slice(0, 9);
        photo.value = photoUrls.value[0] || '';
      } catch (error: any) {
        uni.showToast({ title: error?.message || '图片上传失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },
  });
}

function clearPhotos() {
  photoUrls.value = [];
  photo.value = '';
}

function autoName() {
  return buildLocationName(address.value || regionText.value) || stylesSelected.value.join(',') + '新点';
}

async function save() {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  if (!geo.value) { uni.showToast({ title: '请先定位', icon: 'none' }); return; }

  saving.value = true;
  try {
    const data: Record<string, unknown> = {
      name: name.value || autoName(),
      style: stylesSelected.value.join(','),
      species: species.value || '未填',
      latitude: geo.value.lat,
      longitude: geo.value.lng,
      accuracy: shareMode.value,
      isPublic: shareMode.value !== 'private',
      tags: normalizeTags(tags.value),
    };
    if (photoUrls.value.length) data.photoUrls = photoUrls.value;

    if (address.value) data.address = address.value;
    if (province.value) data.province = province.value;
    if (city.value) data.city = city.value;
    if (district.value) data.district = district.value;
    if (note.value) data.note = note.value;
    const createdSpot = await spotStore.createSpot(data);
    if (createdSpot?.id && sourceLink.value.trim()) {
      await spotApi.createLink(createdSpot.id, { url: sourceLink.value.trim() });
    }
    uni.showToast({
      title: shareMode.value === 'private' ? '已保存到点库' : '已公开到标点大厅',
      icon: 'success',
    });
    // 重置表单
    name.value = ''; selectedSpecies.value = []; speciesKeyword.value = ''; speciesOpen.value = false; tags.value = []; tagKeyword.value = ''; sourceLink.value = '';
    note.value = ''; photo.value = ''; photoUrls.value = []; geo.value = null;
    address.value = ''; province.value = ''; city.value = ''; district.value = ''; located.value = false; shareMode.value = 'private'; nameEditedManually.value = false;
    uni.navigateTo({ url: '/pages/library/library' });
  } catch (e: any) {
    const error = e as ApiError;
    const duplicateSpotId = Number((error.data as any)?.spotId || 0);
    if (error.code === 409 && Number.isFinite(duplicateSpotId) && duplicateSpotId > 0) {
      uni.showModal({
        title: '发现相近标点',
        content: error.message || '2km 内已经有相同标点，是否查看详情？',
        confirmText: '查看详情',
        cancelText: '我知道了',
        success: (res) => {
          if (!res.confirm) return;
          uni.navigateTo({ url: `/pages/spot/spot?id=${duplicateSpotId}` });
        },
      });
      return;
    }
    uni.showToast({ title: error.message || '保存失败', icon: 'none' });
  } finally {
    saving.value = false;
  }
}

</script>

<style scoped>
.record-page {
  --record-ink: #222222;
  --record-muted: #6A6A6A;
  --record-muted-soft: #929292;
  --record-accent: #FF385C;
  --record-accent-soft: #FFF1F4;
  --record-line: #EBEBEB;
  --record-shadow: rgba(34, 34, 34, 0.08);
  max-width: 760px;
  padding-top: 12px;
  padding-bottom: calc(118px + env(safe-area-inset-bottom, 0px));
  background:
    radial-gradient(circle at 16% -6%, rgba(255, 56, 92, 0.08), transparent 24%),
    radial-gradient(circle at 84% 4%, rgba(255, 195, 167, 0.12), transparent 24%),
    linear-gradient(180deg, #FFFFFF 0%, #FCFCFC 42%, #F7F7F7 100%);
}
.record-hero,
.location-card,
.core-card,
.share-card,
.tag-card,
.photo-section,
.extra-panel {
  border: 1px solid var(--record-line);
  background: rgba(255,255,255,0.98);
  box-shadow: 0 14px 32px var(--record-shadow);
}
.record-hero {
  margin-bottom: 12px;
  padding: 16px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(255, 56, 92, 0.10), transparent 28%),
    linear-gradient(180deg, rgba(255,255,255,0.99), rgba(255,247,249,0.96));
}
.record-kicker {
  display: block;
  color: var(--record-muted-soft);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.05em;
}
.record-title {
  display: block;
  margin-top: 6px;
  color: var(--record-ink);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.18;
}
.record-subtitle {
  display: block;
  margin-top: 8px;
  color: var(--record-muted);
  font-size: 12px;
  line-height: 1.55;
}
.style-section { display: flex; gap: 10px; margin-bottom: 14px; }
.style-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid var(--record-line);
  background: rgba(255,255,255,0.96);
  font-size: 14px;
  font-weight: 700;
  color: var(--record-muted);
  box-shadow: 0 8px 18px rgba(34, 34, 34, 0.04);
}
.style-btn.active {
  background: var(--record-accent);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 14px 24px rgba(255, 56, 92, 0.18);
}
.location-card,
.core-card,
.share-card,
.tag-card,
.photo-section,
.extra-panel {
  border-radius: 28px;
  padding: 16px;
}
.core-card { position: relative; z-index: 4; margin-bottom: 14px; }
.core-card.species-open-card { z-index: 40; margin-bottom: 252px; }
.section-copy { margin-bottom: 12px; }
.section-copy-tight { margin-bottom: 10px; }
.section-title {
  display: block;
  color: var(--record-ink);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
}
.section-meta {
  display: block;
  margin-top: 5px;
  color: var(--record-muted);
  font-size: 12px;
  line-height: 1.45;
}
.primary-field { margin-bottom: 12px; }
.field { flex: 1; min-width: 0; }
.dd-field-label {
  margin-bottom: 6px;
  color: var(--record-muted);
  font-size: 13px;
  font-weight: 700;
}
.dd-input {
  height: 46px;
  border-radius: 18px;
  border: 1px solid var(--record-line);
  background: rgba(255,255,255,0.96);
  color: var(--record-ink);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
}
.species-field { position: relative; z-index: 42; }
.species-combobox {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  width: 100%;
  min-height: 48px;
  border: 1px solid var(--record-line);
  border-radius: 20px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.96);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
}
.species-combobox.focus {
  border-color: rgba(255, 56, 92, 0.28);
  box-shadow: 0 0 0 4px rgba(255, 56, 92, 0.08);
}
.species-selected { display: flex; flex-wrap: wrap; gap: 5px; min-width: 0; }
.species-tag,
.spot-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 999px;
  background: var(--record-accent-soft);
  color: var(--record-accent);
  font-size: 12px;
  font-weight: 700;
}
.species-tag { min-height: 24px; padding: 0 6px 0 9px; }
.spot-tag { min-height: 28px; padding: 0 6px 0 10px; }
.species-remove,
.tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--record-muted-soft);
  font-size: 14px;
  line-height: 1;
}
.species-input {
  flex: 1;
  min-width: 84px;
  height: 30px;
  color: var(--record-ink);
  font-size: 13px;
  line-height: 1.3;
}
.species-add,
.tag-add {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--record-accent);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 12px 24px rgba(255, 56, 92, 0.16);
}
.species-add { min-height: 32px; padding: 0 12px; border-radius: 999px; font-size: 12px; }
.species-panel {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 8px);
  z-index: 80;
  padding: 12px;
  max-height: 228px;
  overflow-y: auto;
  border-radius: 24px;
  border: 1px solid var(--record-line);
  background: rgba(255,255,255,0.99);
  box-shadow: 0 24px 44px rgba(34, 34, 34, 0.12);
}
.species-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: var(--record-muted);
  font-size: 12px;
  font-weight: 700;
}
.species-done {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #F7F7F7;
  color: var(--record-ink);
  font-size: 12px;
  font-weight: 700;
}
.species-options { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.species-option {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 7px;
  min-height: 40px;
  border: 1px solid var(--record-line);
  border-radius: 16px;
  background: rgba(255,255,255,0.92);
  color: var(--record-ink);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
}
.species-check {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 56, 92, 0.22);
  border-radius: 4px;
  background: #fff;
}
.species-empty { display: block; padding: 8px 2px 2px; color: var(--record-muted); font-size: 12px; }
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
}
.card-head .dd-field-label { margin-bottom: 0; }
.tag-card { margin-bottom: 12px; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.tag-input-row { display: flex; align-items: center; gap: 8px; }
.tag-input { flex: 1; min-width: 0; }
.tag-add { min-height: 44px; padding: 0 14px; border-radius: 18px; font-size: 13px; }
.tag-presets { width: 100%; margin-top: 9px; white-space: nowrap; }
.tag-presets ::-webkit-scrollbar { display: none; width: 0; height: 0; }
.tag-presets-inner { display: inline-flex; gap: 8px; padding-bottom: 2px; }
.preset-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--record-line);
  background: rgba(255,255,255,0.96);
  color: var(--record-muted);
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 8px 16px rgba(34, 34, 34, 0.04);
}
.preset-tag.active {
  border-color: transparent;
  background: var(--record-accent);
  color: #fff;
  box-shadow: 0 10px 20px rgba(255, 56, 92, 0.18);
}
.share-card { margin-bottom: 14px; }
.share-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.share-option {
  min-height: 42px;
  border: 1px solid var(--record-line);
  border-radius: 18px;
  padding: 0 6px;
  background: rgba(255,255,255,0.96);
  text-align: center;
}
.share-option.active {
  border-color: rgba(255, 56, 92, 0.22);
  background: linear-gradient(135deg, #FFFFFF 0%, #FFF6F8 100%);
  box-shadow: 0 10px 20px rgba(255, 56, 92, 0.08);
}
.share-title {
  display: block;
  color: var(--record-ink);
  font-size: 13px;
  font-weight: 700;
}
.share-option.active .share-title { color: var(--record-accent); }
.share-current {
  color: var(--record-muted);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.location-state {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  background: #F7F7F7;
  color: var(--record-muted);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid var(--record-line);
}
.location-state.active {
  background: var(--record-accent-soft);
  color: var(--record-accent);
  border-color: rgba(255,56,92,0.14);
}
.location-inline-row { display: block; }
.map-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  border-radius: 999px;
  background: #FFFFFF;
  color: var(--record-ink);
  border: 1px solid var(--record-line);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 8px 18px rgba(34, 34, 34, 0.04);
}
.map-btn-full {
  width: 100%;
  min-height: 50px;
  font-size: 15px;
  background: var(--record-accent);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 14px 28px rgba(255, 56, 92, 0.18);
}
.location-result {
  margin-top: 10px;
  padding: 14px 14px 13px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255,255,255,0.99), rgba(250,250,250,0.96));
  border: 1px solid var(--record-line);
}
.geo-text {
  display: block;
  color: var(--record-ink);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.5;
}
.region-text {
  display: block;
  margin-top: 6px;
  color: var(--record-muted);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
}
.location-hint {
  display: block;
  margin-top: 8px;
  color: var(--record-muted);
  font-size: 12px;
  line-height: 1.4;
}
.photo-section { margin-bottom: 12px; overflow: hidden; }
.photo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 92px;
  border: 1px dashed rgba(255, 56, 92, 0.22);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255,255,255,0.99), rgba(255,247,249,0.96));
  color: var(--record-muted);
  font-size: 13px;
  font-weight: 700;
}
.photo-mark {
  width: 24px;
  height: 18px;
  border: 2px solid var(--record-accent);
  border-radius: 5px;
  position: relative;
}
.photo-mark::before {
  content: "";
  position: absolute;
  left: 7px;
  top: 4px;
  width: 6px;
  height: 6px;
  border: 2px solid var(--record-accent);
  border-radius: 50%;
}
.photo-preview { width: 100%; height: 156px; border-radius: 22px; }
.photo-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: -6px;
  margin-bottom: 12px;
  padding: 0 4px;
}
.photo-meta-text {
  color: var(--record-muted);
  font-size: 12px;
  line-height: 1.4;
}
.photo-meta-clear {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--record-accent-soft);
  color: var(--record-accent);
  font-size: 11px;
  font-weight: 700;
}
.extra-toggle {
  width: 100%;
  min-height: 42px;
  margin-bottom: 12px;
  color: var(--record-accent);
  border-color: var(--record-line);
  background: rgba(255,255,255,0.96);
  box-shadow: 0 10px 20px rgba(34, 34, 34, 0.05);
}
.compact-field { margin-bottom: 10px; }
.compact-field:last-child { margin-bottom: 0; }
.textarea {
  width: 100%;
  min-height: 88px;
  border: 1px solid var(--record-line);
  border-radius: 20px;
  padding: 12px 14px;
  background: rgba(255,255,255,0.96);
  font-size: 14px;
  line-height: 1.5;
  color: var(--record-ink);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
}
.textarea-compact { min-height: 76px; }
.submit-bar {
  position: sticky;
  bottom: 0;
  z-index: 6;
  margin: 2px -2px 0;
  padding: 10px 2px calc(env(safe-area-inset-bottom, 0px) + 4px);
  background: linear-gradient(180deg, rgba(247,247,247,0), rgba(247,247,247,0.94) 30%, #F7F7F7 100%);
}
.save-btn {
  width: 100%;
  margin-top: 0;
  min-height: 52px;
  border-radius: 999px;
  background: var(--record-accent);
  box-shadow: 0 20px 34px rgba(255, 56, 92, 0.22);
}
.save-btn[disabled] { opacity: 0.6; }

@media (max-width: 430px) {
  .record-page {
    padding-left: 10px;
    padding-right: 10px;
  }

  .record-hero,
  .location-card,
  .core-card,
  .share-card,
  .tag-card,
  .photo-section,
  .extra-panel {
    border-radius: 24px;
    padding: 14px;
  }

  .record-title {
    font-size: 21px;
  }

  .dd-field-label {
    font-size: 11px;
  }

  .tag-input-row {
    display: grid;
    grid-template-columns: 1fr;
  }

  .share-options {
    gap: 6px;
  }
}

@media (max-width: 360px) {
  .species-options {
    grid-template-columns: 1fr;
  }

  .species-option {
    min-height: 40px;
    height: auto;
    padding: 8px 10px;
  }
}
</style