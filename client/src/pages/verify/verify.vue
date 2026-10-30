<template>
  <view class="verify-page dd-page">
    <view class="dd-head">
      <text class="dd-kicker">SPOT CHECK</text>
      <text class="dd-title">钓友验点</text>
      <text class="dd-desc">你的反馈会影响标点可信度，也能提醒后来的钓友避开风险。</text>
    </view>

    <FeedbackPicker :selected="selected" @select="selected = $event" />

    <view class="tag-card dd-card">
      <view class="tag-head">
        <view>
          <text class="tag-title">更新标点标签</text>
          <text class="tag-desc">现场信息有变化时，可以顺手补充标签。</text>
        </view>
        <text class="tag-count">{{ tags.length }}/12</text>
      </view>
      <view v-if="tags.length" class="tag-list">
        <button v-for="tag in tags" :key="tag" class="selected-tag" @tap="removeTag(tag)">
          {{ tag }} ×
        </button>
      </view>
      <view class="tag-input-row">
        <input class="tag-input dd-input" v-model="tagKeyword" placeholder="例如：有卫生间、停车困难" @confirm="addTag()" />
        <button class="tag-add" @tap="addTag()">添加</button>
      </view>
      <scroll-view class="tag-groups" scroll-y>
        <view v-for="group in standardTagGroups" :key="group.title" class="tag-group">
          <text class="tag-group-title">{{ group.title }}</text>
          <view class="tag-options">
            <button
              v-for="tag in group.items"
              :key="tag"
              :class="['tag-option', { active: tags.includes(tag) }]"
              @tap="toggleTag(tag)"
            >{{ tag }}</button>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="verify-photo-card dd-card">
      <view class="verify-photo-head">
        <view>
          <text class="verify-photo-title">现场图片</text>
          <text class="verify-photo-desc">可以补充水面、岸边环境或鱼获照片，最多 9 张。</text>
        </view>
        <text class="verify-photo-count">{{ photoUrls.length }}/9</text>
      </view>
      <view v-if="photoUrls.length" class="verify-photo-grid">
        <view v-for="(url, index) in photoUrls" :key="`${url}-${index}`" class="verify-photo-item">
          <image class="verify-photo-img" :src="url" mode="aspectFill" @tap="previewPhoto(index)" />
          <button class="verify-photo-remove" @tap.stop="removePhoto(index)">×</button>
        </view>
        <button
          v-if="photoUrls.length < 9"
          class="verify-photo-add compact"
          :disabled="uploadingPhoto"
          @tap="pickPhoto"
        >{{ uploadingPhoto ? '上传中' : '+ 添加' }}</button>
      </view>
      <button
        v-else
        class="verify-photo-add"
        :disabled="uploadingPhoto"
        @tap="pickPhoto"
      >
        <text>{{ uploadingPhoto ? '图片上传中...' : '拍照 / 上传现场图片' }}</text>
      </button>
    </view>

    <view class="note-card dd-card">
      <view class="note-head">
        <text class="dd-field-label">补充备注</text>
        <text class="note-tip">选填</text>
      </view>
      <textarea class="textarea" v-model="note" placeholder="水情、鱼情、作钓心得…" />
    </view>

    <button class="submit-btn dd-primary-btn" @tap="submit" :disabled="!selected || submitting">
      {{ submitting ? '提交中…' : '提交验点反馈' }}
    </button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { spotApi } from '@/api/spots';
import { uploadApi } from '@/api/upload';
import { useAuthStore } from '@/stores/auth';
import FeedbackPicker from '@/components/FeedbackPicker.vue';
import { normalizeTags, standardTagGroups } from '@/utils/fish';

const auth = useAuthStore();
const spotId = ref(0);
const selected = ref('');
const note = ref('');
const tags = ref<string[]>([]);
const tagKeyword = ref('');
const photoUrls = ref<string[]>([]);
const uploadingPhoto = ref(false);
const submitting = ref(false);

onLoad((params) => {
  spotId.value = Number(params?.spotId || 0);
  if (spotId.value) loadSpotTags();
});

async function loadSpotTags() {
  try {
    const res = await spotApi.detail(spotId.value);
    tags.value = res.data?.tags || [];
  } catch {
    tags.value = [];
  }
}

function addTag(tag?: string) {
  const value = (tag || tagKeyword.value).trim().slice(0, 20);
  if (!value) return;
  tags.value = normalizeTags([...tags.value, value]);
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

function pickPhoto() {
  if (uploadingPhoto.value || photoUrls.value.length >= 9) return;
  uni.chooseImage({
    count: Math.max(1, 9 - photoUrls.value.length),
    success: async (res) => {
      const files = (res.tempFilePaths || []).slice(0, 9 - photoUrls.value.length);
      if (!files.length) return;
      uploadingPhoto.value = true;
      try {
        const uploaded: string[] = [];
        for (const filePath of files) {
          const result = await uploadApi.image(filePath);
          if (result.data?.url) uploaded.push(result.data.url);
        }
        photoUrls.value = [...photoUrls.value, ...uploaded].slice(0, 9);
      } catch (e: any) {
        uni.showToast({ title: e?.message || '图片上传失败', icon: 'none' });
      } finally {
        uploadingPhoto.value = false;
      }
    },
  });
}

function removePhoto(index: number) {
  photoUrls.value = photoUrls.value.filter((_, idx) => idx !== index);
}

function previewPhoto(index: number) {
  if (!photoUrls.value.length) return;
  uni.previewImage({
    current: photoUrls.value[index],
    urls: photoUrls.value,
  });
}

async function submit() {
  if (!auth.isLoggedIn) { uni.navigateTo({ url: '/pages/login/login' }); return; }
  if (!spotId.value || !selected.value) return;

  submitting.value = true;
  try {
    await spotApi.verify(spotId.value, selected.value, note.value, tags.value, photoUrls.value);
    uni.showToast({ title: '验点反馈已记录', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1500);
  } catch (e: any) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.verify-page { padding-bottom: 32px; }
.verify-page :deep(.dd-head) {
  box-shadow: 0 24px 44px rgba(8, 145, 178, 0.16);
}
.verify-page :deep(.dd-title) {
  font-size: 26px;
}
.verify-page :deep(.dd-desc) {
  line-height: 1.6;
}
.tag-card {
  margin-top: 14px;
  padding: 16px;
}
.tag-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.tag-title {
  display: block;
  color: #16324F;
  font-size: 16px;
  font-weight: 950;
  line-height: 1.25;
}
.tag-desc {
  display: block;
  margin-top: 4px;
  color: #6C8198;
  font-size: 12px;
  line-height: 1.45;
}
.tag-count {
  flex: none;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(8, 145, 178, 0.10);
  color: #0E7490;
  font-size: 11px;
  font-weight: 900;
  line-height: 26px;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 10px;
}
.selected-tag {
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #0F766E 0%, #0891B2 100%);
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
}
.tag-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tag-input {
  flex: 1;
  min-width: 0;
}
.tag-add {
  flex: none;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, #0F766E 0%, #0891B2 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.2;
}
.tag-groups {
  max-height: 260px;
  margin-top: 12px;
}
.tag-group {
  padding: 10px 0 2px;
  border-top: 1px solid rgba(155, 189, 210, 0.68);
}
.tag-group-title {
  display: block;
  margin-bottom: 8px;
  color: #16324F;
  font-size: 13px;
  font-weight: 950;
  line-height: 1.2;
}
.tag-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.tag-option {
  min-height: 34px;
  padding: 0 8px;
  border-radius: 14px;
  border: 1px solid rgba(155, 189, 210, 0.72);
  background: rgba(255,255,255,0.84);
  color: #48637A;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.2;
}
.tag-option.active {
  border-color: transparent;
  background: linear-gradient(135deg, #0F766E 0%, #0891B2 100%);
  color: #fff;
}
.verify-photo-card {
  margin-top: 14px;
  padding: 16px;
}
.verify-photo-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.verify-photo-title {
  display: block;
  color: #16324F;
  font-size: 16px;
  font-weight: 950;
  line-height: 1.25;
}
.verify-photo-desc {
  display: block;
  margin-top: 4px;
  color: #6C8198;
  font-size: 12px;
  line-height: 1.45;
}
.verify-photo-count {
  flex: none;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(8, 145, 178, 0.10);
  color: #0E7490;
  font-size: 11px;
  font-weight: 900;
  line-height: 26px;
}
.verify-photo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.verify-photo-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 18px;
  overflow: hidden;
  background: #EAF8FB;
}
.verify-photo-img {
  width: 100%;
  height: 100%;
}
.verify-photo-remove {
  position: absolute;
  right: 6px;
  top: 6px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.56);
  color: #fff;
  font-size: 14px;
  line-height: 1;
  font-weight: 900;
}
.verify-photo-add {
  width: 100%;
  min-height: 96px;
  border-radius: 20px;
  border: 1px dashed rgba(8, 145, 178, 0.34);
  background: linear-gradient(180deg, rgba(234,248,251,0.98), rgba(255,255,255,0.98));
  color: #0E7490;
  font-size: 14px;
  font-weight: 900;
}
.verify-photo-add.compact {
  min-height: 88px;
  font-size: 13px;
}
.verify-photo-add[disabled] {
  opacity: 0.55;
}
.note-card {
  margin-top: 14px;
  padding: 16px;
}
.note-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
.note-tip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(8,145,178,0.10);
  color: #0E7490;
  font-size: 11px;
  font-weight: 900;
}
.textarea { width: 100%; min-height: 116px; border: 1px solid rgba(155, 189, 210, 0.72); border-radius: 20px; padding: 14px; font-size: 14px; line-height: 1.6; background: rgba(255,255,255,0.88); color: #16324F; box-shadow: inset 0 1px 0 rgba(255,255,255,0.76); }
.submit-btn { width: 100%; margin-top: 16px; }
.submit-btn[disabled] { opacity: 0.5; }

@media (max-width: 360px) {
  .tag-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .verify-photo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
