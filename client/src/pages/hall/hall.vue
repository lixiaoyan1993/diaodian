<template>
  <view :class="['hall-page', 'dd-page', { 'map-mode': view === 'map', 'list-mode': view === 'list' }]">
    <view class="hall-topbar">
      <view class="hall-title-block">
        <text class="hall-meta">{{ hallMetaText }}</text>
      </view>
      <view class="top-actions">
        <view class="view-tabs" aria-label="视图切换">
          <button :class="['tab', { active: view === 'map' }]" @tap="view = 'map'">
            <text class="tab-icon map-icon" />
            <text class="tab-label">地图</text>
          </button>
          <button :class="['tab', { active: view === 'list' }]" @tap="view = 'list'">
            <text class="tab-icon list-icon" />
            <text class="tab-label">列表</text>
          </button>
        </view>
      </view>
    </view>

    <view class="filter-rail dd-card">
      <view class="filter-rail-head">
        <view class="filter-rail-copy">
          <text class="filter-rail-kicker">找点方式</text>
          <text class="filter-rail-title">先搜关键词，再用条件缩小范围</text>
        </view>
        <button
          :class="['filter-rail-action', { active: filtersOpen || activeFilterCount > 0 }]"
          @tap="openFilterSheet"
        >
          <text>{{ filterButtonText }}</text>
          <text class="filter-caret">更多筛选</text>
        </button>
      </view>

      <view class="hall-search">
        <text class="hall-search-icon">⌕</text>
        <button class="hall-search-trigger" @tap="openSearchPage">
          <text class="hall-search-placeholder">
            {{ selectedKeyword || '搜索标点、鱼种、标签' }}
          </text>
        </button>
        <button v-if="selectedKeyword" class="hall-search-clear" @tap="clearKeywordSearch">清除</button>
      </view>

      <scroll-view class="quick-actions quick-actions-top" scroll-x>
        <view class="quick-actions-inner">
          <button
            v-for="s in styles"
            :key="s"
            :class="['dd-chip', { 'dd-chip-active': filter === s }]"
            @tap="setStyleFilter(s)"
          ><text class="chip-label">{{ s }}</text></button>
          <button
            v-if="view === 'list'"
            class="dd-chip nearest-chip dd-chip-active"
            @tap="loadNearest"
          ><text class="chip-label">{{ locating ? '定位中' : '离我最近' }}</text></button>
          <button
            v-if="view === 'list' && sortMode === 'nearest'"
            class="dd-chip reset-chip"
            @tap="clearNearest"
          ><text class="chip-label">恢复默认</text></button>
        </view>
      </scroll-view>

      <view class="filter-summary-bar" :class="{ active: hasFilterSummary }">
        <text class="filter-summary-label">当前条件</text>
        <text class="filter-summary-text">{{ filterSummaryText }}</text>
        <button v-if="hasFilterSummary" class="filter-summary-clear" @tap="clearAllQuickFilters">清空</button>
      </view>

    </view>

    <view v-if="filtersOpen" class="filter-sheet-mask filter-sheet-page" @tap="closeFilterSheet">
      <view class="filter-sheet dd-card" @tap.stop>
        <view class="filter-sheet-head filter-sheet-head-page">
          <button class="filter-sheet-back" @tap="closeFilterSheet">‹</button>
          <text class="filter-sheet-title">筛选钓点</text>
          <button class="filter-sheet-close subtle" @tap="closeFilterSheet">关闭</button>
        </view>

        <view class="filter-search filter-search-page">
          <text class="filter-search-icon">⌕</text>
          <input
            class="filter-search-input"
            v-model="filterSearchKeyword"
            placeholder="搜索标点名称、鱼种或标签"
            confirm-type="search"
          />
          <button v-if="filterSearchKeyword" class="filter-search-clear" @tap="filterSearchKeyword = ''">清除</button>
        </view>

        <scroll-view v-if="selectedPreviewItems.length" class="selected-row selected-row-page" scroll-x>
          <view class="selected-inner">
            <button
              v-for="item in selectedPreviewItems"
              :key="item.key"
              class="selected-chip"
              @tap="removeSelectedPreview(item)"
            >{{ item.label }} ×</button>
          </view>
        </scroll-view>

        <view v-else class="selected-empty-row selected-empty-row-page">
          <text class="selected-empty">还没有选择细筛条件</text>
        </view>

        <scroll-view class="filter-sheet-body filter-sheet-body-page" scroll-y>
          <view v-if="filterSearchKeyword.trim()" class="filter-section">
            <view class="filter-section-head">
              <text class="filter-section-title">搜索结果</text>
              <text class="filter-section-meta">{{ draftSearchResults.length }} 项</text>
            </view>
            <view v-if="draftSearchResults.length" class="fish-grid search-grid">
              <button
                v-for="item in draftSearchResults"
                :key="item.key"
                :class="['fish-option', { active: item.active }]"
                @tap="toggleDraftResult(item)"
              >{{ item.label }}</button>
            </view>
            <text v-else class="fish-empty">没有找到匹配内容，可以换个关键词。</text>
          </view>

          <view v-else>
            <view class="filter-section">
              <view class="filter-section-head">
                <text class="filter-section-title">鱼种</text>
                <text class="filter-section-meta">可多选，最多 8 个</text>
              </view>
              <view
                v-for="group in fishGroups"
                :key="group.title"
                class="fish-group fish-group-card"
              >
                <view class="fish-group-head">
                  <text class="fish-group-title">{{ group.title }}</text>
                  <text class="fish-group-count">{{ group.items.length }} 个</text>
                </view>
                <view class="fish-grid">
                  <button
                    v-for="item in group.items"
                    :key="item"
                    :class="['fish-option', { active: draftSpecies.includes(item) }]"
                    @tap="toggleDraftSpecies(item)"
                  >{{ item }}</button>
                </view>
              </view>
            </view>

            <view class="filter-section">
              <view class="filter-section-head">
                <text class="filter-section-title">标签</text>
                <text class="filter-section-meta">停车、设施、风险都能筛</text>
              </view>
              <view
                v-for="group in tagGroups"
                :key="group.title"
                class="fish-group fish-group-card"
              >
                <view class="fish-group-head">
                  <text class="fish-group-title">{{ group.title }}</text>
                  <text class="fish-group-count">{{ group.items.length }} 个</text>
                </view>
                <view class="fish-grid">
                  <button
                    v-for="item in group.items"
                    :key="item"
                    :class="['fish-option', { active: draftTags.includes(item) }]"
                    @tap="toggleDraftTag(item)"
                  >{{ item }}</button>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>

        <view class="filter-sheet-actions filter-sheet-actions-page">
          <button class="filter-reset" @tap="resetDraftFilters">重置</button>
          <button class="filter-apply" @tap="applyFilters">
            {{ filterApplyText }}
          </button>
        </view>
      </view>
    </view>

    <view v-if="regionSheetOpen" class="filter-sheet-mask" @tap="closeRegionSheet">
      <view class="region-sheet dd-card" @tap.stop>
        <view class="filter-sheet-head">
          <text class="filter-sheet-title">选择城市</text>
          <button class="filter-sheet-close" @tap="closeRegionSheet">关闭</button>
        </view>

        <button class="region-locate-card" @tap="useLocatedRegion">
          <text class="region-locate-kicker">{{ locatedRegionText ? '当前位置' : '点击定位城市' }}</text>
          <text class="region-locate-main">{{ locatedRegionText || '暂未获取到定位城市' }}</text>
          <text class="region-locate-sub">点一下就按当前城市筛选</text>
        </button>

        <view class="city-select-row city-select-row-sheet">
          <picker class="city-picker" mode="selector" :range="provinceOptions" :value="selectedProvinceIndex" @change="onProvinceChange">
            <view class="city-picker-value">
              <text>{{ selectedProvinceLabel }}</text>
              <text class="city-picker-caret">省份</text>
            </view>
          </picker>
          <picker class="city-picker" mode="selector" :range="cityOptions" :value="selectedCityIndex" @change="onCityChange">
            <view class="city-picker-value">
              <text>{{ selectedCityLabel }}</text>
              <text class="city-picker-caret">城市</text>
            </view>
          </picker>
        </view>

        <view class="region-sheet-actions">
          <button class="filter-reset" @tap="clearRegionFilter">清空</button>
          <button class="filter-apply" @tap="confirmRegionFilter">按这个城市看</button>
        </view>
      </view>
    </view>

    <view v-show="view === 'map'" class="map-wrap" :style="mapViewportStyle">
      <view class="map-shell map-shell-full">
        <!-- #ifdef H5 -->
        <H5Amap
          class="map-surface"
          :latitude="mapCenter.lat"
          :longitude="mapCenter.lng"
          :markers="markers"
          :fit-markers="view === 'map'"
          :scale="14"
          :map-type="mapType"
          @markertap="onMarkerTap"
        />
        <!-- #endif -->
        <!-- #ifndef H5 -->
        <map
          id="hall-map"
          class="map-surface"
          :latitude="mapCenter.lat"
          :longitude="mapCenter.lng"
          :markers="markers"
          :include-points="mapIncludePoints"
          :scale="14"
          :map-type="mapType"
          :enable-satellite="mapType === 'satellite'"
          :show-location="mapShowLocation"
          :padding="mapPadding"
          @markertap="onMarkerTap"
        />
        <!-- #endif -->
      </view>
      <!-- #ifndef MP-WEIXIN -->
      <view v-if="selectedMapSpot" class="map-spot-card dd-card" :style="mapSpotCardStyle">
        <view class="map-spot-head">
          <view class="map-spot-copy">
            <text class="map-spot-style">{{ markerStyle(selectedMapSpot) }}</text>
            <text class="map-spot-title">{{ selectedMapSpot.name }}</text>
            <text class="map-spot-meta">
              {{ currentMapSpotDistanceText }}
              <text v-if="selectedMapSpot.district"> · {{ selectedMapSpot.district }}</text>
            </text>
          </view>
          <button class="map-spot-close" @tap="clearSelectedMapSpot">关闭</button>
        </view>
        <view class="map-spot-body">
          <text class="map-spot-fish">{{ shortSpecies(selectedMapSpot.species) }}</text>
          <text v-if="selectedMapSpot.tags?.length" class="map-spot-tags">
            {{ selectedMapSpot.tags.slice(0, 3).join(' · ') }}
          </text>
        </view>
        <view class="map-spot-actions">
          <button class="map-spot-btn map-spot-btn-secondary" @tap="addToPlan(selectedMapSpot)">计划</button>
          <button class="map-spot-btn map-spot-btn-secondary" :disabled="!hasSpotLocation(selectedMapSpot)" @tap="navigateToSpot(selectedMapSpot)">导航</button>
          <button class="map-spot-btn map-spot-btn-primary" @tap="goDetail(selectedMapSpot.id)">详情</button>
        </view>
      </view>
      <!-- #endif -->
      <!-- #ifdef MP-WEIXIN -->
      <cover-view v-if="selectedMapSpot" class="map-spot-card map-spot-card-cover" :style="mapSpotCardStyle">
        <cover-view class="map-spot-head">
          <cover-view class="map-spot-copy">
            <cover-view class="map-spot-style">{{ markerStyle(selectedMapSpot) }}</cover-view>
            <cover-view class="map-spot-title">{{ selectedMapSpot.name }}</cover-view>
            <cover-view class="map-spot-meta">{{ currentMapSpotDistanceText }}{{ selectedMapSpot.district ? ' · ' + selectedMapSpot.district : '' }}</cover-view>
          </cover-view>
          <cover-view class="map-spot-close" @tap="clearSelectedMapSpot">关闭</cover-view>
        </cover-view>
        <cover-view class="map-spot-body">
          <cover-view class="map-spot-fish">{{ shortSpecies(selectedMapSpot.species) }}</cover-view>
          <cover-view v-if="selectedMapSpot.tags?.length" class="map-spot-tags">
            {{ selectedMapSpot.tags.slice(0, 3).join(' · ') }}
          </cover-view>
        </cover-view>
        <cover-view class="map-spot-actions">
          <cover-view class="map-spot-btn map-spot-btn-secondary" @tap="addToPlan(selectedMapSpot)">计划</cover-view>
          <cover-view :class="['map-spot-btn', 'map-spot-btn-secondary', { disabled: !hasSpotLocation(selectedMapSpot) }]" @tap="hasSpotLocation(selectedMapSpot) && navigateToSpot(selectedMapSpot)">导航</cover-view>
          <cover-view class="map-spot-btn map-spot-btn-primary" @tap="goDetail(selectedMapSpot.id)">详情</cover-view>
        </cover-view>
      </cover-view>
      <cover-view class="map-toolbar">
        <cover-view class="map-locate-btn map-cover-btn" @tap="centerToMyLocation">
          <cover-view class="map-locate-icon">◎</cover-view>
          <cover-view class="map-locate-text">{{ locatingSelf ? '定位中' : '定位' }}</cover-view>
        </cover-view>
        <cover-view class="map-type-switch">
          <cover-view
            v-for="item in mapTypeOptions"
            :key="item.value"
            :class="['map-type-btn', 'map-cover-btn', { active: mapType === item.value }]"
            @tap="switchMapType(item.value)"
          >{{ item.label }}</cover-view>
        </cover-view>
      </cover-view>
      <cover-view class="map-limit-note">地图最多展示 200 个标点，查看更多请切换到列表</cover-view>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <view class="map-toolbar">
        <button class="map-locate-btn" :disabled="locatingSelf" @tap="centerToMyLocation">
          <text class="map-locate-icon">◎</text>
          <text class="map-locate-text">{{ locatingSelf ? '定位中' : '定位' }}</text>
        </button>
        <view class="map-type-switch">
          <button
            v-for="item in mapTypeOptions"
            :key="item.value"
            :class="['map-type-btn', { active: mapType === item.value }]"
            @tap="switchMapType(item.value)"
          >{{ item.label }}</button>
        </view>
      </view>
      <view class="map-limit-note">地图最多展示 200 个标点，查看更多请切换到列表</view>
      <!-- #endif -->
    </view>

    <scroll-view v-show="view === 'list'" class="list-wrap" :style="listWrapStyle" scroll-y @scrolltolower="loadMore">
      <view v-if="trip.items.length" class="trip-strip dd-card">
        <view class="trip-strip-main">
          <text class="trip-strip-title">出行计划</text>
          <text class="trip-strip-meta">{{ trip.items.length }} 个点{{ trip.distanceText ? ' · ' + trip.distanceText : '' }}</text>
        </view>
        <button class="trip-strip-btn" @tap="goTrip"><text class="btn-label">查看计划</text></button>
      </view>
      <SpotCard
        v-for="(s, index) in spots"
        :key="s.id"
        :spot="s"
        :index="index"
        @select="goDetail"
        @plan="addToPlan"
      />
      <view v-if="spots.length === 0 && !loading" class="dd-empty dd-card">
        <text>暂时没有匹配标点。换个钓法或鱼种筛选，或者先记录自己的第一个点。</text>
      </view>
      <view v-if="loading && spots.length === 0" class="loading">加载中...</view>
      <view v-else-if="loadingMore" class="loading">加载更多中...</view>
      <view v-else-if="spots.length > 0 && !hasMore" class="loading">没有更多了</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { onPullDownRefresh, onShareAppMessage, onShow } from '@dcloudio/uni-app';
import { spotApi, type SpotItem, type SpotRegionItem } from '@/api/spots';
import { useTripStore } from '@/stores/trip';
import { useAuthStore } from '@/stores/auth';
import SpotCard from '@/components/SpotCard.vue';
import { allFishOptions, fishOptionsByStyle } from '@/utils/fish';
import { standardTagGroups, standardTags, tagSynonyms } from '@/utils/fish';
import { shareCopy, sharePath } from '@/utils/fish';
import { buildStandardRegionOptions, normalizeRegionSelection } from '@/utils/china-regions';
import {
  HALL_SEARCH_APPLY_STORAGE_KEY,
  HALL_SEARCH_DRAFT_STORAGE_KEY,
  type HallSearchState,
} from '@/utils/hall-search';
// #ifdef H5
import H5Amap from '@/components/H5Amap.vue';
// #endif

const view = ref<'map' | 'list'>('map');
const filter = ref('全部');
const searchKeyword = ref('');
const styles = ['全部', '路亚', '台钓'];
const selectedSpecies = ref<string[]>([]);
const selectedTags = ref<string[]>([]);
const selectedKeyword = ref('');
const draftSpecies = ref<string[]>([]);
const draftTags = ref<string[]>([]);
const selectedProvince = ref('');
const selectedCity = ref('');
const regionSource = ref<'none' | 'auto' | 'manual'>('none');
const regionOptions = ref<SpotRegionItem[]>([]);
const regionSheetOpen = ref(false);
const locatedProvince = ref('');
const locatedCity = ref('');
const filterSearchKeyword = ref('');
const filtersOpen = ref(false);
const spots = ref<SpotItem[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const locating = ref(false);
const trip = useTripStore();
const auth = useAuthStore();
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const nationalSpotTotal = ref(0);
const currentProvinceSpotTotal = ref(0);
const tiananmenLocation = { lat: 39.9087, lng: 116.3975 };
const mapCenter = ref({ ...tiananmenLocation });
const userLocation = ref<{ lat: number; lng: number } | null>(null);
const mapShowLocation = ref(false);
const sortMode = ref<'default' | 'nearest'>('default');
const mapType = ref<'standard' | 'satellite'>('standard');
const mapTypeOptions = [
  { label: '普通', value: 'standard' as const },
  { label: '卫星', value: 'satellite' as const },
];
const selectedMapSpotId = ref<number | null>(null);
const locatingSelf = ref(false);
const nearestRadiusKm = 10;
const nearbyRadiusKm = 10;
const nearbyCount = ref<number | null>(null);
const nearbyLoading = ref(false);
const viewportHeight = ref(0);
const viewportWidth = ref(0);
const bottomInset = ref(0);
const mapTopOffset = ref(0);
const isMpWeixin = process.env.UNI_PLATFORM === 'mp-weixin';
const locationPromptShown = ref(false);
const LAST_LOCATION_STORAGE_KEY = 'hall:last-location';
const hallReady = ref(false);
const bootstrappingLocation = ref(false);

const compactLayout = computed(() => viewportWidth.value > 0 && viewportWidth.value <= 430);
const mapViewportStyle = computed(() => {
  if (!viewportHeight.value) return '';
  if (isMpWeixin && mapTopOffset.value > 0) {
    const nextHeight = Math.max(320, viewportHeight.value - mapTopOffset.value);
    return `height:${nextHeight}px;min-height:${nextHeight}px;`;
  }
  const reserveTop = view.value === 'map'
    ? (compactLayout.value ? 154 : 142)
    : (compactLayout.value ? 206 : 190);
  const bottomDock = bottomInset.value + 16;
  const nextHeight = Math.max(420, viewportHeight.value - reserveTop - bottomDock);
  return `height:${nextHeight}px;min-height:${nextHeight}px;`;
});
const listWrapStyle = computed(() => {
  if (!viewportHeight.value) return '';
  const reserveTop = compactLayout.value ? 196 : 174;
  const dockSpace = bottomInset.value + 12;
  const minHeight = compactLayout.value ? 360 : 420;
  const nextHeight = Math.max(minHeight, viewportHeight.value - reserveTop - dockSpace);
  return `max-height:${nextHeight}px;`;
});

const markers = computed(() =>
  spots.value.map(s => ({
    id: s.id,
    latitude: Number(s.latitude || mapCenter.value.lat),
    longitude: Number(s.longitude || mapCenter.value.lng),
    title: shortSpotTitle(s.name),
    subtitle: markerSubtitle(s),
    style: markerStyle(s),
    iconPath: s.style === '台钓' ? '/static/marker-bait.png' : ((s.style || '').includes(',') || s.style === '都可') ? '/static/marker-both.png' : '/static/marker-lure.png',
    width: 32,
    height: 40,
    callout: {
      content: `${shortSpotTitle(s.name)} · ${markerSubtitle(s)}`,
      display: 'BYCLICK',
      padding: 5,
      borderRadius: 8,
      bgColor: '#FFFFFF',
      color: '#16324F',
      fontSize: 11,
      textAlign: 'center',
    },
  }))
);
const mapIncludePoints = computed(() => (
  view.value !== 'map'
    ? []
    : markers.value
      .filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
      .map(item => ({
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
      }))
));

function shortSpecies(value?: string) {
  const items = (value || '')
    .split(/[、,，/ ]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 2);
  return items.join('、') || '未填鱼种';
}

function markerStyle(spot: SpotItem) {
  const styleList = (spot.style || '').split(',').map(s => s.trim()).filter(Boolean);
  if (styleList.length >= 2 || spot.style === '都可') return '路亚+台钓';
  if (spot.style === '台钓') return '台钓';
  return '路亚';
}

function shortSpotTitle(value?: string) {
  const text = String(value || '').trim();
  if (!text) return '标点';
  return text.length > 10 ? `${text.slice(0, 10)}...` : text;
}

function markerSubtitle(spot: SpotItem) {
  return markerStyle(spot);
}

const activeFilterCount = computed(() => {
  let count = 0;
  if (selectedProvince.value) count += 1;
  if (selectedCity.value) count += 1;
  if (selectedSpecies.value.length) count += selectedSpecies.value.length;
  if (selectedTags.value.length) count += selectedTags.value.length;
  if (selectedKeyword.value) count += 1;
  return count;
});
const filterSummaryText = computed(() => {
  const parts = [];
  if (selectedCity.value) {
    parts.push(selectedCity.value);
  } else if (selectedProvince.value) {
    parts.push(selectedProvince.value);
  } else if (locatedCity.value) {
    parts.push(locatedCity.value);
  }
  if (filter.value !== '全部') parts.push(filter.value);
  if (view.value === 'list' && sortMode.value === 'nearest') parts.push('离我最近');
  if (selectedKeyword.value) parts.push(`搜索：${selectedKeyword.value}`);
  if (activeFilterCount.value > 0) parts.push(`已筛 ${activeFilterCount.value} 项`);
  return parts.length ? parts.join(' · ') : '全国范围 · 不限钓法 · 暂未细筛';
});
const hasFilterSummary = computed(() => (
  filter.value !== '全部'
  || Boolean(selectedProvince.value)
  || Boolean(selectedCity.value)
  || Boolean(selectedKeyword.value)
  || selectedSpecies.value.length > 0
  || selectedTags.value.length > 0
  || (view.value === 'list' && sortMode.value === 'nearest')
));
const hasMore = computed(() => spots.value.length < total.value);

const nearbySummaryValue = computed(() => {
  if (nearbyLoading.value) return '···';
  if (!userLocation.value) return '···';
  if (nearbyCount.value == null) return '--';
  return `${nearbyCount.value} 个`;
});

const nearbySummaryMeta = computed(() => (
  userLocation.value
    ? `${nearbyRadiusKm} km`
    : `${nearbyRadiusKm} km`
));
const mapSummaryKicker = computed(() => {
  if (selectedCity.value) return '当前城市';
  if (selectedProvince.value) return '当前省份';
  return '地图标点';
});
const mapSummaryValue = computed(() => `${spots.value.length} 个`);
const mapSummaryMeta = computed(() => {
  if (selectedCity.value) return selectedCity.value;
  if (selectedProvince.value) return selectedProvince.value;
  if (locatedCity.value) return locatedCity.value;
  if (locatedProvince.value) return locatedProvince.value;
  return '';
});
function mapOverlayBottom(extra: number) {
  if (isMpWeixin) return `${bottomInset.value + extra}px`;
  return `calc(var(--hall-tabbar-space, 88px) + env(safe-area-inset-bottom) + ${extra}px)`;
}

const mapPadding = computed(() => ({ bottom: 220 + bottomInset.value }));
const mapSpotCardStyle = computed(() => ({
  bottom: mapOverlayBottom(compactLayout.value ? 16 : 20),
}));
const selectedMapSpot = computed(() => (
  spots.value.find(item => item.id === selectedMapSpotId.value) || null
));
const currentMapSpotDistanceText = computed(() => {
  const spot = selectedMapSpot.value;
  if (!spot) return '地图选中';
  if (spot.distance !== undefined) return formatDistance(spot.distance);
  if (userLocation.value && hasSpotLocation(spot)) {
    return formatDistance(calcDistanceMeters(
      userLocation.value.lat,
      userLocation.value.lng,
      Number(spot.latitude),
      Number(spot.longitude),
    ));
  }
  return '地图选中';
});

const filterButtonText = computed(() => (
  activeFilterCount.value ? `筛选 ${activeFilterCount.value}` : '筛选'
));
const locatedRegionText = computed(() => [locatedProvince.value, locatedCity.value].filter(Boolean).join(' · '));
const summaryProvinceLabel = computed(() => selectedProvince.value || locatedProvince.value || '');
const hallMetaText = computed(() => {
  const totalText = nationalSpotTotal.value > 0 ? `全国 ${nationalSpotTotal.value} 个` : `${spots.length} 个公开点`;
  if (!summaryProvinceLabel.value) return totalText;
  return `${totalText} · ${summaryProvinceLabel.value} ${currentProvinceSpotTotal.value} 个`;
});
const selectedRegionText = computed(() => {
  if (selectedProvince.value && selectedCity.value) return `${selectedProvince.value} · ${selectedCity.value}`;
  if (selectedProvince.value) return selectedProvince.value;
  if (selectedCity.value) return selectedCity.value;
  return '全国范围';
});
const provinceOptions = computed(() => ['全部省份', ...regionOptions.value.map(item => item.province)]);
const selectedProvinceIndex = computed(() => {
  if (!selectedProvince.value) return 0;
  const index = provinceOptions.value.indexOf(selectedProvince.value);
  return index >= 0 ? index : 0;
});
const selectedProvinceLabel = computed(() => selectedProvince.value || '全部省份');
const availableCities = computed(() => {
  const matched = regionOptions.value.find(item => item.province === selectedProvince.value);
  return matched?.cities || [];
});
const cityOptions = computed(() => ['全部城市', ...availableCities.value]);
const selectedCityIndex = computed(() => {
  if (!selectedCity.value) return 0;
  const index = cityOptions.value.indexOf(selectedCity.value);
  return index >= 0 ? index : 0;
});
const selectedCityLabel = computed(() => selectedCity.value || '全部城市');

const popularFishOptions = ['翘嘴', '鳜鱼', '鲈鱼', '黑鱼', '鲫鱼', '鲤鱼', '草鱼', '鲢鳙'];
const fishGroups = computed(() => {
  const groups = [];
  const styleMatched = filter.value !== '全部' ? fishOptionsByStyle[filter.value] : [];
  if (styleMatched?.length) {
    groups.push({ title: `${filter.value}常见`, items: styleMatched });
  } else {
    groups.push({ title: '常用鱼种', items: popularFishOptions });
  }

  groups.push(
    { title: '路亚常见', items: fishOptionsByStyle['路亚'] || [] },
    { title: '台钓常见', items: fishOptionsByStyle['台钓'] || [] },
  );

  const seen = new Set<string>();
  return groups
    .map(group => ({
      title: group.title,
      items: group.items.filter((fish) => {
        if (seen.has(`${group.title}-${fish}`)) return false;
        seen.add(`${group.title}-${fish}`);
        return true;
      }),
    }))
    .filter(group => group.items.length);
});

const tagGroups = computed(() => standardTagGroups);
const selectedPreviewItems = computed(() => {
  const items: Array<{ key: string; type: 'province' | 'city' | 'species' | 'tag'; label: string }> = [];
  if (selectedProvince.value) {
    items.push({ key: `province:${selectedProvince.value}`, type: 'province', label: selectedProvince.value });
  }
  if (selectedCity.value) {
    items.push({ key: `city:${selectedCity.value}`, type: 'city', label: selectedCity.value });
  }
  selectedSpecies.value.forEach(item => {
    items.push({ key: `species:${item}`, type: 'species', label: item });
  });
  selectedTags.value.forEach(item => {
    items.push({ key: `tag:${item}`, type: 'tag', label: item });
  });
  return items;
});
const draftSearchResults = computed(() => {
  const keyword = filterSearchKeyword.value.trim();
  if (!keyword) return [] as Array<{ key: string; label: string; kind: 'species' | 'tag'; active: boolean }>;
  const fishMatched = allFishOptions
    .filter(item => item.includes(keyword) || keyword.includes(item))
    .map(item => ({
      key: `species:${item}`,
      label: item,
      kind: 'species' as const,
      active: draftSpecies.value.includes(item),
    }));
  const tagMatched = standardTags
    .filter((item) => {
      if (item.includes(keyword) || keyword.includes(item)) return true;
      const words = tagSynonyms[item] || [];
      return words.some(word => word.includes(keyword) || keyword.includes(word));
    })
    .map(item => ({
      key: `tag:${item}`,
      label: item,
      kind: 'tag' as const,
      active: draftTags.value.includes(item),
    }));
  return [...fishMatched, ...tagMatched].slice(0, 24);
});
const draftFilterCount = computed(() => {
  let count = 0;
  count += draftSpecies.value.length;
  count += draftTags.value.length;
  return count;
});
const filterApplyText = computed(() => (
  draftFilterCount.value ? `确认筛选（${draftFilterCount.value}）` : '确认筛选'
));

function toggleDraftSpecies(item: string) {
  const value = item.trim();
  if (!value) return;
  draftSpecies.value = draftSpecies.value.includes(value)
    ? draftSpecies.value.filter(entry => entry !== value)
    : [...draftSpecies.value, value].slice(0, 8);
}

function toggleDraftTag(item: string) {
  const value = item.trim();
  if (!value) return;
  draftTags.value = draftTags.value.includes(value)
    ? draftTags.value.filter(entry => entry !== value)
    : [...draftTags.value, value].slice(0, 8);
}

function toggleDraftResult(item: { kind: 'species' | 'tag'; label: string }) {
  if (item.kind === 'species') {
    toggleDraftSpecies(item.label);
    return;
  }
  toggleDraftTag(item.label);
}

function setDraftFiltersFromCurrent() {
  draftSpecies.value = [...selectedSpecies.value];
  draftTags.value = [...selectedTags.value];
}

function setStyleFilter(style: string) {
  filter.value = style;
  loadSpots();
}

function submitKeywordSearch() {
  selectedKeyword.value = searchKeyword.value.trim();
  loadSpots();
}

function clearKeywordSearch() {
  searchKeyword.value = '';
  selectedKeyword.value = '';
  loadSpots();
}

function clearAllQuickFilters() {
  filter.value = '全部';
  searchKeyword.value = '';
  selectedKeyword.value = '';
  selectedSpecies.value = [];
  selectedTags.value = [];
  if (regionSource.value === 'manual') {
    selectedProvince.value = '';
    selectedCity.value = '';
    regionSource.value = locatedProvince.value || locatedCity.value ? 'auto' : 'none';
  }
  if (view.value === 'list' && userLocation.value && regionSource.value !== 'manual') {
    sortMode.value = 'nearest';
  } else {
    sortMode.value = 'default';
  }
  loadSpots();
}

function writeSearchDraft(keywordOverride = '') {
  const payload: HallSearchState = {
    keyword: keywordOverride || selectedKeyword.value || searchKeyword.value,
    style: filter.value,
    species: [...selectedSpecies.value],
    tags: [...selectedTags.value],
    province: selectedProvince.value,
    city: selectedCity.value,
  };
  uni.setStorageSync(HALL_SEARCH_DRAFT_STORAGE_KEY, payload);
}

function openSearchPage(keywordOverride = '') {
  writeSearchDraft(keywordOverride);
  uni.navigateTo({ url: '/pages/search-spots/search-spots' });
}

function applySearchState(payload: HallSearchState) {
  filter.value = payload.style || '全部';
  selectedSpecies.value = Array.isArray(payload.species) ? payload.species.map(String).filter(Boolean) : [];
  selectedTags.value = Array.isArray(payload.tags) ? payload.tags.map(String).filter(Boolean) : [];
  const region = normalizeRegionSelection({
    province: payload.province,
    city: payload.city,
  });
  selectedProvince.value = region.province;
  selectedCity.value = region.city;
  selectedKeyword.value = String(payload.keyword || '').trim();
  searchKeyword.value = selectedKeyword.value;
  regionSource.value = selectedProvince.value || selectedCity.value ? 'manual' : regionSource.value;
  view.value = 'list';
  sortMode.value = selectedProvince.value || selectedCity.value ? 'default' : sortMode.value;
  loadSpots();
}

function consumeSearchApplyState() {
  try {
    const payload = uni.getStorageSync(HALL_SEARCH_APPLY_STORAGE_KEY) as HallSearchState | '';
    if (!payload || typeof payload !== 'object') return;
    uni.removeStorageSync(HALL_SEARCH_APPLY_STORAGE_KEY);
    applySearchState(payload);
  } catch {
    // ignore storage failure
  }
}

function buildListParams(pageValue: number) {
  const params: Record<string, string> = {
    publicOnly: 'true',
    page: String(pageValue),
    pageSize: String(view.value === 'map' ? 200 : pageSize),
  };
  if (filter.value !== '全部') params.style = filter.value;
  if (selectedSpecies.value.length) params.species = selectedSpecies.value.join(',');
  if (selectedTags.value.length) params.tag = selectedTags.value.join(',');
  if (selectedKeyword.value) params.keyword = selectedKeyword.value;

  const useNearest = view.value === 'list'
    && sortMode.value === 'nearest'
    && userLocation.value
    && regionSource.value !== 'manual';

  if (useNearest) {
    params.sort = 'nearest';
    params.lat = String(userLocation.value.lat);
    params.lng = String(userLocation.value.lng);
    params.radius = String(nearestRadiusKm);
  } else {
    if (selectedProvince.value) params.province = selectedProvince.value;
    if (selectedCity.value) params.city = selectedCity.value;
  }
  return params;
}

async function loadNearbySummary(location: { lat: number; lng: number }) {
  nearbyLoading.value = true;
  try {
    const res = await spotApi.nearby(location.lat, location.lng, nearbyRadiusKm);
    nearbyCount.value = res.data?.length ?? 0;
  } catch {
    nearbyCount.value = null;
  } finally {
    nearbyLoading.value = false;
  }
}

async function loadSpots() {
  if (loading.value) return;
  loading.value = true;
  try {
    const res = await spotApi.list(buildListParams(1));
    if (res.data) {
      spots.value = res.data.items;
      total.value = res.data.total || 0;
      page.value = 1;
      if (!spots.value.some(item => item.id === selectedMapSpotId.value)) {
        selectedMapSpotId.value = null;
      }
      if (sortMode.value === 'nearest' && userLocation.value) {
        mapCenter.value = userLocation.value;
      }
    }
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
      spots.value.push(...res.data.items);
      total.value = res.data.total || total.value;
      page.value = nextPage;
    }
  } finally {
    loadingMore.value = false;
  }
}

async function loadRegions() {
  try {
    const res = await spotApi.regions();
    const items = buildStandardRegionOptions((res.data?.items || [])
      .map(item => ({
        province: String(item.province || '').trim(),
        cities: Array.from(new Set((item.cities || []).map(city => String(city || '').trim()).filter(Boolean))),
      }))
      .filter(item => item.province));
    if (items.length) {
      regionOptions.value = items;
      return;
    }
  } catch {
    // fallback below
  }

  try {
    const fallback = await spotApi.list({
      publicOnly: 'true',
      page: '1',
      pageSize: '200',
    });
    const regionMap = new Map<string, Set<string>>();
    (fallback.data?.items || []).forEach((spot) => {
      const province = String(spot.province || '').trim();
      const city = String(spot.city || '').trim();
      if (!province) return;
      if (!regionMap.has(province)) {
        regionMap.set(province, new Set<string>());
      }
      if (city) {
        regionMap.get(province)!.add(city);
      }
    });
    regionOptions.value = buildStandardRegionOptions(Array.from(regionMap.entries())
      .map(([province, cities]) => ({
        province,
        cities: Array.from(cities).sort((a, b) => a.localeCompare(b, 'zh-CN')),
      }))
      .sort((a, b) => a.province.localeCompare(b.province, 'zh-CN')));
  } catch {
    regionOptions.value = buildStandardRegionOptions();
  }
}

async function loadSpotSummary() {
  try {
    const res = await spotApi.summary({
      publicOnly: 'true',
      province: summaryProvinceLabel.value,
    });
    nationalSpotTotal.value = Number(res.data?.total || 0);
    currentProvinceSpotTotal.value = Number(res.data?.provinceTotal || 0);
  } catch {
    // keep silent, fallback text still works
  }
}

function fillRegionFromLocation(info: { province?: string; city?: string }) {
  const province = String(info.province || '').trim();
  const city = String(info.city || '').trim();
  locatedProvince.value = province;
  locatedCity.value = city;
}

function applyLocatedRegionAsDefault(info: { province?: string; city?: string }) {
  const region = normalizeRegionSelection(info);
  fillRegionFromLocation(region);
  selectedProvince.value = region.province;
  selectedCity.value = region.city;
  regionSource.value = selectedProvince.value || selectedCity.value ? 'auto' : 'none';
  sortMode.value = 'default';
}

function extractRegionFromAmap(data: any) {
  const regeocode = data?.regeocode;
  const component = regeocode?.addressComponent || {};
  const province = String(component.province || '').trim();
  const cityText = Array.isArray(component.city) ? '' : String(component.city || '').trim();
  return {
    province,
    city: cityText || province,
  };
}

function reverseGeocodeLocation(location: { lat: number; lng: number }) {
  return new Promise<{ province: string; city: string }>((resolve, reject) => {
    uni.request({
      url: 'https://restapi.amap.com/v3/geocode/regeo',
      method: 'GET',
      data: {
        key: import.meta.env.VITE_AMAP_WEB_KEY || '',
        location: `${location.lng},${location.lat}`,
        extensions: 'base',
      },
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const region = extractRegionFromAmap(res.data);
        if (!region.province && !region.city) {
          reject(new Error('empty region'));
          return;
        }
        resolve(region);
      },
      fail: (error) => {
        reject(error);
      },
    });
  });
}

function readCachedLocation() {
  try {
    const saved = uni.getStorageSync(LAST_LOCATION_STORAGE_KEY) as { lat?: number; lng?: number } | '';
    const lat = Number((saved as any)?.lat);
    const lng = Number((saved as any)?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  } catch {
    // ignore cache read failure
  }
  return null;
}

function persistLocation(location: { lat: number; lng: number }) {
  try {
    uni.setStorageSync(LAST_LOCATION_STORAGE_KEY, location);
  } catch {
    // ignore cache write failure
  }
}

function openFilterSheet() {
  setDraftFiltersFromCurrent();
  filterSearchKeyword.value = '';
  filtersOpen.value = true;
}

function openRegionSheet() {
  regionSheetOpen.value = true;
  if (!locatedCity.value && userLocation.value) {
    reverseGeocodeLocation(userLocation.value)
      .then(fillRegionFromLocation)
      .catch(() => {
        // keep silent, user can still select manually
      });
  }
}

function closeFilterSheet() {
  filtersOpen.value = false;
  filterSearchKeyword.value = '';
}

function closeRegionSheet() {
  regionSheetOpen.value = false;
}

function resetDraftFilters() {
  draftSpecies.value = [];
  draftTags.value = [];
  filterSearchKeyword.value = '';
}

function applyFilters() {
  selectedKeyword.value = filterSearchKeyword.value.trim();
  selectedSpecies.value = [...draftSpecies.value];
  selectedTags.value = [...draftTags.value];
  closeFilterSheet();
  loadSpots();
}

function onProvinceChange(event: any) {
  const nextIndex = Number(event?.detail?.value ?? 0);
  const nextProvince = provinceOptions.value[nextIndex] || '';
  selectedProvince.value = nextProvince === '全部省份' ? '' : nextProvince;
  if (!selectedProvince.value || !availableCities.value.includes(selectedCity.value)) {
    selectedCity.value = '';
  }
  regionSource.value = selectedProvince.value || selectedCity.value ? 'manual' : 'none';
  sortMode.value = selectedProvince.value || selectedCity.value ? 'default' : (userLocation.value ? 'nearest' : 'default');
  loadSpots();
}

function onCityChange(event: any) {
  const nextIndex = Number(event?.detail?.value ?? 0);
  const nextCity = cityOptions.value[nextIndex] || '';
  selectedCity.value = nextCity === '全部城市' ? '' : nextCity;
  regionSource.value = selectedProvince.value || selectedCity.value ? 'manual' : 'none';
  sortMode.value = selectedProvince.value || selectedCity.value ? 'default' : (userLocation.value ? 'nearest' : 'default');
  loadSpots();
}

function clearRegionFilter() {
  selectedProvince.value = '';
  selectedCity.value = '';
  regionSource.value = 'none';
  sortMode.value = userLocation.value ? 'nearest' : 'default';
  closeRegionSheet();
  loadSpots();
}

function confirmRegionFilter() {
  regionSource.value = selectedProvince.value || selectedCity.value ? 'manual' : 'none';
  sortMode.value = selectedProvince.value || selectedCity.value ? 'default' : (userLocation.value ? 'nearest' : 'default');
  closeRegionSheet();
  loadSpots();
}

function useLocatedRegion() {
  if (!userLocation.value) {
    uni.showToast({ title: '先获取当前位置', icon: 'none' });
    return;
  }
  if (locatedProvince.value || locatedCity.value) {
    selectedProvince.value = locatedProvince.value;
    selectedCity.value = locatedCity.value;
    regionSource.value = selectedProvince.value || selectedCity.value ? 'manual' : 'none';
    confirmRegionFilter();
    return;
  }
  reverseGeocodeLocation(userLocation.value)
    .then((region) => {
      fillRegionFromLocation(region);
      selectedProvince.value = region.province;
      selectedCity.value = region.city;
      regionSource.value = selectedProvince.value || selectedCity.value ? 'manual' : 'none';
      confirmRegionFilter();
    })
    .catch(() => {
      uni.showToast({ title: '定位城市失败，请手动选择', icon: 'none' });
    });
}

function removeSelectedPreview(item: { type: 'province' | 'city' | 'species' | 'tag'; label: string }) {
  if (item.type === 'province') {
    selectedProvince.value = '';
    selectedCity.value = '';
  } else if (item.type === 'city') {
    selectedCity.value = '';
  } else if (item.type === 'species') {
    selectedSpecies.value = selectedSpecies.value.filter(value => value !== item.label);
    draftSpecies.value = draftSpecies.value.filter(value => value !== item.label);
  } else if (item.type === 'tag') {
    selectedTags.value = selectedTags.value.filter(value => value !== item.label);
    draftTags.value = draftTags.value.filter(value => value !== item.label);
  }
  regionSource.value = selectedProvince.value || selectedCity.value ? 'manual' : 'none';
  if (!selectedProvince.value && !selectedCity.value && sortMode.value === 'default' && userLocation.value) {
    sortMode.value = 'nearest';
  }
  loadSpots();
}

function loadNearest() {
  if (locating.value) return;
  locating.value = true;
  uni.getLocation({
    type: 'gcj02',
    success: (res) => {
      userLocation.value = { lat: res.latitude, lng: res.longitude };
      mapShowLocation.value = true;
      loadNearbySummary(userLocation.value);
      reverseGeocodeLocation(userLocation.value)
        .then(fillRegionFromLocation)
        .catch(() => {
          // ignore reverse geocode failure here
        });
      sortMode.value = 'nearest';
      view.value = 'list';
      loadSpots();
    },
    fail: () => {
      uni.showToast({ title: '定位失败，请开启定位权限', icon: 'none' });
    },
    complete: () => {
      locating.value = false;
    },
  });
}

function clearNearest() {
  if (userLocation.value) {
    sortMode.value = 'nearest';
    mapCenter.value = { ...userLocation.value };
    loadSpots();
    uni.showToast({ title: '大厅默认按离你最近展示', icon: 'none' });
    return;
  }
  sortMode.value = 'default';
  mapCenter.value = { ...tiananmenLocation };
  loadSpots();
}

function syncViewportMetrics() {
  const info = typeof uni.getWindowInfo === 'function'
    ? uni.getWindowInfo()
    : uni.getSystemInfoSync();
  viewportHeight.value = Number(info.windowHeight || 0);
  viewportWidth.value = Number(info.windowWidth || 0);
  bottomInset.value = Number(
    info.safeAreaInsets?.bottom
      || ((info.screenHeight && info.safeArea?.bottom)
        ? Math.max(0, Number(info.screenHeight) - Number(info.safeArea.bottom))
        : 0),
  );
}

function syncMapViewport() {
  if (!isMpWeixin || view.value !== 'map') return;
  nextTick(() => {
    const query = uni.createSelectorQuery();
    query.select('.map-wrap').boundingClientRect();
    query.exec((res) => {
      const rect = res?.[0];
      if (!rect) return;
      mapTopOffset.value = Math.max(0, Number(rect.top || 0));
    });
  });
}

function centerToMyLocation() {
  if (locatingSelf.value) return;
  locatingSelf.value = true;
  resolveCurrentLocation({
    silent: true,
    onSuccess: (location) => {
      userLocation.value = location;
      mapShowLocation.value = true;
      loadNearbySummary(location);
      reverseGeocodeLocation(location)
        .then(fillRegionFromLocation)
        .catch(() => {
          // ignore reverse geocode failure here
        });
      mapCenter.value = { ...location };
      view.value = 'map';
      uni.showToast({ title: '已回到你的位置', icon: 'none' });
    },
    onFail: () => {
      mapCenter.value = { ...tiananmenLocation };
      uni.showToast({ title: '定位失败，请开启定位权限', icon: 'none' });
    },
    onComplete: () => {
      locatingSelf.value = false;
    },
  });
}

function resolveCurrentLocation(options: {
  silent?: boolean;
  onSuccess?: (location: { lat: number; lng: number }) => void;
  onFail?: () => void;
  onComplete?: () => void;
} = {}) {
  uni.getLocation({
    type: 'gcj02',
    success: (res) => {
      const location = { lat: res.latitude, lng: res.longitude };
      persistLocation(location);
      mapShowLocation.value = true;
      options.onSuccess?.(location);
    },
    fail: () => {
      if (!options.silent) {
        uni.showToast({ title: '定位失败，请开启定位权限', icon: 'none' });
      }
      options.onFail?.();
    },
    complete: () => {
      options.onComplete?.();
    },
  });
}

function promptEnableLocation() {
  if (locationPromptShown.value) {
    uni.showToast({ title: '未开启定位，当前先按最新展示', icon: 'none' });
    return;
  }
  locationPromptShown.value = true;
  uni.showModal({
    title: '开启定位后可按离你最近排序',
    content: '当前没有拿到你的定位，所以大厅先回退成默认排序，可能会先看到宁夏等外地标点。',
    confirmText: '去开启',
    cancelText: '先这样',
    success: (res) => {
      if (!res.confirm) {
        uni.showToast({ title: '未开启定位，当前先按最新展示', icon: 'none' });
        return;
      }
      uni.openSetting({
        success: () => {
          locationPromptShown.value = false;
          initMapCenter();
        },
        fail: () => {
          uni.showToast({ title: '无法打开权限设置', icon: 'none' });
        },
      });
    },
  });
}

function initMapCenter() {
  if (bootstrappingLocation.value) return;
  bootstrappingLocation.value = true;
  const cachedLocation = readCachedLocation();
  if (cachedLocation) {
    userLocation.value = cachedLocation;
    mapCenter.value = { ...cachedLocation };
    loadNearbySummary(cachedLocation);
  }
  resolveCurrentLocation({
    silent: true,
    onSuccess: (location) => {
      userLocation.value = location;
      locationPromptShown.value = false;
      loadNearbySummary(location);
      reverseGeocodeLocation(location)
        .then((region) => {
          applyLocatedRegionAsDefault(region);
        })
        .catch(() => {
          selectedProvince.value = '';
          selectedCity.value = '';
          sortMode.value = 'default';
        })
        .finally(() => {
          if (!hallReady.value) {
            loadSpots();
          } else if (!cachedLocation) {
            loadSpots();
          }
        });
      mapCenter.value = { ...location };
    },
    onFail: () => {
      if (cachedLocation) return;
      sortMode.value = 'default';
      mapCenter.value = { ...tiananmenLocation };
      loadSpots();
      promptEnableLocation();
    },
    onComplete: () => {
      bootstrappingLocation.value = false;
    },
  });
  if (cachedLocation && !hallReady.value) {
    reverseGeocodeLocation(cachedLocation)
      .then((region) => {
        applyLocatedRegionAsDefault(region);
      })
      .catch(() => {
        selectedProvince.value = '';
        selectedCity.value = '';
        sortMode.value = 'default';
      })
      .finally(() => {
        loadSpots();
      });
  }
}

function ensureDefaultNearest() {
  if (!hallReady.value && !loading.value && !bootstrappingLocation.value) {
    initMapCenter();
  }
}

async function refreshList() {
  try {
    await loadSpots();
  } finally {
    uni.stopPullDownRefresh();
  }
}

function switchMapType(value: 'standard' | 'satellite') {
  mapType.value = value;
}

function hasSpotLocation(spot: SpotItem) {
  return spot.latitude != null
    && spot.longitude != null
    && Number.isFinite(Number(spot.latitude))
    && Number.isFinite(Number(spot.longitude));
}

function addToPlan(spot: SpotItem) {
  if (!requireLogin()) return;
  trip.add(spot);
}

function clearSelectedMapSpot() {
  selectedMapSpotId.value = null;
}

function calcDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function onMarkerTap(e: any) {
  const id = e.detail?.markerId;
  const spotId = Number(id);
  if (!Number.isFinite(spotId) || spotId <= 0) return;
  selectedMapSpotId.value = spotId;
}

function goDetail(id: number | string) {
  if (!requireLogin()) return;
  const spotId = Number(id);
  if (!Number.isFinite(spotId) || spotId <= 0) {
    uni.showToast({ title: '标点 ID 异常，请重新进入', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: `/pages/spot/spot?id=${spotId}` });
}

function goTrip() {
  if (!requireLogin()) return;
  uni.switchTab({ url: '/pages/tools/tools' });
}

function formatDistance(distance: number) {
  if (distance >= 1000) return `${Number((distance / 1000).toFixed(1))}km`;
  return `${Math.max(1, Math.round(distance))}m`;
}

function buildAmapUrl(spot: SpotItem) {
  const lat = Number(spot.latitude);
  const lng = Number(spot.longitude);
  const name = encodeURIComponent(spot.name || '标点');
  return `https://uri.amap.com/marker?position=${lng},${lat}&name=${name}&coordinate=gaode&callnative=1&src=diaodian`;
}

function navigateToSpot(spot: SpotItem) {
  if (!requireLogin()) return;
  if (!hasSpotLocation(spot)) {
    uni.showToast({ title: '这个标点没有坐标', icon: 'none' });
    return;
  }

  // #ifdef H5
  window.location.href = buildAmapUrl(spot);
  // #endif

  // #ifndef H5
  uni.openLocation({
    latitude: Number(spot.latitude),
    longitude: Number(spot.longitude),
    name: spot.name,
    address: spot.address || '',
    scale: 16,
  });
  // #endif
}

function requireLogin() {
  if (auth.isLoggedIn) return true;
  uni.navigateTo({ url: '/pages/login/login' });
  return false;
}

onMounted(() => {
  syncViewportMetrics();
  syncMapViewport();
  loadRegions();
  loadSpotSummary();
  initMapCenter();
  hallReady.value = true;
});

onShow(() => {
  syncViewportMetrics();
  syncMapViewport();
  consumeSearchApplyState();
  ensureDefaultNearest();
});

onPullDownRefresh(() => {
  refreshList();
});

watch(view, () => {
  if (view.value === 'list' && userLocation.value && regionSource.value !== 'manual') {
    sortMode.value = 'nearest';
  } else if (view.value === 'map') {
    sortMode.value = 'default';
  }
  if (hallReady.value) {
    loadSpots();
  }
  syncViewportMetrics();
  syncMapViewport();
});

watch(filtersOpen, () => {
  syncViewportMetrics();
  syncMapViewport();
});

watch(summaryProvinceLabel, () => {
  loadSpotSummary();
});

onShareAppMessage(() => ({
  title: shareCopy.hallTitle,
  path: sharePath.hall,
}));
</script>

<style scoped>
.hall-page,
.hall-topbar,
.filter-sheet,
.region-sheet {
  --hall-ink: #222222;
  --hall-muted: #6A6A6A;
  --hall-muted-soft: #929292;
  --hall-accent: #FF385C;
  --hall-accent-strong: #E00B41;
  --hall-accent-soft: #FFF1F4;
  --hall-line: #EBEBEB;
  --hall-line-strong: #DDDDDD;
  --hall-shadow: rgba(34, 34, 34, 0.08);
  --hall-tabbar-space: var(--dd-h5-dock-space, 88px);
}
.hall-page {
  max-width: 760px;
  padding-top: 12px;
  padding-bottom: 12px;
  background:
    radial-gradient(circle at 16% -6%, rgba(255, 56, 92, 0.08), transparent 24%),
    radial-gradient(circle at 84% 4%, rgba(255, 195, 167, 0.12), transparent 24%),
    linear-gradient(180deg, #FFFFFF 0%, #FCFCFC 42%, #F7F7F7 100%);
}
.hall-page.map-mode {
  padding-bottom: 0;
}
.hall-page.map-mode .hall-topbar {
  gap: 9px;
  margin-bottom: 8px;
  padding: 14px 14px 11px;
}
.hall-page.map-mode .hall-title {
  font-size: 23px;
}
.hall-page.map-mode .hall-meta {
  margin-top: 3px;
  font-size: 11px;
}
.hall-page.map-mode .top-actions {
  gap: 10px;
}
.hall-page.map-mode .view-tabs {
  height: 38px;
}
.hall-page.map-mode .tab {
  height: 32px;
}
.hall-page.map-mode .filter-rail {
  margin-bottom: 8px;
  padding: 10px 12px 9px;
}
.hall-page.map-mode .filter-rail-head {
  margin-bottom: 7px;
}
.hall-page.map-mode .filter-rail-kicker {
  font-size: 9px;
}
.hall-page.map-mode .filter-rail-title {
  margin-top: 3px;
  font-size: 13px;
  line-height: 1.25;
}
.hall-page.map-mode .filter-rail-action {
  min-width: 72px;
  height: 32px;
  padding: 0 12px;
  font-size: 11px;
}
.hall-page.map-mode .quick-actions-inner {
  gap: 8px;
  padding-top: 1px;
}
.hall-page.map-mode .dd-chip {
  height: 34px;
  min-height: 34px;
  padding: 0 14px;
  font-size: 11px;
}
.map-shell-full {
  height: 100%;
}
.hall-topbar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 18px 16px 14px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid var(--hall-line);
  box-shadow: 0 14px 32px var(--hall-shadow);
}
.hall-title-block {
  width: 100%;
  min-width: 0;
  text-align: center;
}
.top-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  width: 100%;
}
.btn-label,
.chip-label {
  display: block;
  line-height: 1;
}
.btn-label {
  transform: translateY(-1px);
}
.hall-title {
  display: block;
  color: var(--hall-ink);
  font-size: 25px;
  font-weight: 950;
  line-height: 1.2;
}
.hall-meta {
  display: block;
  margin-top: 5px;
  color: var(--hall-muted);
  font-size: 12px;
  line-height: 1.45;
}
.view-tabs {
  flex: 1;
  display: flex;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--hall-line);
  border-radius: 999px;
  background: #F7F7F7;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
}
.tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  width: auto;
  height: 38px;
  border-radius: 999px;
  background: transparent;
  font-size: 12px;
  line-height: 1;
  font-weight: 600;
  color: var(--hall-muted);
  white-space: nowrap;
  overflow: hidden;
}
.tab.active { background: #FFFFFF; color: var(--hall-ink); border-color: transparent; box-shadow: 0 6px 16px rgba(34, 34, 34, 0.08); }
.tab-icon { position: relative; display: inline-block; width: 14px; height: 14px; }
.tab-label {
  flex: none;
  white-space: nowrap;
  word-break: keep-all;
  overflow-wrap: normal;
  line-height: 1;
  transform: translateY(-1px);
}
.map-icon { border: 2px solid currentColor; border-radius: 50%; }
.map-icon::after { content: ""; position: absolute; left: 4px; bottom: -5px; width: 2px; height: 7px; background: currentColor; transform: rotate(35deg); border-radius: 2px; }
.list-icon::before, .list-icon::after { content: ""; position: absolute; left: 2px; right: 2px; height: 2px; background: currentColor; border-radius: 2px; }
.list-icon::before { top: 3px; box-shadow: 0 5px 0 currentColor; }
.list-icon::after { top: 13px; }
.quick-actions {
  width: 100%;
  margin-bottom: 0;
  white-space: nowrap;
}
.quick-actions-top {
  margin-top: 10px;
}
.hall-search {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin-top: 10px;
  padding: 0 13px;
  border-radius: 18px;
  border: 1px solid var(--hall-line);
  background: rgba(255, 255, 255, 0.92);
}
.hall-search-trigger {
  flex: 1;
  min-width: 0;
  min-height: 38px;
  display: flex;
  align-items: center;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}
.hall-search-placeholder {
  display: block;
  width: 100%;
  color: var(--hall-ink);
  font-size: 14px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hall-search-icon {
  flex: none;
  color: var(--hall-accent);
  font-size: 16px;
  font-weight: 700;
}
.hall-search-clear {
  flex: none;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--hall-accent-soft);
  color: var(--hall-accent);
  font-size: 11px;
  font-weight: 600;
}
.quick-actions ::-webkit-scrollbar { display: none; width: 0; height: 0; }
.quick-actions-inner {
  display: inline-flex;
  gap: 10px;
  padding: 2px 4px 3px 1px;
  padding-right: 6px;
}
.filter-rail {
  margin-bottom: 10px;
  padding: 14px 14px 12px;
  border-color: var(--hall-line);
  background: rgba(255,255,255,0.98);
  box-shadow: 0 12px 28px rgba(34, 34, 34, 0.06);
}
.filter-rail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.filter-rail-copy {
  flex: 1;
  min-width: 0;
}
.filter-rail-kicker {
  display: block;
  color: var(--hall-muted-soft);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: 0.04em;
}
.filter-rail-title {
  display: block;
  margin-top: 5px;
  color: var(--hall-ink);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
}
.filter-rail-action {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 82px;
  height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--hall-line);
  background: #FFFFFF;
  color: var(--hall-ink);
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 8px 18px rgba(34, 34, 34, 0.05);
}
.filter-rail-action.active {
  border-color: transparent;
  background: var(--hall-accent);
  color: #fff;
  box-shadow: 0 12px 24px rgba(255, 56, 92, 0.20);
}
.hall-page .dd-chip {
  height: 38px;
  min-height: 38px;
  line-height: 1;
  padding: 0 16px;
  border-color: var(--hall-line);
  background: rgba(255, 255, 255, 0.96);
  color: var(--hall-ink);
  box-shadow: 0 8px 18px rgba(34, 34, 34, 0.05);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}
.hall-page .dd-chip-active {
  border-color: transparent;
  background: var(--hall-accent);
  color: #fff;
  box-shadow: 0 10px 22px rgba(255, 56, 92, 0.18);
}
.nearest-chip { border-color: rgba(255, 56, 92, 0.24); color: var(--hall-accent); }
.filter-toggle {
  gap: 6px;
  padding: 0 16px;
  border-color: rgba(255, 56, 92, 0.20);
  color: var(--hall-accent);
}
.filter-caret {
  flex: none;
  font-size: 9px;
  font-weight: 700;
  color: currentColor;
  opacity: 0.68;
  white-space: nowrap;
}
.reset-chip { color: var(--hall-accent); }
.filter-summary-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 11px 12px;
  border-radius: 18px;
  border: 1px solid rgba(255, 56, 92, 0.10);
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,250,250,0.96));
}
.filter-summary-bar.active {
  background: linear-gradient(180deg, rgba(255,248,249,0.98), rgba(255,255,255,0.96));
  border-color: rgba(255, 56, 92, 0.14);
}
.filter-summary-label {
  flex: none;
  color: var(--hall-muted-soft);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}
.filter-summary-text {
  flex: 1;
  min-width: 0;
  color: var(--hall-ink);
  font-size: 12px;
  line-height: 1.45;
}
.filter-summary-clear {
  flex: none;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--hall-accent-soft);
  color: var(--hall-accent);
  font-size: 11px;
  font-weight: 600;
}
.filter-sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 0;
  background: rgba(34, 34, 34, 0.18);
}
.filter-sheet-page {
  padding-bottom: 0;
}
.filter-sheet {
  width: 100%;
  max-width: 760px;
  height: 100vh;
  padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
  border-radius: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.995) 0%, rgba(247, 247, 247, 0.98) 100%);
  border: 0;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.region-sheet {
  width: 100%;
  max-width: 640px;
  max-height: calc(100vh - 32px - var(--hall-tabbar-space) - env(safe-area-inset-bottom));
  padding: 16px;
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(247, 247, 247, 0.98) 100%);
  border: 1px solid var(--hall-line);
  box-shadow: 0 28px 54px rgba(34, 34, 34, 0.12);
  overflow-y: auto;
}
.filter-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.filter-sheet-head-page {
  margin-bottom: 14px;
}
.filter-sheet-back {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background: #F7F7F7;
  color: var(--hall-ink);
  font-size: 24px;
  line-height: 36px;
  text-align: center;
}
.filter-sheet-title {
  flex: 1;
  min-width: 0;
  text-align: center;
  color: var(--hall-ink);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
}
.filter-sheet-close {
  flex: none;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #F7F7F7;
  color: var(--hall-ink);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}
.filter-sheet-close.subtle {
  background: #F7F7F7;
}
.region-locate-card {
  width: 100%;
  margin-bottom: 12px;
  padding: 16px;
  border-radius: 24px;
  background: linear-gradient(135deg, #FFF8F9 0%, #FFFFFF 100%);
  border: 1px solid rgba(255, 56, 92, 0.14);
  text-align: left;
}
.region-locate-kicker {
  display: block;
  color: var(--hall-muted);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.1;
}
.region-locate-main {
  display: block;
  margin-top: 6px;
  color: var(--hall-ink);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.2;
}
.region-locate-sub {
  display: block;
  margin-top: 5px;
  color: var(--hall-muted);
  font-size: 12px;
  line-height: 1.4;
}
.filter-hero {
  margin-bottom: 10px;
  padding: 12px 14px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(14, 116, 144, 0.10), rgba(16, 185, 129, 0.05));
  border: 1px solid rgba(125, 211, 252, 0.40);
}
.filter-hero-main {
  display: block;
  color: var(--hall-ink);
  font-size: 16px;
  font-weight: 950;
  line-height: 1.2;
}
.filter-hero-sub {
  display: block;
  margin-top: 4px;
  color: var(--hall-muted);
  font-size: 11px;
  line-height: 1.35;
}
.filter-search {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin-top: 10px;
  padding: 0 13px;
  border-radius: 18px;
  border: 1px solid var(--hall-line);
  background: rgba(255, 255, 255, 0.92);
}
.filter-search-page {
  margin-top: 0;
  min-height: 52px;
  padding: 0 15px;
  border-radius: 24px;
}
.filter-search-icon {
  flex: none;
  color: var(--hall-accent);
  font-size: 16px;
  font-weight: 700;
}
.filter-search-input {
  flex: 1;
  min-width: 0;
  height: 38px;
  color: var(--hall-ink);
  font-size: 14px;
}
.filter-search-clear {
  flex: none;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--hall-accent-soft);
  color: var(--hall-accent);
  font-size: 11px;
  font-weight: 600;
}
.selected-row {
  margin-top: 10px;
  white-space: nowrap;
  min-height: 34px;
}
.selected-row-page {
  margin-top: 12px;
}
.selected-row ::-webkit-scrollbar { display: none; width: 0; height: 0; }
.selected-inner {
  display: inline-flex;
  gap: 8px;
}
.selected-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 11px;
  border-radius: 999px;
  background: var(--hall-accent);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}
.selected-empty-row {
  margin-top: 10px;
}
.selected-empty-row-page {
  margin-top: 12px;
}
.selected-empty {
  color: var(--hall-muted-soft);
  font-size: 12px;
  font-weight: 500;
}
.filter-sheet-body {
  flex: 1;
  min-height: 0;
  margin-top: 10px;
  overflow: hidden;
}
.filter-sheet-body-page {
  margin-top: 14px;
}
.filter-section {
  padding-bottom: 18px;
}
.filter-section + .filter-section {
  padding-top: 18px;
  border-top: 1px solid var(--hall-line);
}
.filter-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.filter-section-title {
  color: var(--hall-ink);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
}
.filter-section-meta {
  color: var(--hall-muted-soft);
  font-size: 11px;
  font-weight: 600;
}
.fish-group {
  padding: 12px 0 4px;
}
.fish-group-card {
  padding-top: 0;
}
.fish-group-top {
  padding-top: 2px;
}
.fish-group + .fish-group {
  border-top: 0;
  margin-top: 14px;
}
.fish-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.fish-group-title {
  color: var(--hall-ink);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
}
.fish-group-count {
  color: var(--hall-muted-soft);
  font-size: 11px;
  font-weight: 600;
}
.fish-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
}
.fish-option {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0 10px;
  border-radius: 18px;
  border: 1px solid var(--hall-line);
  background: rgba(255, 255, 255, 0.92);
  color: var(--hall-ink);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
}
.fish-option.active {
  border-color: transparent;
  background: var(--hall-accent);
  color: #fff;
  box-shadow: 0 12px 22px rgba(255, 56, 92, 0.18);
}
.fish-empty {
  display: block;
  padding: 22px 4px;
  color: var(--hall-muted);
  font-size: 13px;
  line-height: 1.5;
}
.filter-sheet-actions {
  flex: none;
  display: grid;
  grid-template-columns: 0.9fr 1.4fr;
  gap: 10px;
  margin: 10px -2px 0;
  padding-top: 12px;
  border-top: 1px solid var(--hall-line);
  background: linear-gradient(180deg, rgba(247, 247, 247, 0), rgba(247, 247, 247, 0.98) 34%);
}
.filter-sheet-actions-page {
  margin: 0;
  padding-top: 14px;
}
.filter-reset,
.filter-apply {
  min-height: 44px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
}
.filter-reset {
  border: 1px solid var(--hall-line);
  background: rgba(255, 255, 255, 0.92);
  color: var(--hall-muted);
}
.filter-apply {
  background: var(--hall-accent);
  color: #fff;
  box-shadow: 0 16px 28px rgba(255, 56, 92, 0.20);
}
.city-select-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.city-select-row-sheet { margin-bottom: 0; }
.city-picker { flex: 1; min-width: 0; }
.city-picker-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  height: 42px;
  border: 1px solid var(--hall-line);
  border-radius: 20px;
  padding: 0 12px;
  background: rgba(255,255,255,0.92);
  color: var(--hall-ink);
  font-size: 14px;
  font-weight: 600;
}
.city-picker-caret { flex: none; color: var(--hall-muted); font-size: 11px; font-weight: 600; }
.city-clear { flex: none; height: 38px; padding: 0 12px; border-radius: 16px; font-size: 12px; font-weight: 600; }
.city-clear { border: 1px solid var(--hall-line); background: rgba(255,255,255,0.9); color: var(--hall-accent); }
.region-sheet-actions {
  display: grid;
  grid-template-columns: 0.9fr 1.4fr;
  gap: 9px;
  margin-top: 12px;
}
.map-shell {
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--hall-line);
  border-radius: 32px;
  background: #F3F3F3;
  box-shadow: 0 18px 36px rgba(34, 34, 34, 0.10);
}
.map-surface {
  display: block;
  width: 100%;
  height: 100%;
}
.map-wrap {
  position: relative;
  margin-bottom: 0;
}
.map-spot-card {
  position: absolute;
  left: 12px;
  right: 86px;
  bottom: 12px;
  z-index: 6;
  max-height: min(220px, calc(100% - 24px));
  padding: 12px 13px;
  overflow: hidden;
  border-color: var(--hall-line);
  background: linear-gradient(180deg, rgba(255,255,255,0.99), rgba(250,250,250,0.97));
  box-shadow: 0 18px 34px rgba(34, 34, 34, 0.12);
}
.map-spot-card-cover {
  box-sizing: border-box;
}
.map-spot-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.map-spot-copy {
  flex: 1;
  min-width: 0;
}
.map-spot-style {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--hall-accent-soft);
  color: var(--hall-accent);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}
.map-spot-title {
  display: block;
  margin-top: 8px;
  color: var(--hall-ink);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
}
.map-spot-meta {
  display: block;
  margin-top: 4px;
  color: var(--hall-muted);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.25;
}
.map-spot-close {
  flex: none;
  min-width: 56px;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: #F7F7F7;
  color: var(--hall-ink);
  font-size: 11px;
  font-weight: 600;
}
.map-spot-body {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.map-spot-fish,
.map-spot-tags {
  color: #4B4B4B;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
}
.map-spot-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}
.map-spot-btn {
  flex: 1;
  min-width: 0;
  min-height: 38px;
  border-radius: 18px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.1;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  word-break: keep-all;
  overflow: hidden;
}
.map-spot-btn-secondary {
  border: 1px solid var(--hall-line);
  background: rgba(255,255,255,0.95);
  color: var(--hall-ink);
}
.map-spot-btn-primary {
  background: var(--hall-accent);
  color: #fff;
}
.map-spot-btn.disabled {
  opacity: 0.45;
}
.map-summary {
  position: absolute;
  left: 12px;
  top: 14px;
  z-index: 3;
  min-width: 96px;
  max-width: 156px;
  padding: 9px 12px;
  border: 1px solid var(--hall-line);
  border-radius: 18px;
  background: #FFFFFF;
  box-shadow: 0 10px 22px rgba(34, 34, 34, 0.10);
}
.map-summary-meta {
  display: block;
  margin-top: 3px;
  color: var(--hall-muted);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.35;
}
.map-filter-pill { position: absolute; top: 12px; right: 64px; z-index: 3; display: flex; align-items: center; gap: 6px; min-height: 38px; padding: 0 14px; border-radius: 999px; background: rgba(255,255,255,0.96); border: 1px solid var(--hall-line); box-shadow: 0 8px 18px rgba(34,34,34,0.08); }
.map-filter-city { color: var(--hall-ink); font-size: 13px; font-weight: 600; line-height: 1.2; white-space: nowrap; max-width: 100px; overflow: hidden; text-overflow: ellipsis; }
.map-filter-badge { min-width: 18px; height: 18px; border-radius: 999px; background: var(--hall-accent); color: #fff; font-size: 10px; font-weight: 700; line-height: 18px; text-align: center; }
.map-limit-note { position: absolute; bottom: 16px; left: 0; right: 0; z-index: 2; text-align: center; color: rgba(106,106,106,0.72); font-size: 10px; line-height: 1.4; font-weight: 500; pointer-events: none; }
.map-toolbar {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  z-index: 7;
  width: 64px;
}
.map-type-switch {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  border-radius: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
}
.map-type-btn {
  width: 100%;
  height: 40px;
  border-radius: 999px;
  background: #FFFFFF;
  color: var(--hall-muted);
  font-size: 11px;
  font-weight: 600;
  line-height: 40px;
  text-align: center;
  white-space: nowrap;
  word-break: keep-all;
  overflow: hidden;
  border: 1px solid var(--hall-line);
  box-shadow: 0 10px 20px rgba(34, 34, 34, 0.10);
}
.map-type-btn.active {
  background: var(--hall-accent);
  color: #fff;
  border-color: var(--hall-accent);
  box-shadow: 0 12px 22px rgba(255, 56, 92, 0.22);
}
.map-cover-btn {
  box-sizing: border-box;
}
.map-locate-btn {
  min-height: 40px;
  width: 100%;
  padding: 0 8px;
  border-radius: 999px;
  background: #FFFFFF;
  border: 1px solid var(--hall-line);
  color: var(--hall-ink);
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 10px 20px rgba(34, 34, 34, 0.10);
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
  line-height: 1;
  white-space: nowrap;
  word-break: keep-all;
  overflow: hidden;
}
.map-locate-icon {
  display: inline-block;
  flex: none;
  line-height: 1;
  font-size: 11px;
}
.map-locate-text {
  display: inline-block;
  flex: none;
  line-height: 1;
  white-space: nowrap;
  word-break: keep-all;
}
.map-locate-btn[disabled] {
  opacity: 0.72;
}
.list-wrap {
  padding-bottom: 4px;
}
.trip-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 10px 12px;
  border-color: var(--hall-line);
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,250,250,0.95));
}
.trip-strip-main { flex: 1; min-width: 0; }
.trip-strip-title { display: block; color: var(--hall-ink); font-size: 14px; font-weight: 600; line-height: 1.2; }
.trip-strip-meta { display: block; margin-top: 3px; color: var(--hall-muted); font-size: 12px; font-weight: 500; line-height: 1.35; }
.trip-strip-btn {
  flex: none;
  min-width: 86px;
  height: 36px;
  border-radius: 999px;
  background: var(--hall-accent);
  color: #fff;
  font-size: 13px;
  line-height: 1;
  font-weight: 600;
}
.loading { text-align: center; padding: 20px; color: var(--hall-muted); font-size: 13px; }

@media (max-width: 430px) {
  .hall-page {
    padding-top: 10px;
    padding-left: 12px;
    padding-right: 12px;
  }

  .hall-page.map-mode {
    padding-left: 12px;
    padding-right: 12px;
    padding-bottom: 0;
  }

  .hall-page.map-mode .hall-topbar {
    gap: 8px;
    padding: 13px 13px 10px;
    margin-bottom: 7px;
  }

  .hall-page.map-mode .filter-rail {
    padding: 9px 10px 8px;
    margin-bottom: 7px;
  }

  .hall-page.map-mode .filter-rail-head {
    margin-bottom: 6px;
  }

  .hall-page.map-mode .filter-rail-title {
    font-size: 12px;
  }

  .hall-page.map-mode .filter-rail-action {
    min-width: 68px;
    height: 30px;
    padding: 0 10px;
  }

  .hall-page.map-mode .dd-chip {
    height: 32px;
    min-height: 32px;
    padding: 0 13px;
    font-size: 11px;
  }

  .hall-search {
    margin-top: 8px;
    min-height: 42px;
    padding: 0 12px;
  }

  .hall-topbar {
    gap: 11px;
    flex-direction: column;
    padding: 16px 16px 13px;
    border-radius: 24px;
    margin-bottom: 10px;
  }

  .top-actions {
    width: 100%;
    justify-content: space-between;
    gap: 12px;
  }

  .view-tabs {
    flex: 1;
    height: 42px;
    padding: 3px;
    border-radius: 18px;
  }

  .hall-title {
    font-size: 23px;
  }

  .hall-meta {
    margin-top: 4px;
    font-size: 11px;
  }

  .tab {
    flex: 1;
    width: auto;
    height: 34px;
    border-radius: 15px;
  }

  .map-summary {
    left: 8px;
    top: 10px;
    min-width: 90px;
    max-width: 116px;
    padding: 7px 8px;
  }


  .map-summary-meta {
    font-size: 9px;
  }

  .map-toolbar {
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    flex-direction: column;
    align-items: stretch;
    gap: 7px;
    width: 60px;
  }

  .map-spot-card {
    left: 8px;
    right: 76px;
    bottom: 8px;
    max-height: min(210px, calc(100% - 16px));
    padding: 11px 12px;
  }

  .map-spot-title {
    font-size: 14px;
  }

  .map-spot-actions {
    gap: 7px;
  }

  .map-locate-btn {
    min-height: 38px;
    padding: 0 6px;
    font-size: 11px;
    border-radius: 19px;
  }

  .map-type-btn {
    height: 38px;
    font-size: 11px;
    line-height: 38px;
  }

  .filter-sheet-mask {
    padding: 0;
  }

  .filter-sheet {
    height: 100vh;
    padding: 16px 14px calc(20px + env(safe-area-inset-bottom));
    border-radius: 0;
  }

  .filter-rail {
    padding: 13px 12px 11px;
  }

  .filter-rail-head {
    align-items: flex-start;
  }

  .filter-rail-title {
    font-size: 13px;
  }

  .filter-rail-action {
    min-width: 76px;
    height: 34px;
    padding: 0 12px;
  }

  .fish-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .hall-page .dd-chip {
    height: 36px;
    min-height: 36px;
    padding: 0 15px;
    font-size: 12px;
  }

}
</style