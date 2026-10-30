<template>
  <view class="catch-page dd-page">
    <view class="hero dd-card">
      <text class="eyebrow">我的渔获</text>
      <text class="title">每一尾，都值得记录</text>
      <text class="subtitle">记下鱼种、照片和钓点，慢慢积累自己的钓鱼档案。</text>
      <button class="primary" @tap="openForm">{{ formOpen ? '继续填写' : '＋ 记一条渔获' }}</button>
    </view>

    <view v-if="!auth.isLoggedIn" class="empty dd-card">
      <text>登录后保存和查看你的渔获记录</text>
      <button class="primary" @tap="goLogin">登录 / 注册</button>
    </view>

    <template v-else>
      <view class="stats dd-card">
        <view><text class="stat-value">{{ stats.total }}</text><text class="stat-label">累计渔获</text></view>
        <view><text class="stat-value">{{ stats.speciesTotal }}</text><text class="stat-label">鱼种</text></view>
        <view><text class="stat-value">{{ stats.maxWeightKg ?? '—' }}</text><text class="stat-label">最大重量 kg</text></view>
      </view>

      <view v-if="formOpen" class="form dd-card">
        <view class="form-head"><text class="section-title">记录渔获</text><button class="text-button" @tap="formOpen = false">收起</button></view>
        <text class="label">鱼种 *</text>
        <input v-model="form.species" class="field" maxlength="100" placeholder="例如：翘嘴、鲈鱼" />
        <text class="label">捕获日期 *</text>
        <picker mode="date" :value="form.date" @change="onDateChange"><view class="field">{{ form.date || '选择日期' }}</view></picker>
        <text class="label">关联我的钓点</text>
        <picker :range="spotOptions" range-key="name" :value="spotIndex" @change="onSpotChange"><view class="field">{{ spotOptions[spotIndex]?.name || '不关联钓点' }}</view></picker>
        <view class="two-col">
          <view><text class="label">长度 cm</text><input v-model="form.lengthCm" class="field" type="digit" placeholder="选填" /></view>
          <view><text class="label">重量 kg</text><input v-model="form.weightKg" class="field" type="digit" placeholder="选填" /></view>
        </view>
        <text class="label">钓法</text>
        <view class="chips"><button v-for="style in ['路亚', '台钓', '其他']" :key="style" :class="['chip', { selected: form.style === style }]" @tap="form.style = style">{{ style }}</button></view>
        <text class="label">饵 / 假饵</text>
        <input v-model="form.bait" class="field" maxlength="100" placeholder="选填" />
        <text class="label">照片</text>
        <view class="photos"><image v-for="url in form.photoUrls" :key="url" :src="url" mode="aspectFill" class="photo" @tap="preview(url)" /><button class="add-photo" :disabled="uploading || form.photoUrls.length >= 9" @tap="choosePhoto">{{ uploading ? '上传中' : '＋ 添加' }}</button></view>
        <text class="label">备注</text>
        <textarea v-model="form.note" class="field note" maxlength="2000" placeholder="天气、水情、手法或当时的故事…" />
        <button class="primary save" :disabled="saving || uploading" @tap="save">{{ saving ? '保存中…' : '保存渔获' }}</button>
      </view>

      <view class="list-head"><text class="section-title">渔获记录</text><text class="count">{{ total }} 条</text></view>
      <view v-if="!loading && !items.length" class="empty dd-card">还没有渔获。记录第一尾鱼，开始你的钓鱼档案。</view>
      <view v-for="item in items" :key="item.id" class="catch-card dd-card">
        <image v-if="item.photoUrls[0]" :src="item.photoUrls[0]" class="cover" mode="aspectFill" @tap="preview(item.photoUrls[0])" />
        <view class="catch-info"><text class="fish-name">{{ item.species }}</text><text class="meta">{{ formatDate(item.caughtAt) }}{{ item.spotName ? ' · ' + item.spotName : '' }}</text><text class="meta">{{ [item.lengthCm ? item.lengthCm + ' cm' : '', item.weightKg ? item.weightKg + ' kg' : '', item.style].filter(Boolean).join(' · ') }}</text><text v-if="item.note" class="note-text">{{ item.note }}</text></view>
        <button class="delete" @tap="confirmDelete(item)">删除</button>
      </view>
      <button v-if="items.length < total" class="more" :disabled="loading" @tap="loadMore">{{ loading ? '加载中…' : '加载更多' }}</button>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { catchApi, type CatchItem, type CatchStats } from '@/api/catches';
import { spotApi, type SpotItem } from '@/api/spots';
import { uploadApi } from '@/api/upload';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const today = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const emptyForm = () => ({ species: '', date: today(), spotId: null as number | null, lengthCm: '', weightKg: '', style: '路亚', bait: '', note: '', photoUrls: [] as string[] });
const form = ref(emptyForm());
const formOpen = ref(false);
const saving = ref(false);
const uploading = ref(false);
const loading = ref(false);
const items = ref<CatchItem[]>([]);
const total = ref(0);
const stats = ref<CatchStats>({ total: 0, speciesTotal: 0, maxWeightKg: null, maxLengthCm: null });
const mySpots = ref<SpotItem[]>([]);
const spotOptions = computed(() => [{ id: null as number | null, name: '不关联钓点' }, ...mySpots.value.map(s => ({ id: s.id as number | null, name: s.name }))]);
const spotIndex = computed(() => Math.max(0, spotOptions.value.findIndex(s => s.id === form.value.spotId)));

function goLogin() { uni.navigateTo({ url: '/pages/login/login' }); }
function openForm() { if (!auth.isLoggedIn) return goLogin(); formOpen.value = true; }
function onDateChange(event: any) { form.value.date = event.detail.value; }
function onSpotChange(event: any) { form.value.spotId = spotOptions.value[Number(event.detail.value)]?.id || null; }
function formatDate(value: string) { return String(value || '').slice(0, 10); }
function preview(url: string) { uni.previewImage({ urls: [url] }); }

async function refresh() {
  if (!auth.isLoggedIn) return;
  loading.value = true;
  try {
    const [records, summary, spots] = await Promise.all([
      catchApi.list(1, 20), catchApi.stats(), spotApi.list({ pageSize: '200' }),
    ]);
    items.value = records.data?.items || [];
    total.value = records.data?.total || 0;
    stats.value = summary.data || stats.value;
    mySpots.value = (spots.data?.items || []).filter(s => s.userId === auth.user?.id);
  } catch (error: any) { uni.showToast({ title: error.message || '加载失败', icon: 'none' }); }
  finally { loading.value = false; }
}

async function loadMore() {
  if (loading.value || items.value.length >= total.value) return;
  loading.value = true;
  try {
    const res = await catchApi.list(Math.floor(items.value.length / 20) + 1, 20);
    items.value = [...items.value, ...(res.data?.items || []).filter(item => !items.value.some(old => old.id === item.id))];
  } catch (error: any) { uni.showToast({ title: error.message || '加载失败', icon: 'none' }); }
  finally { loading.value = false; }
}

function choosePhoto() {
  uni.chooseImage({ count: 9 - form.value.photoUrls.length, success: async result => {
    uploading.value = true;
    try {
      for (const path of result.tempFilePaths || []) {
        const uploaded = await uploadApi.image(path);
        if (uploaded.data?.url) form.value.photoUrls.push(uploaded.data.url);
      }
    } catch (error: any) { uni.showToast({ title: error.message || '图片上传失败', icon: 'none' }); }
    finally { uploading.value = false; }
  } });
}

async function save() {
  if (!form.value.species.trim()) return uni.showToast({ title: '请填写鱼种', icon: 'none' });
  if (!form.value.date) return uni.showToast({ title: '请选择日期', icon: 'none' });
  saving.value = true;
  try {
    await catchApi.create({
      species: form.value.species.trim(), caughtAt: `${form.value.date}T12:00:00`, spotId: form.value.spotId,
      lengthCm: form.value.lengthCm || null, weightKg: form.value.weightKg || null,
      style: form.value.style, bait: form.value.bait.trim(), note: form.value.note.trim(), photoUrls: form.value.photoUrls,
    });
    form.value = emptyForm();
    formOpen.value = false;
    uni.showToast({ title: '渔获已保存', icon: 'success' });
    await refresh();
  } catch (error: any) { uni.showToast({ title: error.message || '保存失败', icon: 'none' }); }
  finally { saving.value = false; }
}

function confirmDelete(item: CatchItem) {
  uni.showModal({ title: '删除渔获', content: `确定删除这条${item.species}记录吗？`, success: async result => {
    if (!result.confirm) return;
    try { await catchApi.remove(item.id); await refresh(); }
    catch (error: any) { uni.showToast({ title: error.message || '删除失败', icon: 'none' }); }
  } });
}

onShow(refresh);
</script>

<style scoped>
.catch-page { max-width: 760px; padding: 16px 16px 110px; color: #19342b; background: #f4f7f1; min-height: 100vh; box-sizing: border-box; }
.dd-card { background: #fff; border-radius: 22px; padding: 18px; margin-bottom: 14px; box-shadow: 0 8px 24px rgba(29, 65, 47, .06); }
.hero { background: linear-gradient(135deg, #173e31, #38785c); color: #fff; padding: 26px 22px; }
.eyebrow, .title, .subtitle, .stat-value, .stat-label, .label, .fish-name, .meta, .note-text { display: block; }
.eyebrow { font-size: 12px; letter-spacing: 2px; opacity: .75; }.title { font-size: 25px; font-weight: 800; margin: 9px 0; }.subtitle { font-size: 13px; line-height: 1.6; opacity: .85; }
.primary { border: 0; background: #e9aa58; color: #17362b; font-weight: 700; border-radius: 12px; padding: 8px 20px; margin: 18px 0 0; font-size: 15px; }.primary[disabled] { opacity: .55; }
.stats { display: flex; justify-content: space-around; text-align: center; }.stat-value { font-size: 23px; font-weight: 800; }.stat-label { color: #72827a; font-size: 11px; margin-top: 5px; }
.form-head, .list-head { display: flex; align-items: center; justify-content: space-between; }.section-title { font-size: 18px; font-weight: 800; }.text-button { color: #507965; font-size: 13px; background: none; }.label { font-size: 13px; font-weight: 700; margin: 16px 0 7px; }.field { box-sizing: border-box; width: 100%; min-height: 44px; border: 1px solid #dce6dc; border-radius: 11px; padding: 10px 12px; background: #fbfcf9; font-size: 14px; }.note { height: 90px; }.two-col { display: flex; gap: 12px; }.two-col > view { flex: 1; min-width: 0; }.chips, .photos { display: flex; gap: 8px; flex-wrap: wrap; }.chip { margin: 0; border-radius: 20px; font-size: 13px; background: #eef3eb; color: #3e5b4b; }.selected { background: #245b42; color: #fff; }.photo { width: 72px; height: 72px; border-radius: 10px; }.add-photo { width: 72px; height: 72px; margin: 0; font-size: 12px; color: #456650; border: 1px dashed #aac5ad; background: #f7faf6; }.save { width: 100%; }
.list-head { padding: 12px 4px 10px; }.count, .meta { color: #738279; font-size: 12px; }.empty { text-align: center; color: #738279; font-size: 14px; line-height: 1.7; }.catch-card { display: flex; gap: 12px; align-items: flex-start; }.cover { width: 82px; height: 82px; border-radius: 12px; flex: none; }.catch-info { flex: 1; min-width: 0; }.fish-name { font-size: 17px; font-weight: 800; margin-bottom: 5px; }.meta { margin-top: 4px; }.note-text { font-size: 12px; margin-top: 8px; color: #465c4d; }.delete { flex: none; font-size: 12px; color: #9b5b51; background: none; padding: 2px; }.more { margin: 10px auto; font-size: 13px; color: #467259; background: none; }
</style>
