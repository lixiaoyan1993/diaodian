<template>
  <view :id="containerId" class="h5-amap">
    <view v-if="mapError" class="h5-amap-state">{{ mapError }}</view>
    <view v-else-if="!mapReady" class="h5-amap-state">地图加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

type MapType = 'standard' | 'satellite';
type H5Marker = {
  id: number | string;
  latitude: number;
  longitude: number;
  title?: string;
  subtitle?: string;
  style?: string;
  iconPath?: string;
  width?: number;
  height?: number;
};

const props = defineProps<{
  latitude: number;
  longitude: number;
  scale?: number;
  markers: H5Marker[];
  mapType: MapType;
  fitMarkers?: boolean;
}>();

const emit = defineEmits<{
  (event: 'markertap', payload: { detail: { markerId: number | string } }): void;
}>();

const containerId = `h5-amap-${Math.random().toString(36).slice(2)}`;
const mapReady = ref(false);
const mapError = ref('');

let map: any;
let amap: any;
let satelliteLayer: any;
let roadNetLayer: any;
let markerInstances: any[] = [];
let markerTapHandler: ((markerId: string | number) => void) | null = null;

declare const window: any;
declare const document: any;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markerLabel(title?: string) {
  const text = (title || '').trim();
  if (!text) return '';
  return text.length > 10 ? `${text.slice(0, 10)}...` : text;
}

function markerSubtitle(subtitle?: string) {
  const text = (subtitle || '').trim();
  if (!text) return '';
  return text.length > 14 ? `${text.slice(0, 14)}...` : text;
}

function handleMarkerLabelClick(event: Event) {
  const target = event.target as HTMLElement | null;
  const label = target?.closest?.('.diaodian-marker-label') as HTMLElement | null;
  const markerId = label?.dataset.markerId;
  if (!markerId) return;
  event.stopPropagation();
  emit('markertap', { detail: { markerId } });
}

function getAmapConfig() {
  const config = window.__uniConfig || {};
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

function applyMapType() {
  if (!map || !amap) return;
  if (!satelliteLayer) satelliteLayer = new amap.TileLayer.Satellite();
  if (!roadNetLayer) roadNetLayer = new amap.TileLayer.RoadNet();

  if (props.mapType === 'satellite') {
    map.add([satelliteLayer, roadNetLayer]);
  } else {
    map.remove([satelliteLayer, roadNetLayer]);
  }
}

function renderMarkers() {
  if (!map || !amap) return;
  if (!window.__diaodianMarkerTap) {
    markerTapHandler = (markerId: string | number) => emit('markertap', { detail: { markerId } });
    window.__diaodianMarkerTap = markerTapHandler;
  }
  markerInstances.forEach(marker => marker.setMap(null));
  markerInstances = props.markers
    .filter(marker => Number.isFinite(Number(marker.latitude)) && Number.isFinite(Number(marker.longitude)))
    .map(marker => {
      const width = Number(marker.width || 32);
      const height = Number(marker.height || 40);
      const markerOptions: Record<string, any> = {
        position: [Number(marker.longitude), Number(marker.latitude)],
        title: marker.title || '',
        offset: new amap.Pixel(-width / 2, -height),
      };

      if (marker.iconPath) {
        markerOptions.icon = new amap.Icon({
          image: marker.iconPath,
          size: new amap.Size(width, height),
          imageSize: new amap.Size(width, height),
        });
      }

      const markerIns = new amap.Marker(markerOptions);
      const label = markerLabel(marker.title);
      const subtitle = markerSubtitle(marker.subtitle);
      if (label) {
        const tone = marker.style === '台钓' ? 'bait' : marker.style === '都可' ? 'both' : 'lure';
        markerIns.setLabel({
          direction: 'top',
          offset: new amap.Pixel(0, -6),
          content: `<div class="diaodian-marker-label ${tone}" data-marker-id="${escapeHtml(String(marker.id))}">
            <div class="diaodian-marker-title">${escapeHtml(label)}</div>
            ${subtitle ? `<div class="diaodian-marker-sub">${escapeHtml(subtitle)}</div>` : ''}
          </div>`,
        });
      }
      markerIns.on('click', () => emit('markertap', { detail: { markerId: marker.id } }));
      markerIns.setMap(map);
      return markerIns;
    });
  if (props.fitMarkers && markerInstances.length > 1) {
    map.setFitView(markerInstances, false, [56, 56, 56, 56]);
  }
}

async function initMap() {
  await nextTick();
  if (map) return;

  try {
    amap = await loadAmapSdk();
    map = new amap.Map(containerId, {
      center: [Number(props.longitude), Number(props.latitude)],
      zoom: Number(props.scale || 14),
      resizeEnable: true,
      dragEnable: true,
      zoomEnable: true,
      doubleClickZoom: false,
    });
    map.on('complete', () => {
      mapReady.value = true;
    });
    renderMarkers();
    applyMapType();
  } catch (error: any) {
    mapError.value = error?.message || '地图加载失败';
  }
}

watch(() => [props.latitude, props.longitude], () => {
  if (!map || !amap) return;
  map.setCenter([Number(props.longitude), Number(props.latitude)]);
});

watch(() => props.scale, (scale) => {
  if (map && scale) map.setZoom(Number(scale));
});

watch(() => props.mapType, applyMapType);
watch(() => props.markers, renderMarkers, { deep: true });
watch(() => props.fitMarkers, (value) => {
  if (!map || !value || markerInstances.length <= 1) return;
  map.setFitView(markerInstances, false, [56, 56, 56, 56]);
});

onMounted(() => {
  markerTapHandler = (markerId: string | number) => emit('markertap', { detail: { markerId } });
  window.__diaodianMarkerTap = markerTapHandler;
  document.addEventListener('click', handleMarkerLabelClick, true);
  initMap();
});

onBeforeUnmount(() => {
  if (window.__diaodianMarkerTap === markerTapHandler) {
    delete window.__diaodianMarkerTap;
  }
  document.removeEventListener('click', handleMarkerLabelClick, true);
  markerInstances.forEach(marker => marker.setMap(null));
  markerInstances = [];
  if (map) {
    map.destroy();
    map = null;
  }
});
</script>

<style scoped>
.h5-amap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, #EAF8FB 0%, #DDF2F7 100%);
}

.h5-amap-state {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: #6C8198;
  font-size: 13px;
  font-weight: 800;
}

:deep(.amap-marker-label) {
  padding: 0;
  border: 0;
  background: transparent;
}

:deep(.diaodian-marker-label) {
  pointer-events: auto;
  max-width: 108px;
  padding: 5px 7px;
  border: 1px solid rgba(168, 211, 223, 0.88);
  border-radius: 12px;
  background: rgba(255,255,255,0.90);
  box-shadow: 0 12px 20px rgba(14,116,144,0.14);
  color: #16324F;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  backdrop-filter: blur(14px);
}

:deep(.diaodian-marker-label.bait) {
  border-color: rgba(6, 182, 212, 0.38);
}

:deep(.diaodian-marker-label.both) {
  border-color: rgba(15, 118, 110, 0.34);
}

:deep(.diaodian-marker-title) {
  overflow: hidden;
  color: #16324F;
  font-size: 10px;
  font-weight: 950;
  text-overflow: ellipsis;
}

:deep(.diaodian-marker-sub) {
  margin-top: 3px;
  overflow: hidden;
  color: #6C8198;
  font-size: 9px;
  font-weight: 900;
  text-overflow: ellipsis;
}
</style>
