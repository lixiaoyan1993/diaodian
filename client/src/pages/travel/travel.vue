<template>
  <view class="travel-page dd-page">
    <view class="travel-top">
      <view class="hero dd-card">
      <view class="hero-main">
        <text class="hero-kicker">钓友互助</text>
        <text class="hero-title">行程</text>
        <text class="hero-sub">发布结伴、找车、拼车信息，也可以直接浏览别人的出行动态。</text>
      </view>
      <button class="hero-action" @tap="togglePublish">{{ showPublish ? '收起发布' : '发布行程' }}</button>
      </view>
    </view>

    <view class="scope-switch">
      <button
        :class="['scope-chip', { active: scopeFilter === 'all' }]"
        @tap="switchScope('all')"
      >
        全部行程
      </button>
      <button
        :class="['scope-chip', { active: scopeFilter === 'mine' }]"
        @tap="switchScope('mine')"
      >
        我发布的
      </button>
    </view>

    <scroll-view class="filter-row" scroll-x>
      <view class="filter-row-inner">
        <button
          v-for="item in filterOptions"
          :key="item.value"
          class="dd-chip"
          :class="{ 'dd-chip-active': activeFilter === item.value }"
          @tap="switchFilter(item.value)"
        >
          {{ item.label }}
        </button>
      </view>
    </scroll-view>

    <view v-if="showPublish" class="publish-card dd-card">
      <view class="publish-head">
        <view>
          <text class="publish-title">{{ editingId ? '编辑行程' : '发布行程' }}</text>
          <text class="publish-sub">发布时会自动关联“出行”里第一个钓点作为目的地。</text>
        </view>
      </view>

      <view v-if="!trip.items.length" class="publish-notice">
        <text class="publish-notice-title">先去“出行”加一个钓点</text>
        <text class="publish-notice-desc">没有行程点位时无法发布，因为发布会默认复用你的第一个出行点。</text>
        <button class="publish-notice-btn" @tap="goTripTab">去出行页</button>
      </view>

      <view v-else>
        <view class="field">
          <text class="dd-field-label">行程类型</text>
          <view class="type-row">
            <button
              v-for="item in typeOptions"
              :key="item.value"
              class="dd-chip"
              :class="{ 'dd-chip-active': form.travelType === item.value }"
              @tap="form.travelType = item.value"
            >
              {{ item.label }}
            </button>
          </view>
        </view>

        <view class="field">
          <text class="dd-field-label">出行时间</text>
          <view class="time-picker-grid">
            <picker class="time-picker" mode="date" :value="form.departDate" @change="onDepartDateChange">
              <view class="picker-box">
                <text class="picker-label">日期</text>
                <text class="picker-value">{{ form.departDate || '选择日期' }}</text>
              </view>
            </picker>
            <picker class="time-picker" mode="time" :value="form.departTime" @change="onDepartTimeChange">
              <view class="picker-box">
                <text class="picker-label">时间</text>
                <text class="picker-value">{{ form.departTime || '选择时间' }}</text>
              </view>
            </picker>
          </view>
          <text class="field-tip">有效期默认到 {{ expiresPreview || '开始时间后 3 天' }}，到期会自动结束。</text>
        </view>

        <view class="field">
          <text class="dd-field-label">关联钓点</text>
          <view class="spot-box">
            <text class="spot-box-title">{{ selectedSpot?.name || '请先在出行里加入钓点' }}</text>
            <text class="spot-box-desc">{{ selectedSpot ? locationText(selectedSpot) : '发布会默认使用出行里的第一个钓点' }}</text>
          </view>
        </view>

        <view class="field">
          <text class="dd-field-label">出发地</text>
          <input v-model="form.departurePlace" class="dd-input" maxlength="120" placeholder="例如：朝阳北苑 / 通州梨园" />
        </view>

        <view v-if="form.travelType === 'carpool'" class="field">
          <text class="dd-field-label">空余座位数</text>
          <input v-model="form.seatTotal" class="dd-input" type="number" maxlength="3" placeholder="例如：3" />
        </view>

        <view class="field">
          <text class="dd-field-label">说明</text>
          <textarea v-model="form.description" class="dd-textarea" maxlength="200" placeholder="例如：周六一早出发，想找顺路钓友一起去。" />
        </view>

        <view class="field">
          <text class="dd-field-label">联系方式</text>
          <input v-model="form.contact" class="dd-input" maxlength="100" placeholder="微信 / 手机号" />
        </view>

        <view class="publish-actions">
          <button class="dd-secondary-btn" @tap="resetForm">重置</button>
          <button class="dd-primary-btn" :disabled="publishing" @tap="submitTravel">{{ editingId ? '保存修改' : '立即发布' }}</button>
        </view>
      </view>
    </view>

    <view v-if="loading" class="dd-empty">正在加载行程列表...</view>
    <view v-else-if="!travelList.length" class="dd-empty dd-card">当前条件下还没有行程动态，试试换个筛选或者自己先发一条。</view>

    <view v-else class="travel-list">
      <view v-for="item in travelList" :key="item.id" class="travel-card dd-card" @tap="openDetail(item.id)">
        <view class="travel-top">
          <view class="travel-top-main">
            <view class="tag-row">
              <text class="type-tag" :class="item.travelType">{{ travelTypeLabel(item.travelType) }}</text>
              <text v-if="item.status !== 'active'" class="status-tag">{{ travelStatusLabel(item.status) }}</text>
            </view>
            <text class="travel-name">{{ item.spot.name }}</text>
            <text class="travel-meta">发布人 {{ item.user.username }}</text>
          </view>
          <text class="join-count">{{ seatText(item) }}</text>
        </view>

        <view class="travel-grid">
          <view class="travel-grid-item">
            <text class="travel-grid-label">出发时间</text>
            <text class="travel-grid-value">{{ formatDate(item.departAt) }}</text>
          </view>
          <view class="travel-grid-item">
            <text class="travel-grid-label">出发地</text>
            <text class="travel-grid-value">{{ item.departurePlace || '未填写' }}</text>
          </view>
          <view class="travel-grid-item">
            <text class="travel-grid-label">有效期至</text>
            <text class="travel-grid-value">{{ formatDate(item.expiresAt) }}</text>
          </view>
        </view>

        <text v-if="item.description" class="travel-desc">{{ item.description }}</text>
        <view class="travel-bottom">
          <text class="travel-bottom-text">{{ bottomHint(item) }}</text>
          <text class="travel-bottom-link">查看详情</text>
        </view>
      </view>
    </view>

    <view v-if="detailVisible && currentDetail" class="sheet-mask" @tap="closeDetail">
      <view class="detail-sheet dd-card" @tap.stop>
        <view class="detail-head">
          <view>
            <text class="detail-title">{{ currentDetail.spot.name }}</text>
            <text class="detail-sub">{{ travelTypeLabel(currentDetail.travelType) }} · {{ formatDate(currentDetail.departAt) }}</text>
          </view>
          <button class="detail-close" @tap="closeDetail">关闭</button>
        </view>

        <view class="detail-block">
          <text class="detail-label">发布人</text>
          <text class="detail-value">{{ currentDetail.user.username }}</text>
        </view>
        <view class="detail-block">
          <text class="detail-label">出发地</text>
          <text class="detail-value">{{ currentDetail.departurePlace || '未填写' }}</text>
        </view>
        <view class="detail-block">
          <text class="detail-label">有效期至</text>
          <text class="detail-value">{{ formatDate(currentDetail.expiresAt) }}</text>
        </view>
        <view class="detail-block">
          <text class="detail-label">说明</text>
          <text class="detail-value">{{ currentDetail.description || '发布人还没补充说明' }}</text>
        </view>
        <view v-if="currentDetail.travelType === 'carpool'" class="detail-block">
          <text class="detail-label">座位情况</text>
          <text class="detail-value">共 {{ currentDetail.seatTotal || 0 }} 座，剩余 {{ currentDetail.seatAvailable || 0 }} 座</text>
        </view>
        <view class="detail-block">
          <text class="detail-label">联系方式</text>
          <text class="detail-value">{{ currentDetail.contact || currentDetail.contactMasked }}</text>
        </view>
        <view class="detail-block">
          <text class="detail-label">已加入</text>
          <text class="detail-value">{{ currentDetail.memberCount }} 人</text>
          <view v-if="currentDetail.members?.length" class="member-list">
            <text v-for="member in currentDetail.members" :key="member.id" class="member-chip">{{ member.username }}</text>
          </view>
        </view>

        <view class="detail-actions">
          <button v-if="canJoin(currentDetail)" class="dd-primary-btn" @tap="joinTravel(currentDetail.id)">申请加入</button>
          <!-- #ifdef MP-WEIXIN -->
          <button class="dd-secondary-btn" open-type="share">分享行程</button>
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <button class="dd-secondary-btn" @tap="shareTravel(currentDetail)">分享行程</button>
          <!-- #endif -->
          <button v-if="currentDetail.isOwner" class="dd-secondary-btn" @tap="editTravel(currentDetail)">编辑</button>
          <button v-if="currentDetail.isOwner" class="dd-secondary-btn" @tap="closeTravel(currentDetail.id)">关闭</button>
          <button v-if="currentDetail.isOwner" class="dd-secondary-btn danger-btn" @tap="deleteTravel(currentDetail.id)">删除</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { onShareAppMessage, onShow } from '@dcloudio/uni-app';
import type { SpotItem } from '@/api/spots';
import { travelApi, type TravelPostItem, type TravelType } from '@/api/travel';
import { useAuthStore } from '@/stores/auth';
import { useTripStore } from '@/stores/trip';
import { shareCopy, sharePath, travelShareTitle } from '@/utils/fish';

const auth = useAuthStore();
const trip = useTripStore();

const filterOptions = [
  { label: '全部', value: 'all' as const },
  { label: '结伴', value: 'companion' as const },
  { label: '找车', value: 'find_car' as const },
  { label: '拼车', value: 'carpool' as const },
];
const typeOptions = [
  { label: '结伴', value: 'companion' as TravelType },
  { label: '找车', value: 'find_car' as TravelType },
  { label: '拼车', value: 'carpool' as TravelType },
];

const activeFilter = ref<'all' | TravelType>('all');
const scopeFilter = ref<'all' | 'mine'>('all');
const loading = ref(false);
const publishing = ref(false);
const showPublish = ref(false);
const travelList = ref<TravelPostItem[]>([]);
const currentDetail = ref<TravelPostItem | null>(null);
const detailVisible = ref(false);
const editingId = ref<number | null>(null);

const form = reactive({
  travelType: 'companion' as TravelType,
  departDate: '',
  departTime: '',
  departurePlace: '',
  seatTotal: '',
  description: '',
  contact: '',
});

const selectedSpot = computed(() => trip.items[0] || null);
const departAtValue = computed(() => (
  form.departDate && form.departTime ? `${form.departDate} ${form.departTime}` : ''
));
const expiresPreview = computed(() => {
  if (!departAtValue.value) return '';
  const date = new Date(departAtValue.value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + 3);
  return formatDate(formatLocalDateTime(date));
});

function formatLocalDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDate(value: string) {
  return value ? value.replace('T', ' ').slice(0, 16) : '--';
}

function locationText(spot: Partial<SpotItem>) {
  const parts = [spot.province, spot.city, spot.district, spot.address]
    .map(item => item?.trim())
    .filter(Boolean);
  return parts.length ? Array.from(new Set(parts)).join('') : '未填写位置';
}

function travelTypeLabel(value: 'all' | TravelType) {
  if (value === 'find_car') return '找车';
  if (value === 'carpool') return '拼车';
  if (value === 'companion') return '结伴';
  return '全部行程';
}

function travelStatusLabel(value: string) {
  if (value === 'closed') return '已结束';
  if (value === 'admin_removed') return '已下架';
  if (value === 'deleted') return '已删除';
  return '进行中';
}

function bottomHint(item: TravelPostItem) {
  if (item.travelType === 'carpool') return '查看详情可见联系方式和剩余座位';
  if (item.travelType === 'find_car') return '查看详情可见联系方式和找车说明';
  return '查看详情可见联系方式';
}

function seatText(item: TravelPostItem) {
  if (item.travelType === 'carpool') return item.seatAvailable == null ? '拼车' : `余${item.seatAvailable}座`;
  if (item.travelType === 'find_car') return '找车中';
  return `${item.memberCount}人加入`;
}

function goTripTab() {
  uni.switchTab({ url: '/pages/tools/tools' });
}

function togglePublish() {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  showPublish.value = !showPublish.value;
}

function switchFilter(value: 'all' | TravelType) {
  activeFilter.value = value;
  loadTravelList();
}

function switchScope(value: 'all' | 'mine') {
  if (value === 'mine' && !auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  scopeFilter.value = value;
  loadTravelList();
}

function onDepartDateChange(event: any) {
  form.departDate = String(event.detail?.value || '');
}

function onDepartTimeChange(event: any) {
  form.departTime = String(event.detail?.value || '');
}

function resetForm() {
  editingId.value = null;
  form.travelType = 'companion';
  form.departDate = '';
  form.departTime = '';
  form.departurePlace = '';
  form.seatTotal = '';
  form.description = '';
  form.contact = '';
}

async function loadTravelList() {
  loading.value = true;
  try {
    const res = await travelApi.list({
      type: activeFilter.value,
      page: '1',
      pageSize: '20',
      mine: scopeFilter.value === 'mine' ? 'true' : '',
    });
    travelList.value = res.data?.items || [];
  } catch (error: any) {
    uni.showToast({ title: error?.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function submitTravel() {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  if (!selectedSpot.value?.id) {
    uni.showToast({ title: '请先在出行里加入钓点', icon: 'none' });
    return;
  }
  if (!departAtValue.value) {
    uni.showToast({ title: '请选择出行时间', icon: 'none' });
    return;
  }
  if (!form.departurePlace.trim()) {
    uni.showToast({ title: '请填写出发地', icon: 'none' });
    return;
  }
  if (form.travelType === 'carpool') {
    const seats = Number(form.seatTotal);
    if (!Number.isFinite(seats) || seats < 1) {
      uni.showToast({ title: '请填写有效座位数', icon: 'none' });
      return;
    }
  }
  if (!form.contact.trim()) {
    uni.showToast({ title: '请填写联系方式', icon: 'none' });
    return;
  }

  publishing.value = true;
  try {
    const payload = {
      travelType: form.travelType,
      departAt: departAtValue.value,
      spotId: selectedSpot.value.id,
      departurePlace: form.departurePlace.trim(),
      seatTotal: form.travelType === 'carpool' ? Number(form.seatTotal) : null,
      description: form.description.trim(),
      contact: form.contact.trim(),
    };
    if (editingId.value) {
      await travelApi.update(editingId.value, payload);
      uni.showToast({ title: '修改成功', icon: 'none' });
    } else {
      await travelApi.create(payload);
      uni.showToast({ title: '发布成功', icon: 'none' });
    }
    showPublish.value = false;
    resetForm();
    scopeFilter.value = 'mine';
    await loadTravelList();
  } catch (error: any) {
    uni.showToast({ title: error?.message || '提交失败', icon: 'none' });
  } finally {
    publishing.value = false;
  }
}

async function openDetail(id: number) {
  try {
    const res = await travelApi.detail(id);
    currentDetail.value = res.data || null;
    detailVisible.value = !!currentDetail.value;
  } catch (error: any) {
    uni.showToast({ title: error?.message || '详情加载失败', icon: 'none' });
  }
}

function closeDetail() {
  detailVisible.value = false;
}

function editTravel(item: TravelPostItem) {
  showPublish.value = true;
  editingId.value = item.id;
  form.travelType = item.travelType;
  const [date = '', time = ''] = item.departAt.split(' ');
  form.departDate = date;
  form.departTime = time.slice(0, 5);
  form.departurePlace = item.departurePlace || '';
  form.seatTotal = item.seatTotal != null ? String(item.seatTotal) : '';
  form.description = item.description || '';
  form.contact = item.contact || '';
  detailVisible.value = false;
}

async function closeTravel(id: number) {
  try {
    await travelApi.close(id);
    uni.showToast({ title: '已结束', icon: 'none' });
    detailVisible.value = false;
    await loadTravelList();
  } catch (error: any) {
    uni.showToast({ title: error?.message || '关闭失败', icon: 'none' });
  }
}

async function deleteTravel(id: number) {
  try {
    await travelApi.delete(id);
    uni.showToast({ title: '已删除', icon: 'none' });
    detailVisible.value = false;
    await loadTravelList();
  } catch (error: any) {
    uni.showToast({ title: error?.message || '删除失败', icon: 'none' });
  }
}

function canJoin(item: TravelPostItem) {
  const hasSeat = item.seatAvailable == null || item.seatAvailable > 0;
  return auth.isLoggedIn && !item.isOwner && !item.joined && item.status === 'active' && hasSeat;
}

async function joinTravel(id: number) {
  try {
    const res = await travelApi.join(id);
    currentDetail.value = res.data || null;
    uni.showToast({ title: '已申请加入', icon: 'none' });
    await loadTravelList();
  } catch (error: any) {
    uni.showToast({ title: error?.message || '加入失败', icon: 'none' });
  }
}

function copyText(text: string, successText: string) {
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: successText, icon: 'none' }),
  });
}

function getShareLink(item: TravelPostItem) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${item.shareUrl}`;
}

function shareTravel(item: TravelPostItem) {
  const shareLink = getShareLink(item);
  // #ifdef H5
  copyText(shareLink, '分享链接已复制');
  return;
  // #endif

  // #ifndef H5
  copyText(shareLink || item.sharePath, '分享信息已复制');
  // #endif
}

onShareAppMessage(() => {
  if (!currentDetail.value) {
    return {
      title: shareCopy.travelHallTitle,
      path: sharePath.travel,
    };
  }
  return {
    title: travelShareTitle(currentDetail.value),
    path: currentDetail.value.sharePath,
  };
});

onMounted(() => {
  trip.load();
  loadTravelList();
});

onShow(() => {
  trip.load();
  loadTravelList();
});
</script>

<style scoped>
.travel-page {
  --travel-ink: #222222;
  --travel-muted: #6A6A6A;
  --travel-muted-soft: #929292;
  --travel-accent: #FF385C;
  --travel-accent-soft: #FFF1F4;
  --travel-line: #EBEBEB;
  --travel-shadow: rgba(34, 34, 34, 0.08);
  max-width: 760px;
  padding-top: 16px;
  padding-bottom: 32px;
  background:
    radial-gradient(circle at 14% -8%, rgba(255, 56, 92, 0.08), transparent 24%),
    radial-gradient(circle at 86% 6%, rgba(255, 195, 167, 0.12), transparent 24%),
    linear-gradient(180deg, #FFFFFF 0%, #FCFCFC 44%, #F7F7F7 100%);
}
.travel-top {
  display: block;
}
.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 18px;
  border-radius: 30px;
  border: 1px solid var(--travel-line);
  background:
    radial-gradient(circle at top right, rgba(255, 56, 92, 0.10), transparent 28%),
    linear-gradient(180deg, rgba(255,255,255,0.99), rgba(255,247,249,0.96));
  box-shadow: 0 18px 34px var(--travel-shadow);
}
.hero-main {
  flex: 1;
  min-width: 0;
}
.hero-kicker {
  display: block;
  color: var(--travel-muted-soft);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.05em;
}
.hero-title {
  display: block;
  margin-top: 6px;
  color: var(--travel-ink);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}
.hero-sub {
  display: block;
  margin-top: 10px;
  color: var(--travel-muted);
  font-size: 13px;
  line-height: 1.5;
}
.hero-action {
  flex: none;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  background: var(--travel-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 14px 24px rgba(255, 56, 92, 0.18);
}
.scope-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.scope-chip {
  min-height: 42px;
  border-radius: 999px;
  background: rgba(255,255,255,0.96);
  border: 1px solid var(--travel-line);
  color: var(--travel-muted);
  font-size: 12px;
  font-weight: 700;
}
.scope-chip.active {
  background: var(--travel-accent);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 14px 24px rgba(255, 56, 92, 0.18);
}
.filter-row {
  width: 100%;
  margin-top: 10px;
  white-space: nowrap;
}
.filter-row-inner {
  display: inline-flex;
  gap: 8px;
  padding-right: 4px;
}
.publish-card {
  margin-top: 14px;
  padding: 18px;
  border-radius: 28px;
  border: 1px solid var(--travel-line);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(250,250,250,0.96) 100%),
    radial-gradient(circle at top right, rgba(255, 56, 92, 0.08), transparent 38%);
  box-shadow: 0 16px 30px rgba(34, 34, 34, 0.06);
}
.publish-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.publish-title {
  display: block;
  color: var(--travel-ink);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.15;
}
.publish-sub {
  display: block;
  margin-top: 6px;
  color: var(--travel-muted);
  font-size: 12px;
  line-height: 1.5;
}
.publish-notice {
  margin-top: 14px;
  padding: 14px;
  border-radius: 20px;
  border: 1px dashed rgba(255, 56, 92, 0.24);
  background: rgba(255,247,249,0.88);
}
.publish-notice-title {
  display: block;
  color: var(--travel-ink);
  font-size: 15px;
  font-weight: 700;
}
.publish-notice-desc {
  display: block;
  margin-top: 6px;
  color: var(--travel-muted);
  font-size: 12px;
  line-height: 1.55;
}
.publish-notice-btn {
  margin-top: 12px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--travel-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}
.field + .field {
  margin-top: 12px;
}
.type-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.time-picker-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.picker-box {
  min-height: 52px;
  padding: 10px 12px;
  border-radius: 18px;
  border: 1px solid var(--travel-line);
  background: rgba(255,255,255,0.96);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
}
.picker-label {
  display: block;
  color: var(--travel-muted);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}
.picker-value {
  display: block;
  color: var(--travel-ink);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.25;
}
.field-tip {
  display: block;
  margin-top: 6px;
  color: var(--travel-muted);
  font-size: 11px;
  line-height: 1.5;
}
.spot-box {
  padding: 12px;
  border-radius: 18px;
  border: 1px solid var(--travel-line);
  background: rgba(255,255,255,0.96);
}
.spot-box-title {
  display: block;
  color: var(--travel-ink);
  font-size: 14px;
  font-weight: 700;
}
.spot-box-desc {
  display: block;
  margin-top: 4px;
  color: var(--travel-muted);
  font-size: 12px;
  line-height: 1.5;
}
.dd-textarea {
  width: 100%;
  min-height: 92px;
  padding: 12px;
  border: 1px solid var(--travel-line);
  border-radius: 20px;
  background: rgba(255,255,255,0.96);
  color: var(--travel-ink);
  font-size: 14px;
}
.publish-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
}
.travel-list {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}
.travel-card {
  position: relative;
  overflow: hidden;
  padding: 18px;
  border-radius: 28px;
  border: 1px solid var(--travel-line);
  background: linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(250,250,250,0.96) 100%);
  box-shadow: 0 16px 30px rgba(34, 34, 34, 0.06);
}
.travel-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 14px;
  bottom: 14px;
  width: 4px;
  border-radius: 0 999px 999px 0;
  background: linear-gradient(180deg, #FF385C 0%, #FF6B6B 100%);
}
.travel-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.travel-top-main {
  flex: 1;
  min-width: 0;
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.type-tag,
.status-tag {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
}
.type-tag {
  background: var(--travel-accent-soft);
  color: var(--travel-accent);
}
.type-tag.find_car {
  background: rgba(255, 247, 237, 0.98);
  color: #EA580C;
}
.type-tag.carpool {
  background: rgba(239, 246, 255, 0.98);
  color: #2563EB;
}
.status-tag {
  background: rgba(245, 158, 11, 0.12);
  color: #B45309;
}
.travel-name {
  display: block;
  margin-top: 8px;
  color: var(--travel-ink);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.25;
}
.travel-meta,
.travel-desc,
.travel-bottom-text {
  color: var(--travel-muted);
  font-size: 12px;
  line-height: 1.5;
}
.travel-meta {
  display: block;
  margin-top: 6px;
}
.join-count {
  flex: none;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--travel-accent-soft);
  color: var(--travel-accent);
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.travel-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.travel-grid-item {
  padding: 10px 10px 9px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,250,250,0.96) 100%);
  border: 1px solid var(--travel-line);
}
.travel-grid-label {
  display: block;
  color: var(--travel-muted);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
}
.travel-grid-value {
  display: block;
  margin-top: 6px;
  color: var(--travel-ink);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
}
.travel-desc {
  display: block;
  margin-top: 10px;
  color: var(--travel-muted);
}
.travel-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(255, 56, 92, 0.18);
}
.travel-bottom-link {
  color: var(--travel-accent);
  font-size: 12px;
  font-weight: 700;
}
.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 18px 12px;
  background: rgba(34, 34, 34, 0.24);
}
.detail-sheet {
  width: 100%;
  max-width: 640px;
  max-height: 84vh;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 18px;
  border: 1px solid var(--travel-line);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(250,250,250,0.98) 100%);
}
.detail-head {
  grid-column: 1 / -1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--travel-line);
}
.detail-title {
  display: block;
  margin-top: 2px;
  color: var(--travel-ink);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}
.detail-sub {
  display: block;
  margin-top: 6px;
  color: var(--travel-muted);
  font-size: 13px;
  line-height: 1.45;
}
.detail-close {
  flex: none;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--travel-line);
  background: rgba(255,255,255,0.96);
  color: var(--travel-ink);
  font-size: 12px;
  font-weight: 700;
}
.detail-block {
  margin-top: 0;
  padding: 13px 14px;
  border: 1px solid var(--travel-line);
  border-radius: 18px;
  background: rgba(255,255,255,0.96);
  box-shadow: 0 10px 20px rgba(34, 34, 34, 0.04);
}
.detail-sheet > .detail-block:nth-child(5),
.detail-sheet > .detail-block:last-of-type {
  grid-column: 1 / -1;
}
.detail-label {
  display: block;
  color: var(--travel-muted);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.detail-value {
  display: block;
  margin-top: 6px;
  color: var(--travel-ink);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.55;
  word-break: break-word;
}
.member-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.member-chip {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--travel-accent-soft);
  color: var(--travel-accent);
  font-size: 12px;
  font-weight: 700;
}
.detail-actions {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--travel-line);
}
.detail-actions > button:only-child {
  grid-column: 1 / -1;
}
@media (max-width: 430px) {
  .travel-page {
    padding-left: 10px;
    padding-right: 10px;
  }
  .travel-top,
  .travel-bottom {
    display: block;
  }
  .hero {
    display: block;
  }
  .hero-action,
  .join-count {
    margin-top: 10px;
  }
  .publish-actions,
  .travel-grid,
  .time-picker-grid,
  .detail-sheet,
  .detail-actions {
    grid-template-columns: 1fr;
  }
  .scope-switch {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .detail-sheet {
    padding: 14px;
  }
  .detail-title {
    font-size: 20px;
  }
  .detail-close {
    min-height: 34px;
    padding: 0 12px;
  }
}
</style>
