<template>
  <view class="search-page dd-page">
    <view class="search-head dd-card">
      <view class="search-head-top">
        <button class="back-btn" @tap="goBack">返回</button>
        <view class="search-bar">
          <text class="search-icon">⌕</text>
          <input
            class="search-input"
            v-model="keyword"
            placeholder="搜索标点 / 鱼种 / 标签"
            confirm-type="search"
            focus
            @confirm="submitSearch"
          />
          <button v-if="keyword" class="search-clear" @tap="keyword = ''">清除</button>
        </view>
        <button class="search-submit" @tap="submitSearch">搜索</button>
      </view>

      <button class="location-entry" @tap="openCitySheet">
        <view class="location-entry-copy">
          <text class="location-entry-kicker">找点位置</text>
          <text class="location-entry-value">{{ quickRegionText }}</text>
        </view>
        <text class="location-entry-action">切换城市</text>
      </button>

      <view v-if="resultMode" class="result-quick-bar">
        <scroll-view class="quick-style-row" scroll-x>
          <view class="quick-style-inner">
            <button
              v-for="item in styleOptions"
              :key="item"
              :class="['quick-style-chip', { active: style === item }]"
              @tap="setStyle(item)"
            >{{ item }}</button>
          </view>
        </scroll-view>
        <button class="more-filter-btn" :class="{ active: filterCount > 0 }" @tap="openFilterSheet">
          {{ filterCount ? `已筛 ${filterCount}` : '更多筛选' }}
        </button>
      </view>

      <view class="search-summary-row">
        <text class="search-summary">{{ summaryText }}</text>
        <button v-if="resultMode" class="search-summary-clear" @tap="resetToDiscovery">重新找点</button>
      </view>
    </view>

    <view v-if="!resultMode" class="discovery-panel">
      <view class="section dd-card">
        <view class="section-head">
          <text class="section-title">你可以这样找</text>
        </view>
        <view class="hint-list">
          <text class="hint-item">搜鱼种：翘嘴、鲫鱼、鳜鱼</text>
          <text class="hint-item">搜标签：好停车、夜钓友好、适合新手</text>
          <text class="hint-item">搜位置：密云水库、潮白河、沙河</text>
        </view>
      </view>
    </view>

    <scroll-view
      v-else
      class="result-list"
      scroll-y
      @scrolltolower="loadMore"
    >
      <view class="result-hero dd-card">
        <view class="result-hero-copy">
          <text class="result-hero-kicker">搜索结果</text>
          <text class="result-hero-title">{{ resultTitle }}</text>
          <text class="result-hero-desc">{{ resultDescription }}</text>
        </view>
        <view class="result-hero-metrics">
          <view class="result-metric">
            <text class="result-metric-value">{{ total }}</text>
            <text class="result-metric-label">匹配结果</text>
          </view>
          <view class="result-metric">
            <text class="result-metric-value">{{ quickRegionText }}</text>
            <text class="result-metric-label">当前范围</text>
          </view>
        </view>
      </view>

      <SpotCard
        v-for="(spot, index) in spots"
        :key="spot.id"
        :spot="spot"
        :index="index"
        @select="goDetail"
        @plan="addToPlan"
      />

      <view v-if="loading && spots.length === 0" class="loading">搜索中...</view>
      <view v-else-if="!loading && spots.length === 0" class="dd-empty dd-card">
        <text>没有找到匹配的标点，换个关键词或者再加一点筛选试试。</text>
      </view>
      <view v-else-if="loadingMore" class="loading">加载更多中...</view>
      <view v-else-if="spots.length > 0 && !hasMore" class="loading">没有更多了</view>
    </scroll-view>

    <view v-if="citySheetOpen" class="filter-sheet-mask" @tap="closeCitySheet">
      <view class="filter-sheet city-sheet dd-card" @tap.stop>
        <view class="filter-sheet-head">
          <text class="filter-sheet-title">城市范围</text>
          <button class="ghost-action" @tap="closeCitySheet">关闭</button>
        </view>

        <view class="city-current-card">
          <text class="city-current-label">当前找点位置</text>
          <text class="city-current-value">{{ quickRegionText }}</text>
        </view>

        <view class="filter-section">
          <text class="filter-label">选择城市</text>
          <view class="picker-row">
            <picker class="picker" mode="selector" :range="provinceOptions" :value="selectedProvinceIndex" @change="onProvinceChange">
              <view class="picker-value">{{ selectedProvince || '全部省份' }}</view>
            </picker>
            <picker class="picker" mode="selector" :range="cityOptions" :value="selectedCityIndex" @change="onCityChange">
              <view class="picker-value">{{ selectedCity || '全部城市' }}</view>
            </picker>
          </view>
        </view>

        <view class="filter-actions">
          <button class="reset-btn" @tap="resetRegion">全国范围</button>
          <button class="apply-btn" @tap="applyCityFilter">应用城市</button>
        </view>
      </view>
    </view>

    <view v-if="filtersOpen" class="filter-sheet-mask" @tap="closeFilterSheet">
      <view class="filter-sheet dd-card" @tap.stop>
        <view class="filter-sheet-head">
          <text class="filter-sheet-title">更多筛选</text>
          <button class="ghost-action" @tap="closeFilterSheet">关闭</button>
        </view>

        <view class="filter-section">
          <text class="filter-label">鱼种</text>
          <view class="compact-chip-grid">
            <button
              v-for="item in allFishOptions"
              :key="item"
              :class="['ghost-chip compact-chip', { active: selectedSpecies.includes(item) }]"
              @tap="toggleSpecies(item)"
            >{{ item }}</button>
          </view>
        </view>

        <view class="filter-section">
          <text class="filter-label">标签</text>
          <view
            v-for="group in standardTagGroups"
            :key="group.title"
            class="tag-group"
          >
            <text class="tag-group-title">{{ group.title }}</text>
            <view class="compact-chip-grid">
              <button
                v-for="item in group.items"
                :key="item"
                :class="['ghost-chip compact-chip', { active: selectedTags.includes(item) }]"
                @tap="toggleTag(item)"
              >{{ item }}</button>
            </view>
          </view>
        </view>

        <view class="filter-actions">
          <button class="reset-btn" @tap="resetFilters">重置</button>
          <button class="apply-btn" @tap="applyFilters">应用筛选</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import SpotCard from '@/components/SpotCard.vue';
import { spotApi, type SpotItem, type SpotRegionItem } from '@/api/spots';
import { useTripStore } from '@/stores/trip';
import { useAuthStore } from '@/stores/auth';
import { allFishOptions, standardTagGroups } from '@/utils/fish';
import { buildStandardRegionOptions, normalizeRegionSelection } from '@/utils/china-regions';
import {
  HALL_SEARCH_DRAFT_STORAGE_KEY,
  type HallSearchState,
} from '@/utils/hall-search';

const keyword = ref('');
const style = ref('全部');
const selectedSpecies = ref<string[]>([]);
const selectedTags = ref<string[]>([]);
const selectedProvince = ref('');
const selectedCity = ref('');
const citySheetOpen = ref(false);
const filtersOpen = ref(false);
const resultMode = ref(false);
const loading = ref(false);
const loadingMore = ref(false);
const spots = ref<SpotItem[]>([]);
const total = ref(0);
const page = ref(1);
const hotKeywords = ref<Array<{ keyword: string; count: number }>>([]);
const regionOptions = ref<SpotRegionItem[]>([]);
const searchHistory = ref<string[]>([]);
const trip = useTripStore();
const auth = useAuthStore();

const SEARCH_HISTORY_STORAGE_KEY = 'hall:search-history';
const pageSize = 20;
const styleOptions = ['全部', '路亚', '台钓'];

function normalizeTextValue(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.keyword === 'string') return record.keyword.trim();
    if (typeof record.label === 'string') return record.label.trim();
    if (typeof record.name === 'string') return record.name.trim();
    if (typeof record.value === 'string') return record.value.trim();
  }
  return '';
}

const provinceOptions = computed(() => ['全部省份', ...regionOptions.value.map(item => item.province)]);
const selectedProvinceIndex = computed(() => {
  if (!selectedProvince.value) return 0;
  return Math.max(0, provinceOptions.value.indexOf(selectedProvince.value));
});
const cityOptions = computed(() => {
  const target = regionOptions.value.find(item => item.province === selectedProvince.value);
  return ['全部城市', ...(target?.cities || [])];
});
const selectedCityIndex = computed(() => {
  if (!selectedCity.value) return 0;
  return Math.max(0, cityOptions.value.indexOf(selectedCity.value));
});
const filterCount = computed(() => {
  let count = 0;
  count += selectedSpecies.value.length;
  count += selectedTags.value.length;
  return count;
});
const keywordText = computed(() => normalizeTextValue(keyword.value));
const provinceText = computed(() => normalizeTextValue(selectedProvince.value));
const cityText = computed(() => normalizeTextValue(selectedCity.value));
const styleText = computed(() => normalizeTextValue(style.value) || '全部');
const quickRegionText = computed(() => (
  cityText.value || provinceText.value || '全国范围'
));
const summaryText = computed(() => {
  if (!resultMode.value) {
    return '先搜想去的地方，再用城市、钓法和细筛收窄范围。';
  }
  const parts = [];
  if (keywordText.value) parts.push(`关键词：${keywordText.value}`);
  if (styleText.value !== '全部') parts.push(`钓法：${styleText.value}`);
  if (cityText.value) parts.push(`城市：${cityText.value}`);
  else if (provinceText.value) parts.push(`省份：${provinceText.value}`);
  if (filterCount.value > 0) parts.push(`细筛 ${filterCount.value} 项`);
  return parts.length ? parts.join(' · ') : '全国范围 · 不限钓法';
});
const resultTitle = computed(() => {
  if (keywordText.value) return `“${keywordText.value}” 的搜索结果`;
  if (cityText.value) return `${cityText.value} 标点结果`;
  if (provinceText.value) return `${provinceText.value} 标点结果`;
  return '全部搜索结果';
});
const resultDescription = computed(() => {
  const parts = [];
  if (styleText.value !== '全部') parts.push(`钓法：${styleText.value}`);
  if (selectedSpecies.value.length) parts.push(`鱼种：${selectedSpecies.value.slice(0, 2).join(' / ')}`);
  if (selectedTags.value.length) parts.push(`标签：${selectedTags.value.slice(0, 2).join(' / ')}`);
  return parts.length ? `${parts.join(' · ')}。继续上滑浏览结果。` : '你可以继续用城市、钓法和更多筛选收窄结果。';
});
const hasMore = computed(() => spots.value.length < total.value);

function hasSearchIntent(payload?: HallSearchState) {
  const source = payload || {
    keyword: keyword.value,
    style: style.value,
    species: selectedSpecies.value,
    tags: selectedTags.value,
    province: selectedProvince.value,
    city: selectedCity.value,
  };
  return Boolean(
    normalizeTextValue(source.keyword)
    || (normalizeTextValue(source.style) && normalizeTextValue(source.style) !== '全部')
    || (source.species && source.species.length)
    || (source.tags && source.tags.length)
    || normalizeTextValue(source.province)
    || normalizeTextValue(source.city)
  );
}

function readDraft() {
  try {
    return (uni.getStorageSync(HALL_SEARCH_DRAFT_STORAGE_KEY) || {}) as HallSearchState;
  } catch {
    return {};
  }
}

function persistDraft() {
  const payload: HallSearchState = {
    keyword: keywordText.value,
    style: styleText.value,
    species: [...selectedSpecies.value],
    tags: [...selectedTags.value],
    province: provinceText.value,
    city: cityText.value,
  };
  uni.setStorageSync(HALL_SEARCH_DRAFT_STORAGE_KEY, payload);
}

function loadHistory() {
  try {
    const saved = uni.getStorageSync(SEARCH_HISTORY_STORAGE_KEY);
    searchHistory.value = Array.isArray(saved) ? saved.map(String).filter(Boolean) : [];
  } catch {
    searchHistory.value = [];
  }
}

function pushHistory(value: string) {
  const text = value.trim();
  if (!text) return;
  const next = [text, ...searchHistory.value.filter(item => item !== text)].slice(0, 12);
  searchHistory.value = next;
  uni.setStorageSync(SEARCH_HISTORY_STORAGE_KEY, next);
}

function clearHistory() {
  searchHistory.value = [];
  uni.removeStorageSync(SEARCH_HISTORY_STORAGE_KEY);
}

function removeHistoryItem(value: string) {
  searchHistory.value = searchHistory.value.filter(item => item !== value);
  uni.setStorageSync(SEARCH_HISTORY_STORAGE_KEY, searchHistory.value);
}

function applyKeyword(value: string) {
  keyword.value = value;
  submitSearch();
}

function openFilterSheet() {
  filtersOpen.value = true;
}

function closeFilterSheet() {
  filtersOpen.value = false;
}

function openCitySheet() {
  citySheetOpen.value = true;
}

function closeCitySheet() {
  citySheetOpen.value = false;
}

function toggleSpecies(value: string) {
  selectedSpecies.value = selectedSpecies.value.includes(value)
    ? selectedSpecies.value.filter(item => item !== value)
    : [...selectedSpecies.value, value].slice(0, 8);
}

function toggleTag(value: string) {
  selectedTags.value = selectedTags.value.includes(value)
    ? selectedTags.value.filter(item => item !== value)
    : [...selectedTags.value, value].slice(0, 8);
}

function resetFilters() {
  selectedSpecies.value = [];
  selectedTags.value = [];
}

function resetRegion() {
  selectedProvince.value = '';
  selectedCity.value = '';
}

function resetToDiscovery() {
  keyword.value = '';
  style.value = '全部';
  resetFilters();
  resetRegion();
  resultMode.value = false;
  spots.value = [];
  total.value = 0;
  page.value = 1;
  persistDraft();
}

function applyFilters() {
  closeFilterSheet();
  persistDraft();
  if (resultMode.value) {
    loadResults();
  }
}

function applyCityFilter() {
  closeCitySheet();
  persistDraft();
  if (resultMode.value) {
    loadResults();
  }
}

function onProvinceChange(event: any) {
  const nextIndex = Number(event?.detail?.value ?? 0);
  const nextValue = provinceOptions.value[nextIndex] || '';
  selectedProvince.value = nextValue === '全部省份' ? '' : nextValue;
  if (!cityOptions.value.includes(selectedCity.value)) {
    selectedCity.value = '';
  }
}

function onCityChange(event: any) {
  const nextIndex = Number(event?.detail?.value ?? 0);
  const nextValue = cityOptions.value[nextIndex] || '';
  selectedCity.value = nextValue === '全部城市' ? '' : nextValue;
}

function setStyle(value: string) {
  style.value = value;
  persistDraft();
  if (resultMode.value) {
    loadResults();
  }
}

function buildListParams(pageValue: number) {
  const params: Record<string, string> = {
    publicOnly: 'true',
    page: String(pageValue),
    pageSize: String(pageSize),
  };
  if (keywordText.value) params.keyword = keywordText.value;
  if (styleText.value !== '全部') params.style = styleText.value;
  if (provinceText.value) params.province = provinceText.value;
  if (cityText.value) params.city = cityText.value;
  if (selectedSpecies.value.length) params.species = selectedSpecies.value.join(',');
  if (selectedTags.value.length) params.tag = selectedTags.value.join(',');
  return params;
}

async function loadResults() {
  if (loading.value) return;
  loading.value = true;
  try {
    const res = await spotApi.list(buildListParams(1));
    spots.value = res.data?.items || [];
    total.value = Number(res.data?.total || 0);
    page.value = 1;
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (loading.value || loadingMore.value || !hasMore.value) return;
  loadingMore.value = true;
  const nextPage = page.value + 1;
  try {
    const res = await spotApi.list(buildListParams(nextPage));
    if (res.data) {
      spots.value.push(...(res.data.items || []));
      total.value = Number(res.data.total || total.value);
      page.value = nextPage;
    }
  } finally {
    loadingMore.value = false;
  }
}

function submitSearch() {
  const text = keywordText.value;
  if (text) {
    pushHistory(text);
  }
  resultMode.value = true;
  persistDraft();
  loadResults();
}

async function loadRegions() {
  try {
    const res = await spotApi.regions();
    regionOptions.value = buildStandardRegionOptions((res.data?.items || []).map(item => ({
      province: String(item.province || '').trim(),
      cities: (item.cities || []).map(city => String(city || '').trim()).filter(Boolean),
    })).filter(item => item.province));
  } catch {
    regionOptions.value = buildStandardRegionOptions();
  }
}

async function loadHotKeywords() {
  try {
    const res = await spotApi.hotKeywords({
      city: selectedCity.value,
      province: selectedProvince.value,
      limit: '8',
    });
    hotKeywords.value = res.data?.items || [];
  } catch {
    hotKeywords.value = [];
  }
}

function initFromDraft() {
  const draft = readDraft();
  keyword.value = normalizeTextValue(draft.keyword);
  style.value = normalizeTextValue(draft.style) || '全部';
  selectedSpecies.value = Array.isArray(draft.species) ? draft.species.map(String).filter(Boolean) : [];
  selectedTags.value = Array.isArray(draft.tags) ? draft.tags.map(String).filter(Boolean) : [];
  const region = normalizeRegionSelection({
    province: draft.province,
    city: draft.city,
  });
  selectedProvince.value = region.province;
  selectedCity.value = region.city;
  resultMode.value = hasSearchIntent(draft);
  persistDraft();
}

function goBack() {
  persistDraft();
  uni.navigateBack();
}

function goDetail(id: number) {
  if (!requireLogin()) return;
  persistDraft();
  uni.navigateTo({ url: `/pages/spot/spot?id=${id}` });
}

function addToPlan(spot: SpotItem) {
  if (!requireLogin()) return;
  trip.add(spot);
}

function requireLogin() {
  if (auth.isLoggedIn) return true;
  uni.navigateTo({ url: '/pages/login/login' });
  return false;
}

onLoad(() => {
  initFromDraft();
});

onMounted(async () => {
  trip.load();
  loadHistory();
  await loadRegions();
  await loadHotKeywords();
  if (resultMode.value) {
    loadResults();
  }
});

watch([selectedCity, selectedProvince], () => {
  loadHotKeywords();
});
</script>

<style scoped>
.search-page {
  --search-ink: #222222;
  --search-muted: #6A6A6A;
  --search-muted-soft: #929292;
  --search-accent: #FF385C;
  --search-accent-soft: #FFF1F4;
  --search-line: #EBEBEB;
  max-width: 760px;
  padding-top: 12px;
  padding-bottom: 30px;
  background:
    radial-gradient(circle at 14% -8%, rgba(255, 56, 92, 0.08), transparent 24%),
    radial-gradient(circle at 86% 6%, rgba(255, 195, 167, 0.12), transparent 24%),
    linear-gradient(180deg, #FFFFFF 0%, #FCFCFC 44%, #F7F7F7 100%);
}
.search-head,
.section,
.filter-sheet,
.result-hero {
  border-color: var(--search-line);
  background: rgba(255,255,255,0.98);
}
.search-head {
  padding: 14px;
  border-radius: 28px;
  box-shadow: 0 16px 28px rgba(34, 34, 34, 0.06);
}
.search-head-top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.back-btn,
.search-submit,
.search-clear,
.more-filter-btn,
.ghost-action,
.reset-btn,
.apply-btn,
.search-summary-clear {
  flex: none;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}
.back-btn,
.search-clear,
.ghost-action,
.reset-btn,
.search-summary-clear {
  background: #F4F4F4;
  color: #555555;
}
.search-submit,
.apply-btn,
.more-filter-btn.active {
  background: var(--search-accent);
  color: #FFFFFF;
  box-shadow: 0 14px 24px rgba(255, 56, 92, 0.18);
}
.search-bar {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 0 12px;
  border-radius: 18px;
  border: 1px solid var(--search-line);
  background: #FFFFFF;
}
.search-icon {
  color: var(--search-accent);
  font-size: 16px;
  font-weight: 700;
}
.search-input {
  flex: 1;
  min-width: 0;
  height: 38px;
  font-size: 15px;
  color: var(--search-ink);
}
.location-entry {
  width: 100%;
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid var(--search-line);
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,250,250,0.96));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
}
.location-entry-copy {
  flex: 1;
  min-width: 0;
}
.location-entry-kicker {
  display: block;
  color: var(--search-muted-soft);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.1;
}
.location-entry-value {
  display: block;
  margin-top: 5px;
  color: var(--search-ink);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.25;
}
.location-entry-action {
  flex: none;
  color: var(--search-accent);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}
.result-quick-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}
.quick-style-row {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
}
.quick-style-inner {
  display: inline-flex;
  gap: 8px;
  padding-right: 4px;
}
.quick-style-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--search-line);
  background: rgba(255,255,255,0.96);
  color: var(--search-ink);
  font-size: 12px;
  font-weight: 600;
}
.quick-style-chip.active {
  border-color: transparent;
  background: var(--search-accent);
  color: #fff;
  box-shadow: 0 10px 22px rgba(255, 56, 92, 0.18);
}
.more-filter-btn {
  background: var(--search-accent-soft);
  color: var(--search-accent);
}
.search-summary-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}
.search-summary {
  flex: 1;
  min-width: 0;
  color: var(--search-muted);
  font-size: 12px;
  line-height: 1.5;
}
.section {
  margin-top: 10px;
  padding: 14px;
  border-radius: 24px;
  box-shadow: 0 12px 24px rgba(34, 34, 34, 0.05);
}
.section-head,
.filter-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.section-title,
.filter-sheet-title {
  color: var(--search-ink);
  font-size: 15px;
  font-weight: 700;
}
.hot-keyword-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.hot-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-height: 86px;
  padding: 12px;
  border-radius: 18px;
  border: 1px solid rgba(255, 56, 92, 0.10);
  background:
    radial-gradient(circle at top right, rgba(255, 56, 92, 0.10), transparent 36%),
    linear-gradient(180deg, rgba(255,255,255,0.99), rgba(255,247,249,0.96));
  box-shadow: 0 10px 22px rgba(34, 34, 34, 0.05);
}
.hot-card-rank {
  color: var(--search-accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.hot-card-keyword {
  color: var(--search-ink);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
}
.hot-card-meta {
  color: var(--search-muted);
  font-size: 11px;
  line-height: 1.2;
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 8px 0 12px;
  border-radius: 14px;
  background: #FAFAFA;
}
.history-main {
  flex: 1;
  min-width: 0;
  min-height: 40px;
  display: flex;
  align-items: center;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}
.history-remove {
  flex: none;
  width: 28px;
  min-width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #EFEFEF;
  color: #7A7A7A;
  font-size: 16px;
  line-height: 1;
}
.history-text,
.empty-text,
.hint-item,
.filter-label,
.tag-group-title,
.picker-value {
  color: #555555;
  font-size: 13px;
  line-height: 1.45;
}
.hint-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.result-list {
  margin-top: 10px;
  max-height: calc(100vh - 148px);
}
.result-hero {
  margin-bottom: 12px;
  padding: 16px;
  border-radius: 24px;
  box-shadow: 0 16px 28px rgba(34, 34, 34, 0.06);
}
.result-hero-kicker {
  display: block;
  color: var(--search-muted-soft);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.04em;
}
.result-hero-title {
  display: block;
  margin-top: 6px;
  color: var(--search-ink);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}
.result-hero-desc {
  display: block;
  margin-top: 6px;
  color: var(--search-muted);
  font-size: 12px;
  line-height: 1.55;
}
.result-hero-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.result-metric {
  padding: 12px;
  border-radius: 18px;
  border: 1px solid rgba(255, 56, 92, 0.08);
  background: rgba(255,255,255,0.92);
}
.result-metric-value {
  display: block;
  color: var(--search-ink);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}
.result-metric-label {
  display: block;
  margin-top: 4px;
  color: var(--search-muted);
  font-size: 11px;
  line-height: 1.35;
}
.loading {
  text-align: center;
  padding: 20px;
  color: var(--search-muted);
  font-size: 13px;
}
.filter-sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  padding: 18px 12px;
  background: rgba(17, 17, 17, 0.26);
}
.filter-sheet {
  max-height: calc(100vh - 36px);
  padding: 14px 14px 16px;
  border-radius: 26px;
  overflow-y: auto;
}
.city-sheet {
  margin-top: 42px;
}
.city-current-card {
  margin-top: 12px;
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(255, 241, 244, 0.96), rgba(255,255,255,0.98));
  border: 1px solid rgba(255, 56, 92, 0.12);
}
.city-current-label {
  display: block;
  color: var(--search-muted);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
}
.city-current-value {
  display: block;
  margin-top: 6px;
  color: var(--search-ink);
  font-size: 18px;
  font-weight: 800;
  line-height: 1.25;
}
.filter-section {
  margin-top: 12px;
  padding: 12px;
  border-radius: 18px;
  background: #FCFCFC;
  border: 1px solid #F0F0F0;
}
.filter-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 700;
  color: var(--search-ink);
  font-size: 12px;
}
.picker-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.picker-value {
  min-height: 40px;
  padding: 0 12px;
  border-radius: 14px;
  border: 1px solid var(--search-line);
  background: #FFFFFF;
  display: flex;
  align-items: center;
}
.compact-chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.ghost-chip {
  min-height: 34px;
  padding: 0 13px;
  border-radius: 999px;
  border: 1px solid #E8E8E8;
  background: #FFFDF9;
  color: #333333;
  font-size: 12px;
}
.compact-chip {
  min-height: 30px;
  padding: 0 11px;
  font-size: 11px;
}
.ghost-chip.active {
  border-color: transparent;
  background: var(--search-accent);
  color: #FFFFFF;
}
.tag-group + .tag-group {
  margin-top: 10px;
}
.filter-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

@media (max-width: 430px) {
  .search-head-top {
    gap: 8px;
  }

  .back-btn,
  .search-submit {
    padding: 0 10px;
  }

  .quick-style-row {
    flex: 1;
    width: auto;
  }

  .more-filter-btn {
    min-width: 100px;
  }

  .hot-keyword-grid {
    grid-template-columns: 1fr;
  }

  .result-list {
    max-height: calc(100vh - 160px);
  }
}
</style>
