<template>
  <view class="spot-page dd-page">
    <view v-if="loading" class="state-card dd-card">
      <text class="state-title">正在加载标点详情</text>
      <text class="state-desc">请稍等一下。</text>
    </view>

    <view v-else-if="errorMessage" class="state-card dd-card">
      <text class="state-title">详情加载失败</text>
      <text class="state-desc">{{ errorMessage }}</text>
      <button class="state-btn dd-primary-btn" @tap="reloadSpot">重新加载</button>
    </view>

    <view v-else-if="spot">
      <view class="spot-hero dd-card">
        <view class="spot-head">
          <view class="spot-title-wrap">
            <text class="spot-name">{{ spot.name }}</text>
            <view class="spot-meta">
              <StyleTag :kind="spot.style" />
              <text>{{ spot.species || '未填鱼种' }}</text>
            </view>
          </view>
          <view :class="['score-badge', tone]">
            <text class="score-num">{{ spot.score }}</text>
            <text class="score-text">可信</text>
          </view>
        </view>
        <view v-if="spot.tags?.length" class="tag-list">
          <text v-for="tag in spot.tags" :key="tag" class="spot-tag">{{ tag }}</text>
        </view>
        <scroll-view v-if="spot.photoUrls?.length" class="photo-strip" scroll-x>
          <view class="photo-strip-inner">
            <image
              v-for="(url, index) in spot.photoUrls"
              :key="`${url}-${index}`"
              class="spot-photo"
              :src="normalizePhotoUrl(url)"
              mode="aspectFill"
              @tap="previewSpotPhotos(index)"
            />
          </view>
        </scroll-view>
        <text v-if="spot.address" class="address-line">{{ spot.address }}</text>
        <text v-if="spot.note" class="spot-note">{{ spot.note }}</text>
        <view v-if="hasLocation" class="nav-strip" @tap="openNavigation">
          <text class="nav-mark" />
          <view class="nav-copy">
            <text class="nav-title">导航到标点</text>
            <text class="nav-desc">{{ navLocationText }}</text>
          </view>
          <text class="nav-arrow">›</text>
        </view>
        <view v-if="hasAnySourceLink" class="links-panel">
          <view class="links-head">
            <view class="links-heading">
              <text class="links-title">找点线索</text>
              <text v-if="communityLinks.length" class="links-count">{{ communityLinks.length }}条</text>
            </view>
            <button class="links-add-btn" @tap="toggleLinkComposer">
              {{ linkComposerOpen ? '收起' : '补充' }}
            </button>
          </view>

          <view v-if="visibleCommunityLinks.length" class="links-list">
            <view
              v-for="item in visibleCommunityLinks"
              :key="item.id"
              class="link-row"
              @tap="openAnySourceLink(item.url)"
            >
              <view class="link-row-body">
                <view class="link-row-meta">
                  <text class="link-source">{{ platformLabel(item.platform) }}</text>
                  <text class="link-user">{{ item.user?.username || '钓友补充' }}</text>
                  <text class="link-action">{{ linkActionText }}</text>
                </view>
                <text class="link-url">{{ item.url }}</text>
              </view>
              <button
                v-if="canDeleteLink(item)"
                class="link-delete"
                @tap.stop="removeCommunityLink(item.id)"
              >删除</button>
            </view>
            <button v-if="hiddenLinkCount > 0" class="link-more-btn" @tap="toggleLinkListExpanded">
              {{ linkListExpanded ? '收起线索' : `展开 ${hiddenLinkCount} 条` }}
            </button>
          </view>

          <view v-else class="links-empty">
            <text>还没有人补充线索。</text>
          </view>

          <view v-if="linkComposerOpen" class="link-composer">
            <text class="link-composer-hint">可以粘贴平台链接，也可以补充现场图片。</text>
            <input class="dd-input link-input" v-model="linkDraft.url" placeholder="粘贴（抖音、小红书、视频号）链接" />
            <view class="link-photo-block">
              <view class="link-photo-head">
                <text class="link-photo-title">标点图片</text>
                <text class="link-photo-count">{{ linkPhotoUrls.length }}/9</text>
              </view>
              <view v-if="linkPhotoUrls.length" class="link-photo-grid">
                <view v-for="(url, index) in linkPhotoUrls" :key="`${url}-${index}`" class="link-photo-item">
                  <image class="link-photo-img" :src="url" mode="aspectFill" @tap="previewLinkPhotos(index)" />
                  <button class="link-photo-remove" @tap.stop="removeLinkPhoto(index)">×</button>
                </view>
                <button
                  v-if="linkPhotoUrls.length < 9"
                  class="link-photo-add compact"
                  :disabled="uploadingLinkPhoto"
                  @tap="pickLinkPhotos"
                >{{ uploadingLinkPhoto ? '上传中' : '+ 图片' }}</button>
              </view>
              <button
                v-else
                class="link-photo-add"
                :disabled="uploadingLinkPhoto"
                @tap="pickLinkPhotos"
              >{{ uploadingLinkPhoto ? '图片上传中...' : '上传标点图片' }}</button>
            </view>
            <button class="dd-primary-btn link-submit-btn" :disabled="submittingLink" @tap="submitCommunityLink">
              {{ submittingLink ? '提交中…' : '提交补充线索' }}
            </button>
          </view>
        </view>
      </view>

      <view class="risk-card dd-card" :class="riskTone">
        <text class="risk-title">{{ riskTitle }}</text>
        <text class="risk-desc">{{ riskDesc }}</text>
      </view>

      <view class="emergency-card dd-card">
        <view class="emergency-head">
          <view class="emergency-copy">
            <text class="emergency-kicker">安全求助</text>
            <text class="emergency-title">一键报警与当地渔政电话</text>
            <text class="emergency-desc">{{ fisheryRegionText }}附近遇到纠纷、危险或违法捕捞线索时，可直接拨打。</text>
          </view>
          <button class="alarm-btn" @tap="callPolice">110</button>
        </view>
        <view class="contact-list">
          <view v-for="item in fisheryContacts" :key="item.id" class="contact-row">
            <view class="contact-main">
              <view class="contact-title-line">
                <text class="contact-title">{{ item.label }}</text>
                <text :class="['contact-scope', { urgent: item.urgent }]">{{ item.scope }}</text>
              </view>
              <text class="contact-desc">{{ item.description }}</text>
            </view>
            <button class="contact-call" @tap="callPhone(item.phone)">{{ item.phone }}</button>
          </view>
        </view>
      </view>

      <view v-if="editing && isOwner" class="edit-card dd-card">
        <view class="edit-head">
          <text class="edit-title">编辑标点资料</text>
          <button class="edit-close" @tap="cancelEdit">取消</button>
        </view>

        <view class="edit-field">
          <text class="info-label">标点名称</text>
          <input class="dd-input" v-model="editDraft.name" placeholder="标点名称" />
        </view>

        <view class="edit-field">
          <text class="info-label">钓法</text>
          <view class="edit-segment">
            <button
              v-for="item in styleOptions"
              :key="item"
              :class="['edit-segment-btn', { active: editDraft.styles.includes(item) }]"
              @tap="toggleEditStyle(item)"
            >{{ item }}</button>
          </view>
        </view>

        <view class="edit-field">
          <text class="info-label">鱼种</text>
          <view v-if="editDraft.species.length" class="edit-tag-list">
            <view v-for="fish in editDraft.species" :key="fish" class="edit-tag">
              <text>{{ fish }}</text>
              <button class="edit-tag-remove" @tap.stop="removeEditSpecies(fish)">×</button>
            </view>
          </view>
          <view class="edit-tag-row">
            <input class="dd-input edit-tag-input" v-model="editSpeciesKeyword" placeholder="例如：马口、翘嘴" @confirm="addEditSpecies()" />
            <button class="edit-tag-add" @tap="addEditSpecies()">添加</button>
          </view>
          <view class="edit-tag-presets">
            <button
              v-for="fish in editFishOptions"
              :key="fish"
              :class="['edit-tag-preset', { active: editDraft.species.includes(fish) }]"
              @tap="toggleEditSpecies(fish)"
            >{{ fish }}</button>
          </view>
        </view>

        <view class="edit-field">
          <text class="info-label">标签</text>
          <view v-if="editDraft.tags.length" class="edit-tag-list">
            <view v-for="tag in editDraft.tags" :key="tag" class="edit-tag">
              <text>{{ tag }}</text>
              <button class="edit-tag-remove" @tap.stop="removeEditTag(tag)">×</button>
            </view>
          </view>
          <view class="edit-tag-row">
            <input class="dd-input edit-tag-input" v-model="editTagKeyword" placeholder="例如：好停车、不收费" @confirm="addEditTag()" />
            <button class="edit-tag-add" @tap="addEditTag()">添加</button>
          </view>
          <view class="edit-tag-presets">
            <button
              v-for="tag in tagPresets"
              :key="tag"
              :class="['edit-tag-preset', { active: editDraft.tags.includes(tag) }]"
              @tap="toggleEditTag(tag)"
            >{{ tag }}</button>
          </view>
        </view>

        <view class="edit-field">
          <text class="info-label">地址备注</text>
          <input class="dd-input" v-model="editDraft.address" placeholder="水域、桥名、岸线位置" />
        </view>
        <view class="edit-field">
          <text class="info-label">地图坐标</text>
          <view class="edit-coord-row">
            <text class="edit-coord-text">{{ editDraft.latitude ? `${editDraft.latitude.toFixed(5)}, ${editDraft.longitude?.toFixed(5)}` : '未设置' }}</text>
            <button class="edit-map-pick" @tap="pickEditLocation">{{ editDraft.latitude ? '重新选点' : '地图选点' }}</button>
          </view>
        </view>

        <view class="edit-field">
          <text class="info-label">备注</text>
          <textarea class="edit-textarea" v-model="editDraft.note" placeholder="鱼情、水情、停车位、禁钓提醒…" />
        </view>

        <view class="edit-field">
          <view class="info-row">
            <text class="info-label">图片（最多 9 张）</text>
            <text class="info-count">{{ editDraft.photoUrls.length }}/9</text>
          </view>
          <view class="edit-photo-grid">
            <view v-for="(url, index) in editDraft.photoUrls" :key="`${url}-${index}`" class="edit-photo-item">
              <image class="edit-photo-img" :src="normalizePhotoUrl(url)" mode="aspectFill" @tap="previewEditPhotos(index)" />
              <button class="edit-photo-remove" @tap.stop="removeEditPhoto(index)">×</button>
            </view>
            <button
              v-if="editDraft.photoUrls.length < 9"
              class="edit-photo-add"
              :disabled="uploadingPhoto"
              @tap="pickEditPhoto"
            >
              <text>{{ uploadingPhoto ? '上传中…' : '+ 添加图片' }}</text>
            </button>
          </view>
        </view>

        <view class="edit-field">
          <text class="info-label">分享设置</text>
          <view class="edit-share-options">
            <button
              v-for="option in shareOptions"
              :key="option.value"
              :class="['edit-share-option', { active: editDraft.shareMode === option.value }]"
              @tap="editDraft.shareMode = option.value"
            >
              <text>{{ option.label }}</text>
            </button>
          </view>
        </view>

        <view class="edit-actions">
          <button class="edit-cancel" @tap="cancelEdit">取消</button>
          <button class="edit-save dd-primary-btn" @tap="saveEdit" :disabled="savingEdit">
            {{ savingEdit ? '保存中' : '保存修改' }}
          </button>
        </view>
      </view>

      <view class="actions">
        <button class="action-btn verify dd-primary-btn" @tap="goVerify">去过一次，写验点</button>
        <button v-if="hasLocation" class="action-btn nav-action" @tap="openNavigation">导航</button>
        <!-- #ifdef MP-WEIXIN -->
        <button class="action-btn share-action" open-type="share">分享标点</button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <button class="action-btn share-action" @tap="copySpotShareLink">分享标点</button>
        <!-- #endif -->
        <button v-if="isOwner" class="action-btn edit-action" @tap="startEdit">
          {{ editing ? '正在编辑' : '编辑资料' }}
        </button>
        <button v-else class="action-btn favor" @tap="toggleFav">
          {{ isFav ? '已收藏' : '收藏标点' }}
        </button>
      </view>

      <view class="verify-section">
        <text class="section-title">最近验点（{{ verifications.length }}）</text>
        <view v-if="verifications.length">
          <view v-for="v in recentVerifications" :key="v.id" class="verify-item dd-card">
            <view class="verify-row">
              <text class="verify-feedback">{{ v.feedback }}</text>
              <text class="verify-user">{{ v.user?.username || '匿名' }}</text>
              <text class="verify-time">{{ formatTime(v.createdAt) }}</text>
            </view>
            <scroll-view v-if="v.photoUrls?.length" class="verify-photo-strip" scroll-x>
              <view class="verify-photo-inner">
                <image
                  v-for="(url, index) in v.photoUrls"
                  :key="`${url}-${index}`"
                  class="verify-photo"
                  :src="normalizePhotoUrl(url)"
                  mode="aspectFill"
                  @tap="previewVerificationPhotos(v.photoUrls || [], index)"
                />
              </view>
            </scroll-view>
          </view>
        </view>
        <view v-else class="empty-verify dd-card">
          <text>还没有验点记录，去过以后可以写一次反馈。</text>
        </view>
      </view>
    </view>

    <view v-else class="state-card dd-card">
      <text class="state-title">没有找到这个标点</text>
      <text class="state-desc">可能是链接缺少 ID，或者这个标点已经被删除。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { spotApi, favoriteApi, type SpotItem, type SpotLinkItem, type VerificationItem } from '@/api/spots';
import { uploadApi } from '@/api/upload';
import { useAuthStore } from '@/stores/auth';
import { fishOptionsByStyle } from '@/utils/fish';
import { normalizeTags, standardTags } from '@/utils/fish';
import { absoluteShareLink, spotSharePath, spotShareTitle } from '@/utils/fish';
import { buildFisheryRegionText, getFisheryContacts } from '@/utils/fishery-contacts';
import StyleTag from '@/components/StyleTag.vue';

const auth = useAuthStore();
const spot = ref<SpotItem | null>(null);
const verifications = ref<VerificationItem[]>([]);
const isFav = ref(false);
const loading = ref(true);
const errorMessage = ref('');
const currentId = ref(0);
const editing = ref(false);
const savingEdit = ref(false);
const uploadingPhoto = ref(false);
const linkComposerOpen = ref(false);
const submittingLink = ref(false);
const linkListExpanded = ref(false);
const styleOptions = ['路亚', '台钓'];
const tagPresets = standardTags;
const editSpeciesKeyword = ref('');
const editTagKeyword = ref('');
const linkDraft = ref({
  url: '',
});
const linkPhotoUrls = ref<string[]>([]);
const uploadingLinkPhoto = ref(false);
const linkPlatformLabelMap: Record<string, string> = {
  douyin: '视频线索',
  xiaohongshu: '图文线索',
  wechat_channels: '视频线索',
  external: '外部线索',
};
const linkPlatformOrder = ['douyin', 'xiaohongshu', 'wechat_channels', 'external'];
const defaultVisibleLinkCount = 2;
const linkActionText = '点击查看';
const shareOptions = [
  { value: 'private' as const, label: '私密' },
  { value: 'public' as const, label: '公开（审核后展示）' },
];
type ShareMode = 'private' | 'public';
interface EditDraft {
  name: string;
  styles: string[];
  species: string[];
  address: string;
  tags: string[];
  latitude: number | null;
  longitude: number | null;
  photoUrls: string[];
  note: string;
  shareMode: ShareMode;
}
const editDraft = ref<EditDraft>({
  name: '',
  styles: ['路亚'],
  species: [],
  address: '',
  tags: [],
  photoUrls: [],
  note: '',
  latitude: null,
  longitude: null,
  shareMode: 'private',
});

const tone = computed(() => {
  const s = spot.value?.score || 0;
  if (s >= 80) return 'hot';
  if (s >= 65) return 'warm';
  return 'cool';
});
const isOwner = computed(() => !!spot.value && !!auth.user?.id && spot.value.userId === auth.user.id);
const hasLocation = computed(() => !!spot.value
  && spot.value.latitude != null
  && spot.value.longitude != null
  && Number.isFinite(Number(spot.value.latitude))
  && Number.isFinite(Number(spot.value.longitude)));
const navLocationText = computed(() => {
  if (!spot.value) return '';
  const parts = [spot.value.province, spot.value.city, spot.value.district, spot.value.address]
    .map(item => item?.trim())
    .filter(Boolean);
  if (parts.length) return Array.from(new Set(parts)).join('');
  if (spot.value.name?.trim()) return `${spot.value.name.trim()}附近`;
  return '已记录位置，可直接导航';
});
const recentVerifications = computed(() => verifications.value.slice(0, 5));
const communityLinks = computed(() => spot.value?.spotLinks || []);
const hasAnySourceLink = computed(() => (
  communityLinks.value.length > 0
  || isOwner.value
  || auth.isLoggedIn
));
const visibleCommunityLinks = computed(() => (
  linkListExpanded.value
    ? communityLinks.value
    : communityLinks.value.slice(0, defaultVisibleLinkCount)
));
const hiddenLinkCount = computed(() => Math.max(0, communityLinks.value.length - defaultVisibleLinkCount));
const fisheryRegionText = computed(() => buildFisheryRegionText({
  province: spot.value?.province,
  city: spot.value?.city,
  district: spot.value?.district,
}));
const fisheryContacts = computed(() => getFisheryContacts({
  province: spot.value?.province,
  city: spot.value?.city,
  district: spot.value?.district,
}));
const editFishOptions = computed(() => {
  const opts: string[] = [];
  editDraft.value.styles.forEach(s => {
    const list = fishOptionsByStyle[s];
    if (list) opts.push(...list);
  });
  return Array.from(new Set(opts));
});
const riskStats = computed(() => {
  const risky = ['禁钓', '有人管', '位置不准', '挂底'];
  const positive = ['中鱼'];
  const recent = recentVerifications.value;
  return {
    riskCount: recent.filter(item => risky.includes(item.feedback)).length,
    positiveCount: recent.filter(item => positive.includes(item.feedback)).length,
    emptyCount: recent.filter(item => item.feedback === '空军').length,
  };
});
const riskTone = computed(() => {
  if (riskStats.value.riskCount > 0) return 'danger';
  if (riskStats.value.positiveCount > 0) return 'good';
  if (riskStats.value.emptyCount > 0) return 'plain';
  return 'quiet';
});
const riskTitle = computed(() => {
  if (riskStats.value.riskCount > 0) return '有风险反馈';
  if (riskStats.value.positiveCount > 0) return '近期有人中鱼';
  if (riskStats.value.emptyCount > 0) return '近期有人空军';
  return '等待钓友验点';
});
const riskDesc = computed(() => {
  if (riskStats.value.riskCount > 0) return '最近验点出现禁钓、有人管、位置不准或挂底反馈，出发前建议再确认。';
  if (riskStats.value.positiveCount > 0) return '最近验点有正向反馈，但鱼情会变化，仍建议结合天气和水位判断。';
  if (riskStats.value.emptyCount > 0) return '最近有人反馈未中鱼，可以作为参考，不代表这个点已经失效。';
  return '去过之后写一次验点，可以帮助自己复盘，也能提高标点池可信度。';
});

function formatTime(t: string) {
  return t?.slice(0, 10) || '';
}

function normalizePhotoUrl(url: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  return `${base}${url}`;
}

function previewSpotPhotos(index: number) {
  if (!spot.value?.photoUrls?.length) return;
  uni.previewImage({
    current: normalizePhotoUrl(spot.value.photoUrls[index]),
    urls: spot.value.photoUrls.map(normalizePhotoUrl),
  });
}

async function loadSpot(id: number) {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await spotApi.detail(id);
    if (!res.data) {
      throw new Error('后端没有返回标点数据');
    }
    spot.value = res.data;
    verifications.value = (res.data as any).verifications || [];
    if (editing.value) fillEditDraft(res.data);

    try {
      const vRes = await spotApi.verifications(id);
      if (vRes.data) verifications.value = vRes.data;
    } catch {
      // 验点记录加载失败不影响详情主体展示。
    }
  } catch (e: any) {
    spot.value = null;
    verifications.value = [];
    errorMessage.value = e?.message || '请检查后端服务是否启动，以及 /api 代理是否正常';
    uni.showToast({ title: '详情加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function reloadSpot() {
  if (!currentId.value) {
    errorMessage.value = '缺少标点 ID，无法重新加载';
    return;
  }
  loadSpot(currentId.value);
}

function previewVerificationPhotos(urls: string[], index: number) {
  if (!urls.length) return;
  const normalized = urls.map(normalizePhotoUrl);
  uni.previewImage({
    current: normalized[index],
    urls: normalized,
  });
}

function toggleLinkComposer() {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  linkComposerOpen.value = !linkComposerOpen.value;
}

function toggleLinkListExpanded() {
  linkListExpanded.value = !linkListExpanded.value;
}

onLoad((params) => {
  const id = Number(params?.id);
  currentId.value = id;
  if (!id) {
    loading.value = false;
    errorMessage.value = '缺少标点 ID，请从大厅或点库进入详情';
    return;
  }
  loadSpot(id);
});

function goVerify() {
  if (spot.value) {
    uni.navigateTo({ url: `/pages/verify/verify?spotId=${spot.value.id}` });
  }
}

function getSpotSharePath() {
  return spotSharePath(spot.value);
}

function getSpotShareTitle() {
  return spotShareTitle(spot.value);
}

function copySpotShareLink() {
  uni.setClipboardData({
    data: absoluteShareLink(getSpotSharePath()),
    success: () => uni.showToast({ title: '标点链接已复制', icon: 'none' }),
  });
}

function callPhone(phone: string) {
  const phoneNumber = String(phone || '').trim();
  if (!phoneNumber) return;
  uni.makePhoneCall({
    phoneNumber,
    fail: () => uni.showToast({ title: '当前环境无法拨号', icon: 'none' }),
  });
}

function callPolice() {
  callPhone('110');
}

onShareAppMessage(() => ({
  title: getSpotShareTitle(),
  path: getSpotSharePath(),
  imageUrl: spot.value?.photoUrls?.[0] ? normalizePhotoUrl(spot.value.photoUrls[0]) : undefined,
}));

function toggleEditStyle(s: string) {
  if (editDraft.value.styles.includes(s)) {
    if (editDraft.value.styles.length > 1) {
      editDraft.value.styles = editDraft.value.styles.filter(item => item !== s);
    }
  } else {
    editDraft.value.styles = [...editDraft.value.styles, s];
  }
}

function fillEditDraft(source: SpotItem) {
  editDraft.value = {
    name: source.name || '',
    styles: (source.style || '路亚').split(',').map(s => s.trim()).filter(Boolean),
    species: splitList(source.species),
    address: source.address || '',
    tags: source.tags || [],
    photoUrls: source.photoUrls || [],
    note: source.note || '',
    latitude: source.latitude != null ? Number(source.latitude) : null,
    longitude: source.longitude != null ? Number(source.longitude) : null,
    shareMode: source.isPublic ? 'public' : 'private',
  };
}

function splitList(value?: string) {
  return Array.from(new Set((value || '').split(/[、,，\s]+/).map(item => item.trim()).filter(Boolean)));
}

function startEdit() {
  if (!spot.value || !isOwner.value) return;
  const lat = spot.value.latitude, lng = spot.value.longitude;
  if (lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    uni.navigateTo({ url: `/pages/spot-edit/spot-edit?id=${spot.value.id}` });
  } else {
    uni.showToast({ title: '该标点暂无坐标，无法在地图上编辑', icon: 'none' });
  }
}

function cancelEdit() {
  editing.value = false;
}
async function pickEditLocation() {
  const currentLat = editDraft.value.latitude;
  const currentLng = editDraft.value.longitude;
  if (currentLat == null || currentLng == null) {
    uni.showToast({ title: '当前标点暂无坐标，无法在地图上重新选择', icon: 'none' });
    return;
  }
  uni.navigateTo({
    url: `/pages/map-picker/map-picker?lat=${currentLat}&lng=${currentLng}`,
    events: {
      confirm: (res: any) => {
        if (res.latitude != null && res.longitude != null) {
          editDraft.value.latitude = res.latitude;
          editDraft.value.longitude = res.longitude;
          if (res.address) editDraft.value.address = res.address;
        }
      },
    },
  });
}

function addEditSpecies(fish?: string) {
  const value = (fish || editSpeciesKeyword.value).trim().slice(0, 20);
  if (!value) return;
  if (!editDraft.value.species.includes(value)) {
    editDraft.value.species = [...editDraft.value.species, value].slice(0, 12);
  }
  editSpeciesKeyword.value = '';
}

function removeEditSpecies(fish: string) {
  editDraft.value.species = editDraft.value.species.filter(item => item !== fish);
}

function toggleEditSpecies(fish: string) {
  if (editDraft.value.species.includes(fish)) {
    removeEditSpecies(fish);
    return;
  }
  addEditSpecies(fish);
}

function addEditTag(tag?: string) {
  const value = (tag || editTagKeyword.value).trim().slice(0, 20);
  if (!value) return;
  if (!editDraft.value.tags.includes(value)) {
    editDraft.value.tags = [...editDraft.value.tags, value].slice(0, 12);
  }
  editTagKeyword.value = '';
}

function removeEditTag(tag: string) {
  editDraft.value.tags = editDraft.value.tags.filter(item => item !== tag);
}

function toggleEditTag(tag: string) {
  if (editDraft.value.tags.includes(tag)) {
    removeEditTag(tag);
    return;
  }
  addEditTag(tag);
}

function removeEditPhoto(index: number) {
  editDraft.value.photoUrls = editDraft.value.photoUrls.filter((_, i) => i !== index);
}

function previewEditPhotos(index: number) {
  if (!editDraft.value.photoUrls.length) return;
  uni.previewImage({
    current: normalizePhotoUrl(editDraft.value.photoUrls[index]),
    urls: editDraft.value.photoUrls.map(normalizePhotoUrl),
  });
}

function pickEditPhoto() {
  if (uploadingPhoto.value) return;
  uni.chooseImage({
    count: Math.max(1, 9 - editDraft.value.photoUrls.length),
    success: async (res) => {
      const files = (res.tempFilePaths || []).slice(0, 9 - editDraft.value.photoUrls.length);
      if (!files.length) return;
      uploadingPhoto.value = true;
      try {
        const uploaded: string[] = [];
        for (const filePath of files) {
          const up = await uploadApi.image(filePath);
          if (up.data?.url) uploaded.push(up.data.url);
        }
        editDraft.value.photoUrls = [...editDraft.value.photoUrls, ...uploaded].slice(0, 9);
      } catch (e: any) {
        uni.showToast({ title: e?.message || '图片上传失败', icon: 'none' });
      } finally {
        uploadingPhoto.value = false;
      }
    },
  });
}

async function saveEdit() {
  if (!spot.value || savingEdit.value) return;
  if (!editDraft.value.name.trim()) {
    uni.showToast({ title: '标点名称不能为空', icon: 'none' });
    return;
  }
  savingEdit.value = true;
  try {
    const data: Record<string, unknown> = {
      name: editDraft.value.name.trim(),
      style: editDraft.value.styles.join(','),
      species: editDraft.value.species.join('、'),
      address: editDraft.value.address.trim(),
      tags: normalizeTags(editDraft.value.tags),
      photoUrls: editDraft.value.photoUrls,
      note: editDraft.value.note.trim(),
      accuracy: editDraft.value.shareMode,
      isPublic: editDraft.value.shareMode !== 'private',
      lure: '',
      action: '',
      bait: '',
        depth: '',
        latitude: editDraft.value.latitude,
        longitude: editDraft.value.longitude,
    };
    const res = await spotApi.update(spot.value.id, data);
    if (res.data) {
      spot.value = res.data;
      verifications.value = (res.data as any).verifications || verifications.value;
      fillEditDraft(res.data);
    }
    editing.value = false;
    uni.showToast({
      title: editDraft.value.shareMode === 'public'
        ? '修改已保存，公开内容需审核通过后展示'
        : '修改已保存',
      icon: 'success',
    });
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' });
  } finally {
    savingEdit.value = false;
  }
}

function openAnySourceLink(url: string) {
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  // H5 可以直接打开，小程序环境会复制链接，方便用户到对应 App 打开。
  // #ifdef H5
  window.open(normalized, '_blank');
  // #endif
  // #ifndef H5
  uni.setClipboardData({
    data: normalized,
    success: () => uni.showToast({ title: '链接已复制', icon: 'none' }),
  });
  // #endif
}

function pickLinkPhotos() {
  if (uploadingLinkPhoto.value || linkPhotoUrls.value.length >= 9) return;
  uni.chooseImage({
    count: Math.max(1, 9 - linkPhotoUrls.value.length),
    success: async (res) => {
      const files = (res.tempFilePaths || []).slice(0, 9 - linkPhotoUrls.value.length);
      if (!files.length) return;
      uploadingLinkPhoto.value = true;
      try {
        const uploaded: string[] = [];
        for (const filePath of files) {
          const up = await uploadApi.image(filePath);
          if (up.data?.url) uploaded.push(up.data.url);
        }
        linkPhotoUrls.value = [...linkPhotoUrls.value, ...uploaded].slice(0, 9);
      } catch (e: any) {
        uni.showToast({ title: e?.message || '图片上传失败', icon: 'none' });
      } finally {
        uploadingLinkPhoto.value = false;
      }
    },
  });
}

function removeLinkPhoto(index: number) {
  linkPhotoUrls.value = linkPhotoUrls.value.filter((_, idx) => idx !== index);
}

function previewLinkPhotos(index: number) {
  if (!linkPhotoUrls.value.length) return;
  uni.previewImage({
    current: linkPhotoUrls.value[index],
    urls: linkPhotoUrls.value,
  });
}

async function submitCommunityLink() {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  if (!spot.value || submittingLink.value) return;
  const nextUrl = linkDraft.value.url.trim();
  const nextPhotos = [...linkPhotoUrls.value];
  if (!nextUrl && !nextPhotos.length) {
    uni.showToast({ title: '请先粘贴链接或上传图片', icon: 'none' });
    return;
  }

  submittingLink.value = true;
  try {
    if (nextUrl) {
      const res = await spotApi.createLink(spot.value.id, {
        url: nextUrl,
      });
      if (res.data) {
        spot.value = {
          ...spot.value,
          spotLinks: [res.data, ...(spot.value.spotLinks || [])],
        };
      }
    }

    if (nextPhotos.length) {
      const res = await spotApi.addPhotos(spot.value.id, {
        photoUrls: nextPhotos,
      });
      if (res.data) {
        spot.value = {
          ...spot.value,
          photoUrls: res.data.photoUrls || spot.value.photoUrls || [],
        };
      }
    }

    if (spot.value) {
      spot.value = {
        ...spot.value,
      };
    }
    linkDraft.value = { url: '' };
    linkPhotoUrls.value = [];
    linkComposerOpen.value = false;
    uni.showToast({ title: '补充成功', icon: 'success' });
  } catch (e: any) {
    uni.showToast({ title: e?.message || '补充失败', icon: 'none' });
  } finally {
    submittingLink.value = false;
  }
}

async function removeCommunityLink(id: number) {
  if (!spot.value) return;
  try {
    await spotApi.deleteLink(id);
    spot.value = {
      ...spot.value,
      spotLinks: (spot.value.spotLinks || []).filter(item => item.id !== id),
    };
    uni.showToast({ title: '已删除', icon: 'none' });
  } catch (e: any) {
    uni.showToast({ title: e?.message || '删除失败', icon: 'none' });
  }
}

function canDeleteLink(item: SpotLinkItem) {
  return !!auth.user?.id && (auth.user.id === item.userId || auth.user.role === 'admin');
}

function platformLabel(platform: string) {
  return linkPlatformLabelMap[normalizeLinkPlatform(platform)] || '外部线索';
}

function normalizeLinkPlatform(platform?: string) {
  const value = String(platform || '').trim().toLowerCase();
  return linkPlatformLabelMap[value] ? value : 'external';
}

function orderedLinkPlatforms(platforms: string[]) {
  return platforms.sort((a, b) => {
    const ai = linkPlatformOrder.includes(a) ? linkPlatformOrder.indexOf(a) : linkPlatformOrder.length;
    const bi = linkPlatformOrder.includes(b) ? linkPlatformOrder.indexOf(b) : linkPlatformOrder.length;
    return ai === bi ? a.localeCompare(b) : ai - bi;
  });
}

function openNavigation() {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  if (!spot.value || !hasLocation.value) {
    uni.showToast({ title: '这个标点没有坐标', icon: 'none' });
    return;
  }
  uni.openLocation({
    latitude: Number(spot.value.latitude),
    longitude: Number(spot.value.longitude),
    name: spot.value.name,
    address: navLocationText.value,
    scale: 16,
    fail: () => {
      uni.showToast({ title: '当前环境无法打开导航', icon: 'none' });
    },
  });
}

async function toggleFav() {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  if (!spot.value) return;
  try {
    if (isFav.value) {
      await favoriteApi.remove(spot.value.id);
      isFav.value = false;
      uni.showToast({ title: '已取消收藏', icon: 'none' });
    } else {
      await favoriteApi.add(spot.value.id);
      isFav.value = true;
      uni.showToast({ title: '收藏成功', icon: 'success' });
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '收藏操作失败', icon: 'none' });
  }
}
</script>

<style scoped>
.spot-page { padding-bottom: 32px; }
.state-card { padding: 26px 20px; text-align: center; }
.state-title { display: block; color: #16324F; font-size: 18px; font-weight: 900; }
.state-desc { display: block; margin-top: 8px; color: #6C8198; font-size: 13px; line-height: 1.6; }
.state-btn { width: 100%; margin-top: 16px; }
.spot-hero {
  padding: 18px;
  border-radius: 30px;
  background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(242, 250, 252, 0.98) 100%);
  box-shadow: 0 20px 38px rgba(21, 94, 117, 0.10);
}
.spot-head { display: flex; justify-content: space-between; align-items: center; }
.spot-title-wrap { flex: 1; min-width: 0; padding-right: 16px; }
.spot-name { display: block; font-size: 24px; font-weight: 950; line-height: 1.2; color: #16324F; }
.score-badge { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 68px; height: 68px; border-radius: 24px; color: #fff; box-shadow: 0 16px 26px rgba(21, 94, 117, 0.14); }
.score-badge.hot { background: linear-gradient(135deg, #0F766E 0%, #0891B2 100%); }
.score-badge.warm { background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%); }
.score-badge.cool { background: linear-gradient(135deg, #0E7490 0%, #38BDF8 100%); }
.score-num { font-size: 20px; font-weight: 950; }
.score-text { margin-top: 3px; font-size: 10px; font-weight: 800; opacity: 0.9; }
.spot-meta { display: flex; gap: 8px; margin-top: 8px; align-items: center; font-size: 13px; line-height: 1.4; color: #6C8198; flex-wrap: wrap; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.spot-tag { display: inline-flex; align-items: center; min-height: 28px; padding: 0 10px; border-radius: 999px; background: rgba(8,145,178,0.12); color: #0E7490; font-size: 12px; line-height: 1.2; font-weight: 900; }
.photo-strip { width: 100%; margin-top: 10px; white-space: nowrap; }
.photo-strip-inner { display: inline-flex; gap: 8px; }
.spot-photo { width: 118px; height: 88px; border-radius: 18px; background: #F1F5EF; }
.address-line { display: block; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(180, 213, 228, 0.72); font-size: 13px; color: #6C8198; line-height: 1.5; }
.spot-note { display: block; margin-top: 10px; padding: 12px 14px; border-radius: 18px; background: rgba(238,248,251,0.98); font-size: 13px; line-height: 1.55; color: #16324F; }
.links-panel { margin-top: 10px; padding: 2px 0 0; border-top: 1px solid rgba(235, 235, 235, 0.96); }
.links-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 36px; }
.links-heading { display: flex; align-items: center; gap: 8px; min-width: 0; }
.links-title { color: #222222; font-size: 14px; font-weight: 900; line-height: 1.25; }
.links-count { flex: none; padding: 2px 7px; border-radius: 999px; background: #FFF1F4; color: #FF385C; font-size: 10px; font-weight: 900; line-height: 1.4; }
.links-add-btn { min-width: 52px; min-height: 30px; padding: 0 12px; border-radius: 999px; background: #FF385C; color: #fff; font-size: 12px; font-weight: 900; line-height: 30px; white-space: nowrap; box-shadow: 0 8px 16px rgba(255, 56, 92, 0.14); }
.links-list { margin-top: 2px; border-top: 1px solid #F1F1F1; }
.link-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #F1F1F1; }
.link-row:active { opacity: 0.72; }
.link-row-body { flex: 1; min-width: 0; }
.link-row-meta { display: flex; align-items: center; gap: 6px; min-width: 0; }
.link-source { flex: none; padding: 2px 7px; border-radius: 999px; background: #F7F7F7; color: #6A6A6A; font-size: 10px; font-weight: 900; line-height: 1.5; }
.link-user { min-width: 0; color: #6A6A6A; font-size: 11px; font-weight: 700; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.link-action { flex: none; color: #8A8A8A; font-size: 10px; font-weight: 700; line-height: 1.4; }
.link-url { display: block; margin-top: 4px; color: #FF385C; font-size: 12px; line-height: 1.45; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.link-delete { flex: none; min-height: 28px; padding: 0 10px; border-radius: 999px; background: rgba(239, 68, 68, 0.08); color: #DC2626; font-size: 11px; font-weight: 900; }
.link-more-btn { width: 100%; min-height: 32px; margin-top: 4px; border-radius: 12px; background: #FAFAFA; color: #6A6A6A; font-size: 12px; font-weight: 800; }
.links-empty { margin-top: 4px; padding: 10px 0 2px; color: #8A8A8A; font-size: 12px; line-height: 1.5; }
.source-strip { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 13px 12px; border-radius: 18px; background: linear-gradient(135deg, rgba(236,248,251,0.98) 0%, rgba(255,255,255,0.96) 100%); border: 1px solid rgba(155, 189, 210, 0.72); }
.source-strip.legacy { margin-top: 8px; }
.source-icon { position: relative; flex: none; width: 22px; height: 22px; border: 2px solid #0E7490; border-radius: 9px; }
.source-icon::after { content: ""; position: absolute; left: 7px; top: 4px; width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-left: 7px solid #0E7490; }
.source-copy { flex: 1; min-width: 0; }
.source-title { display: block; color: #16324F; font-size: 13px; line-height: 1.3; font-weight: 900; }
.source-url { display: block; margin-top: 3px; color: #0E7490; font-size: 11px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.source-arrow { color: #0E7490; font-size: 22px; font-weight: 900; }
.link-composer { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; padding: 10px 0 2px; border-top: 1px solid rgba(235, 235, 235, 0.96); }
.link-composer-hint { color: #6A6A6A; font-size: 12px; line-height: 1.45; }
.link-input { min-height: 50px; border-color: #EBEBEB; border-radius: 18px; background: rgba(255,255,255,0.98); }
.link-photo-block { padding: 10px; border-radius: 18px; border: 1px solid #F1F1F1; background: rgba(250,250,250,0.96); }
.link-photo-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.link-photo-title { color: #222222; font-size: 12px; font-weight: 900; line-height: 1.2; }
.link-photo-count { color: #8A8A8A; font-size: 11px; font-weight: 800; line-height: 1.2; }
.link-photo-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.link-photo-item { position: relative; aspect-ratio: 1; border-radius: 14px; overflow: hidden; background: #F1F5EF; }
.link-photo-img { width: 100%; height: 100%; }
.link-photo-remove { position: absolute; right: 5px; top: 5px; width: 20px; height: 20px; border-radius: 999px; background: rgba(0,0,0,0.56); color: #fff; font-size: 13px; font-weight: 900; line-height: 1; }
.link-photo-add { width: 100%; min-height: 68px; border-radius: 14px; border: 1px dashed rgba(255, 56, 92, 0.28); background: #FFF7F8; color: #FF385C; font-size: 12px; font-weight: 900; line-height: 1.2; }
.link-photo-add.compact { min-height: 74px; }
.link-photo-add[disabled] { opacity: 0.58; }
.link-submit-btn { width: 100%; }
.link-submit-btn[disabled] { opacity: 0.6; }
.nav-strip { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 13px 12px; border-radius: 18px; background: linear-gradient(135deg, rgba(236,248,251,0.98) 0%, rgba(255,255,255,0.98) 100%); border: 1px solid rgba(155, 189, 210, 0.72); }
.nav-mark { position: relative; flex: none; width: 22px; height: 22px; border: 2px solid #0E7490; border-radius: 50%; }
.nav-mark::after { content: ""; position: absolute; left: 7px; bottom: -7px; width: 4px; height: 10px; border-radius: 4px; background: #0E7490; transform: rotate(35deg); }
.nav-copy { flex: 1; min-width: 0; }
.nav-title { display: block; color: #16324F; font-size: 13px; font-weight: 900; }
.nav-desc { display: block; margin-top: 3px; color: #6C8198; font-size: 11px; }
.nav-arrow { color: #0E7490; font-size: 22px; font-weight: 900; }
.risk-card { margin-top: 14px; padding: 16px 14px; border-left-width: 4px; border-radius: 22px; }
.risk-card.danger { border-left-color: #DC2626; background: rgba(254, 242, 242, 0.98); }
.risk-card.good { border-left-color: #22C55E; background: rgba(240, 253, 244, 0.98); }
.risk-card.plain { border-left-color: #F59E0B; background: rgba(255, 251, 235, 0.98); }
.risk-card.quiet { border-left-color: #0E7490; background: rgba(236, 248, 251, 0.98); }
.risk-title { display: block; color: #16324F; font-size: 15px; line-height: 1.3; font-weight: 900; }
.risk-desc { display: block; margin-top: 6px; color: #6C8198; font-size: 13px; line-height: 1.55; }
.emergency-card { margin-top: 14px; padding: 16px; border-radius: 24px; border-color: rgba(220, 38, 38, 0.16); background: linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,247,247,0.98) 100%); box-shadow: 0 16px 30px rgba(220, 38, 38, 0.08); }
.emergency-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.emergency-copy { flex: 1; min-width: 0; }
.emergency-kicker { display: block; color: #DC2626; font-size: 11px; font-weight: 900; line-height: 1.2; }
.emergency-title { display: block; margin-top: 5px; color: #16324F; font-size: 17px; font-weight: 950; line-height: 1.25; }
.emergency-desc { display: block; margin-top: 6px; color: #6C8198; font-size: 12px; line-height: 1.5; }
.alarm-btn { flex: none; width: 74px; height: 74px; border-radius: 24px; background: #DC2626; color: #fff; font-size: 22px; font-weight: 950; line-height: 1; box-shadow: 0 16px 28px rgba(220, 38, 38, 0.24); }
.contact-list { display: grid; gap: 9px; margin-top: 14px; }
.contact-row { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 18px; border: 1px solid rgba(235, 235, 235, 0.96); background: rgba(255,255,255,0.94); }
.contact-main { flex: 1; min-width: 0; }
.contact-title-line { display: flex; align-items: center; gap: 6px; min-width: 0; }
.contact-title { min-width: 0; color: #16324F; font-size: 13px; font-weight: 900; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.contact-scope { flex: none; padding: 2px 7px; border-radius: 999px; background: rgba(8,145,178,0.10); color: #0E7490; font-size: 10px; font-weight: 900; line-height: 1.4; }
.contact-scope.urgent { background: rgba(220, 38, 38, 0.08); color: #DC2626; }
.contact-desc { display: block; margin-top: 5px; color: #6C8198; font-size: 11px; line-height: 1.45; }
.contact-call { flex: none; min-width: 74px; min-height: 38px; padding: 0 12px; border-radius: 999px; background: #FFF1F4; color: #DC2626; font-size: 13px; font-weight: 950; line-height: 1.2; }
.info-label { display: block; font-size: 12px; color: #6C8198; margin-bottom: 6px; line-height: 1.3; }
.info-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.info-count { color: #6C8198; font-size: 11px; font-weight: 800; }
.edit-card { margin-top: 14px; padding: 18px; border-radius: 30px; box-shadow: 0 16px 30px rgba(14, 116, 144, 0.10); }
.edit-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.edit-title { color: #16324F; font-size: 18px; font-weight: 950; }
.edit-close { height: 34px; padding: 0 12px; border-radius: 14px; background: rgba(8,145,178,0.10); color: #0E7490; font-size: 12px; font-weight: 900; }
.edit-field { margin-bottom: 12px; }
.edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.edit-segment { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.edit-segment-btn { min-height: 42px; border-radius: 16px; background: rgba(255,255,255,0.82); border: 1px solid rgba(168, 211, 223, 0.82); color: #6C8198; font-size: 13px; line-height: 1.2; font-weight: 900; }
.edit-segment-btn.active { background: linear-gradient(135deg, #0F766E 0%, #0891B2 100%); color: #fff; border-color: transparent; }
.edit-tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.edit-tag { display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 6px 0 10px; border-radius: 999px; background: rgba(8,145,178,0.12); color: #0E7490; font-size: 12px; line-height: 1.2; font-weight: 900; }
.edit-tag-remove { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border: 0; border-radius: 999px; background: transparent; color: #6C8198; font-size: 14px; line-height: 1; }
.edit-tag-row { display: flex; align-items: center; gap: 8px; }
.edit-tag-input { flex: 1; min-width: 0; }
.edit-tag-add { flex: none; min-height: 42px; padding: 0 14px; border-radius: 16px; background: linear-gradient(135deg, #0F766E 0%, #0891B2 100%); color: #fff; font-size: 13px; line-height: 1.2; font-weight: 900; }
.edit-tag-presets { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 9px; }
.edit-tag-preset { min-height: 32px; padding: 0 12px; border-radius: 999px; border: 1px solid rgba(168, 211, 223, 0.82); background: rgba(255,255,255,0.82); color: #6C8198; font-size: 12px; line-height: 1.2; font-weight: 900; }
.edit-tag-preset.active { border-color: transparent; background: linear-gradient(135deg, #0F766E 0%, #0891B2 100%); color: #fff; }
.edit-textarea { width: 100%; min-height: 88px; border: 1px solid rgba(168, 211, 223, 0.82); border-radius: 18px; padding: 12px 14px; background: rgba(255,255,255,0.84); font-size: 14px; line-height: 1.5; color: #16324F; }
.edit-photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.edit-photo-item { position: relative; border-radius: 18px; overflow: hidden; background: #EAF8FB; aspect-ratio: 1; }
.edit-photo-img { width: 100%; height: 100%; }
.edit-photo-remove { position: absolute; right: 6px; top: 6px; width: 20px; height: 20px; border-radius: 50%; border: 0; background: rgba(0, 0, 0, 0.55); color: #fff; font-size: 14px; line-height: 1; display: flex; align-items: center; justify-content: center; }
.edit-photo-add { min-height: 88px; border-radius: 18px; border: 1px dashed rgba(8, 145, 178, 0.28); background: linear-gradient(180deg, rgba(234,248,251,0.98), rgba(255,255,255,0.98)); color: #0E7490; font-size: 13px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
.edit-photo-add[disabled] { opacity: 0.55; }
.edit-share-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.edit-share-option { min-height: 40px; border-radius: 16px; border: 1px solid rgba(168, 211, 223, 0.82); background: rgba(255,255,255,0.82); color: #6C8198; font-size: 12px; line-height: 1.2; font-weight: 900; }
.edit-share-option.active { border-color: transparent; background: linear-gradient(135deg, rgba(15,118,110,0.14) 0%, rgba(8,145,178,0.12) 100%); color: #0E7490; }
.edit-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }
.edit-cancel { min-height: 46px; border-radius: 18px; border: 1px solid rgba(168, 211, 223, 0.82); background: rgba(255,255,255,0.82); color: #6C8198; font-size: 14px; line-height: 1.2; font-weight: 900; }
.edit-save { width: 100%; }
.edit-save[disabled] { opacity: 0.65; }
.edit-coord-row { display: flex; align-items: center; gap: 10px; }
.edit-coord-text { flex: 1; color: #6C8198; font-size: 12px; line-height: 1.4; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.edit-map-pick { flex: none; min-height: 36px; padding: 0 14px; border-radius: 14px; background: rgba(8,145,178,0.10); color: #0E7490; border: 1px solid rgba(168, 211, 223, 0.82); font-size: 12px; font-weight: 900; line-height: 1.2; }
.actions { display: flex; gap: 10px; margin-top: 16px; }
.action-btn { flex: 1; min-height: 46px; font-size: 14px; line-height: 1.2; font-weight: 900; }
.action-btn.favor { border-radius: 18px; border: 1px solid rgba(249,115,22,0.20); background: rgba(255,247,237,0.98); color: #EA580C; }
.action-btn.nav-action { border-radius: 18px; border: 1px solid rgba(168, 211, 223, 0.82); background: rgba(236,248,251,0.98); color: #0E7490; }
.action-btn.share-action { border-radius: 18px; border: 1px solid rgba(34,197,94,0.24); background: rgba(240,253,244,0.98); color: #16A34A; }
.action-btn.edit-action { border-radius: 18px; border: 1px solid rgba(168, 211, 223, 0.82); background: rgba(255,255,255,0.82); color: #0F766E; }
.verify-section { margin-top: 20px; }
.section-title { font-size: 17px; font-weight: 900; display: block; margin-bottom: 12px; color: #16324F; }
.verify-item { display: block; padding: 14px 16px; margin-bottom: 10px; font-size: 13px; line-height: 1.45; border-radius: 22px; }
.verify-row { display: flex; gap: 10px; align-items: center; }
.verify-feedback { font-weight: 800; color: #0E7490; }
.verify-user { color: #0F766E; }
.verify-time { color: #6C8198; margin-left: auto; white-space: nowrap; }
.verify-photo-strip { width: 100%; margin-top: 10px; white-space: nowrap; }
.verify-photo-inner { display: inline-flex; gap: 8px; }
.verify-photo { width: 78px; height: 78px; border-radius: 16px; background: #EAF8FB; }
.empty-verify { padding: 18px; color: #6C8198; font-size: 13px; line-height: 1.5; }

@media (max-width: 430px) {
  .spot-head {
    align-items: flex-start;
  }

  .spot-name {
    font-size: 20px;
  }

  .edit-grid,
  .edit-share-options {
    grid-template-columns: 1fr;
  }

  .edit-photo-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .emergency-head {
    align-items: flex-start;
  }

  .alarm-btn {
    width: 62px;
    height: 62px;
    border-radius: 20px;
    font-size: 19px;
  }

  .contact-row {
    align-items: stretch;
    flex-direction: column;
  }

  .contact-title {
    white-space: normal;
  }

  .contact-call {
    width: 100%;
  }

  .actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }

  .verify-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .verify-time {
    width: 100%;
    margin-left: 0;
  }
}

@media (max-width: 360px) {
  .score-badge {
    width: 54px;
    height: 54px;
  }

  .spot-title-wrap {
    padding-right: 10px;
  }
}
</style>
