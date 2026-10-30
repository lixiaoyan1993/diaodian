<template>
  <view class="picker-page">
    <map
      id="pick-map"
      class="picker-map"
      :latitude="center.lat"
      :longitude="center.lng"
      :markers="markers"
      :scale="scale"
      show-location
      @updated="onMapUpdated"
    />
    <view class="picker-center-pin">📍</view>
    <view class="picker-locate" @tap="locateToCurrent">
      <text class="picker-locate-icon">○</text>
      <text class="picker-locate-text">{{ locating ? "定位中" : "定位" }}</text>
    </view>
    <view class="picker-footer">
            <text class="picker-address">{{ address || (loadingAddress ? "正在获取位置…" : "拖动地图选择位置") }}</text>
      <button class="picker-confirm" :disabled="confirming" @tap="confirmPick">{{ confirming ? "确认中…" : "确认此位置" }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

const amapKey = import.meta.env.VITE_AMAP_JS_KEY || "";

const center = ref({ lat: 39.9087, lng: 116.3975 });
const selected = ref({ lat: 39.9087, lng: 116.3975 });
const scale = ref(14);
const address = ref("");
const loadingAddress = ref(false);
const confirming = ref(false);
const locating = ref(false);

const markers = computed(() => [
  {
    id: 1,
    latitude: selected.value.lat,
    longitude: selected.value.lng,
    iconPath: "/static/marker-lure.png",
    width: 32,
    height: 40,
  },
]);

function onMapUpdated(e: any) {
  const loc = e.detail?.centerLocation;
  if (loc?.latitude && loc?.longitude) {
    selected.value = { lat: loc.latitude, lng: loc.longitude };
    debouncedReverseGeocode(loc.latitude, loc.longitude);
  }
}

let geoTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedReverseGeocode(lat: number, lng: number) {
  if (geoTimer) clearTimeout(geoTimer);
  geoTimer = setTimeout(() => reverseGeocode(lat, lng), 400);
}

async function reverseGeocode(lat: number, lng: number) {
  if (!amapKey) return;
  loadingAddress.value = true;
  try {
    const res: any = await uni.request({
      url: "https://restapi.amap.com/v3/geocode/regeo",
      data: { key: amapKey, location: `${lng},${lat}` },
    });
    const addr = res?.data?.regeocode?.formatted_address;
    if (addr) address.value = addr;
  } catch {
    // ignore
  } finally {
    loadingAddress.value = false;
  }
}

async function confirmPick() {
  confirming.value = true;
  try {
    const ctx = uni.createMapContext("pick-map");
    const loc: any = await new Promise((resolve, reject) => {
      ctx.getCenterLocation({ success: resolve, fail: reject });
    });
    const finalLat = loc.latitude;
    const finalLng = loc.longitude;
    let finalAddr = address.value;
    if (!finalAddr && amapKey) {
      try {
        const res: any = await uni.request({
          url: "https://restapi.amap.com/v3/geocode/regeo",
          data: { key: amapKey, location: `${finalLng},${finalLat}` },
        });
        finalAddr = res?.data?.regeocode?.formatted_address || "";
      } catch {}
    }
    const ec = uni.getOpenerEventChannel();
    if (ec?.emit) {
      ec.emit("confirm", { latitude: finalLat, longitude: finalLng, address: finalAddr });
    }
    uni.navigateBack();
  } catch {
    uni.showToast({ title: "获取位置失败", icon: "none" });
  } finally {
    confirming.value = false;
  }
}

function locateToCurrent() {
  if (locating.value) return;
  locating.value = true;
  uni.getLocation({
    type: "gcj02",
    success: (res) => {
      const loc = { lat: res.latitude, lng: res.longitude };
      center.value = loc;
      selected.value = loc;
      reverseGeocode(loc.lat, loc.lng);
    },
    fail: () => { uni.showToast({ title: "定位失败", icon: "none" }); },
    complete: () => { locating.value = false; },
  });
}

onMounted(() => {
  try {
    const pages = getCurrentPages();
    const page: any = pages[pages.length - 1];
    const q = page.$route?.query || page.options || {};
    const lat = Number(q.lat);
    const lng = Number(q.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      center.value = { lat, lng };
      selected.value = { lat, lng };
      reverseGeocode(lat, lng);
    }
  } catch {}
});
</script>

<style>
.picker-page { position: relative; width: 100%; height: 100vh; background: #F3F6F0; overflow: hidden; }
.picker-map { width: 100%; height: 100%; }
.picker-center-pin { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -100%); z-index: 10; pointer-events: none; font-size: 32px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25)); }
.picker-footer { position: absolute; bottom: 0; left: 0; right: 0; padding: 16px 16px calc(28px + env(safe-area-inset-bottom)); background: linear-gradient(180deg, rgba(243,246,240,0) 0%, rgba(243,246,240,0.96) 25%); }
.picker-address { display: block; text-align: center; color: #16324F; font-size: 15px; font-weight: 950; margin-bottom: 12px; min-height: 22px; }
.picker-confirm { width: 100%; min-height: 50px; border-radius: 18px; background: linear-gradient(135deg, #0F766E 0%, #0891B2 100%); color: #fff; font-size: 16px; font-weight: 950; border: 0; }
.picker-confirm[disabled] { opacity: 0.65; }
</style>
