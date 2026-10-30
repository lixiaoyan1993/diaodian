<template>
  <scroll-view class="edit-page dd-page" scroll-y>
    <view class="edit-inner">
      <view class="style-section">
        <button v-for="s in styleOptions" :key="s" :class="['style-btn', {active: draft.styles.includes(s)}]" @tap="toggleStyle(s)">{{s}}</button>
      </view>
      <view class="field location-card dd-card">
        <view class="card-head"><text class="dd-field-label">位置</text><text :class="['location-state',{active:!!draft.latitude}]">{{draft.latitude?'已选位置':'待选位置'}}</text></view>
        <view class="location-inline-row"><button class="map-btn map-btn-full" @tap="pickMap">地图选点</button></view>
        <view v-if="draft.latitude" class="location-result">
          <text class="geo-text">{{draft.address||'已选择位置'}}</text>
          <text class="region-text">{{draft.latitude.toFixed(5)}}, {{draft.longitude?.toFixed(5)}}</text>
        </view>
        <text v-else class="location-hint">请在地图上选择标点位置。</text>
      </view>
      <view class="core-card dd-card" :class="{'species-open-card':speciesOpen}">
        <view class="section-copy"><text class="section-title">标点信息</text><text class="section-meta">编辑标点名称、鱼种和标签</text></view>
        <view class="field primary-field"><text class="dd-field-label">标点名称</text><input class="dd-input" v-model="draft.name" placeholder="输入标点名称" /></view>
        <view class="field species-field"><text class="dd-field-label">鱼种</text>
          <view class="species-combobox" :class="{focus:speciesOpen}" @tap="speciesOpen=true">
            <view v-if="draft.species.length" class="species-selected">
              <view v-for="f in draft.species" :key="f" class="species-tag"><text>{{f}}</text><button class="species-remove" @tap.stop="removeSpecies(f)">×</button></view>
            </view>
            <input class="species-input" v-model="speciesKey" :placeholder="draft.species.length?'继续添加':'输入鱼种或选择'" confirm-type="done" @focus="speciesOpen=true" @input="onSpeciesInput" @confirm="addSpecies()" />
            <button v-if="speciesKey.trim()" class="species-add" @tap.stop="addSpecies()">添加</button>
          </view>
          <view v-if="speciesOpen" class="species-panel dd-card">
            <view class="species-panel-head"><text>{{speciesKey.trim()?'匹配鱼种':'常见鱼种'}}</text><button class="species-done" @tap.stop="speciesOpen=false">完成</button></view>
            <view class="species-options"><button v-for="f in speciesSuggestions" :key="f" class="species-option" @tap.stop="addSpecies(f)"><text class="species-check" /><text>{{f}}</text></button></view>
            <text v-if="!speciesSuggestions.length" class="species-empty">这个鱼种已添加</text>
          </view>
        </view>
      </view>
      <view class="field tag-card dd-card">
        <text class="dd-field-label">标点标签</text>
        <view v-if="draft.tags.length" class="tag-list"><view v-for="tag in draft.tags" :key="tag" class="spot-tag"><text>{{tag}}</text><button class="tag-remove" @tap.stop="removeTag(tag)">×</button></view></view>
        <view class="tag-input-row"><input class="dd-input tag-input" v-model="tagKey" placeholder="例如：好停车、不收费" confirm-type="done" @confirm="addTag()" /><button class="tag-add" @tap="addTag()">添加</button></view>
        <scroll-view class="tag-presets" scroll-x><view class="tag-presets-inner"><button v-for="tag in tagPresets" :key="tag" :class="['preset-tag',{active:draft.tags.includes(tag)}]" @tap="toggleTag(tag)">{{tag}}</button></view></scroll-view>
      </view>
      <view class="share-card dd-card">
        <view class="card-head"><text class="dd-field-label">分享设置</text><text class="share-current">{{draft.shareMode==="public"?'公开':'私密'}}</text></view>
        <view class="share-options"><button v-for="o in shareOptions" :key="o.value" :class="['share-option',{active:draft.shareMode===o.value}]" @tap="draft.shareMode=o.value"><text class="share-title">{{o.label}}</text></button></view>
      </view>
      <view class="photo-section dd-card" @tap="pickPhoto">
        <view v-if="draft.photoUrls.length" class="photo-grid">
          <view v-for="(url,idx) in draft.photoUrls" :key="url+'-'+idx" class="photo-item" @tap.stop="previewPhoto(idx)"><image class="photo-img" :src="imgUrl(url)" mode="aspectFill" /><button class="photo-remove" @tap.stop="removePhoto(idx)">×</button></view>
        </view>
        <view v-else class="photo-placeholder"><text class="photo-mark" /><text>拍照 / 选图</text></view>
      </view>
      <button class="extra-toggle dd-secondary-btn" @tap="extraOpen=!extraOpen">{{extraOpen?'收起补充信息':extraButtonText}}</button>
      <view v-if="extraOpen" class="extra-panel dd-card">
        <view class="section-copy section-copy-tight"><text class="section-title">补充找点线索</text><text class="section-meta">把抖音、小红书、视频号链接和现场备注补进去</text></view>
        <view class="field compact-field"><text class="dd-field-label">备注</text><textarea class="textarea textarea-compact" v-model="draft.note" placeholder="鱼情、水情、停车位、禁钓提醒…" /></view>
      </view>
    </view>
    <view class="save-bar"><button class="save-btn dd-primary-btn" :disabled="saving" @tap="saveEdit">{{saving?'保存中':'保存修改'}}</button></view>
  </scroll-view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { spotApi } from "@/api/spots";
import { uploadApi } from "@/api/upload";
import { fishOptionsByStyle, normalizeTags, standardTags, allFishOptions } from "@/utils/fish";

const draft = ref({name:"",styles:["路亚"],species:[],address:"",tags:[],photoUrls:[],note:"",latitude:null,longitude:null,shareMode:"private"});
const spotId = ref(0);
const speciesKey = ref("");
const tagKey = ref("");
const speciesOpen = ref(false);
const extraOpen = ref(false);
const saving = ref(false);
const uploading = ref(false);

const styleOptions = ["路亚","台钓"];
const tagPresets = standardTags;
const shareOptions = [{value:"private",label:"私密"},{value:"public",label:"公开"}];

const extraButtonText = computed(() => {
  let n = 0;
  if (draft.value.note.trim()) n++;
  return n ? `补充备注 ${n}` : "补充备注";
});

const fishOptions = computed(() => {
  const o:string[] = [];
  draft.value.styles.forEach((s:string) => { const l=(fishOptionsByStyle as any)[s]; if(l) o.push(...l); });
  return o.length ? Array.from(new Set(o)) : fishOptionsByStyle["路亚"];
});

const speciesSuggestions = computed(() => {
  const kw = speciesKey.value.trim();
  const sel = new Set(draft.value.species);
  const all = kw ? (fishOptions.value as string[]).filter((f:string) => f.includes(kw) || kw.includes(f)) : fishOptions.value;
  const arr = kw && !sel.has(kw) && !fishOptions.value.includes(kw) ? [kw, ...all] : all;
  return Array.from(new Set(arr)).filter((f:string) => !sel.has(f)).slice(0,10);
});

function imgUrl(url:string) { if(!url) return ""; if(/^https?:\/\//i.test(url)) return url; return (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/,"")+url; }
function toggleStyle(s:string) {
  if(draft.value.styles.includes(s)) {
    if(draft.value.styles.length>1) draft.value.styles = draft.value.styles.filter((i:string)=>i!==s);
  } else draft.value.styles = [...draft.value.styles, s];
}
function addSpecies(fish?:string) {
  const v = (fish||speciesKey.value).trim().slice(0,20);
  if(v && !draft.value.species.includes(v)) draft.value.species = [...draft.value.species, v].slice(0,12);
  speciesKey.value = "";
}
function removeSpecies(fish:string) { draft.value.species = draft.value.species.filter((i:string)=>i!==fish); }
function onSpeciesInput() { speciesOpen.value = true; }
function addTag(tag?:string) {
  const v = (tag||tagKey.value).trim().slice(0,20);
  if(v && !draft.value.tags.includes(v)) draft.value.tags = [...draft.value.tags, v].slice(0,12);
  tagKey.value = "";
}
function removeTag(tag:string) { draft.value.tags = draft.value.tags.filter((i:string)=>i!==tag); }
function toggleTag(tag:string) { draft.value.tags.includes(tag) ? removeTag(tag) : addTag(tag); }

function pickMap() {
  const lat = draft.value.latitude, lng = draft.value.longitude;
  if(lat==null||lng==null){uni.showToast({title:"请先获取定位",icon:"none"});return;}
  uni.navigateTo({
    url: "/pages/map-picker/map-picker?lat="+lat+"&lng="+lng,
    events: { confirm:(res:any)=>{if(res.latitude!=null&&res.longitude!=null){draft.value.latitude=res.latitude;draft.value.longitude=res.longitude;if(res.address)draft.value.address=res.address;}} }
  });
}

function pickPhoto() {
  if(uploading.value) return;
  uni.chooseImage({count:Math.max(1,9-draft.value.photoUrls.length),success:async(res)=>{const files=(res.tempFilePaths||[]).slice(0,9-draft.value.photoUrls.length);if(!files.length)return;uploading.value=true;try{const u:string[]=[];for(const fp of files){const up=await uploadApi.image(fp);if(up.data?.url)u.push(up.data.url)}draft.value.photoUrls=[...draft.value.photoUrls,...u].slice(0,9)}catch(e:any){uni.showToast({title:e?.message||"图片上传失败",icon:"none"})}finally{uploading.value=false}}});
}
function removePhoto(i:number) { draft.value.photoUrls = draft.value.photoUrls.filter((_:any,idx:number)=>idx!==i); }
function previewPhoto(i:number) { if(!draft.value.photoUrls.length)return; uni.previewImage({current:imgUrl(draft.value.photoUrls[i]),urls:draft.value.photoUrls.map(imgUrl)}); }

async function saveEdit() {
  if(!draft.value.name.trim()){uni.showToast({title:"标点名称不能为空",icon:"none"});return;}
  saving.value = true;
  try {
    await spotApi.update(spotId.value, {
      name: draft.value.name.trim(),
      style: draft.value.styles.join(","),
      species: draft.value.species.join("、"),
      address: draft.value.address.trim(),
      tags: normalizeTags(draft.value.tags),
      photoUrls: draft.value.photoUrls,
      note: draft.value.note.trim(),
      accuracy: draft.value.shareMode,
      isPublic: draft.value.shareMode !== "private",
      latitude: draft.value.latitude,
      longitude: draft.value.longitude,
    });
    uni.showToast({title:draft.value.shareMode==="public"?"修改已保存，公开内容需审核通过后展示":"修改已保存",icon:"success"});
    setTimeout(()=>uni.navigateBack(),500);
  } catch(e:any) { uni.showToast({title:e?.message||"保存失败",icon:"none"}); }
  finally { saving.value = false; }
}

onMounted(async()=>{
  try{
    const pages=getCurrentPages();const pg:any=pages[pages.length-1];
    const q=pg.$route?.query||pg.options||{};
    const nid=Number(q.id);
    if(!nid||!Number.isFinite(nid)){uni.showToast({title:"缺少标点ID",icon:"none"});uni.navigateBack();return;}
    spotId.value=nid;
    const res=await spotApi.detail(nid);
    const s=res.data as any;
    if(!s){uni.showToast({title:"标点不存在",icon:"none"});uni.navigateBack();return;}
    draft.value={
      name:s.name||"",
      styles:(s.style||"路亚").split(",").map((x:string)=>x.trim()).filter(Boolean),
      species:Array.from(new Set((s.species||"").split(/[、,,\s]+/).map((x:string)=>x.trim()).filter(Boolean))),
      address:s.address||"",
      tags:s.tags||[],
      photoUrls:s.photoUrls||[],
      note:s.note||"",
      latitude:s.latitude!=null?Number(s.latitude):null,
      longitude:s.longitude!=null?Number(s.longitude):null,
      shareMode:s.isPublic?"public":"private",
    };
  }catch(e:any){uni.showToast({title:e?.message||"加载失败",icon:"none"});uni.navigateBack();}
});
</script>

<style scoped>
.edit-page.dd-page { padding-bottom: 80px; }
.edit-inner { padding: 12px 10px; display: flex; flex-direction: column; gap: 12px; }
.save-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 8px 10px calc(8px + env(safe-area-inset-bottom)); background: rgba(243,246,240,0.96); backdrop-filter: blur(10px); border-top: 1px solid rgba(168,211,223,0.3); z-index: 100; }
.save-btn { width: 100%; min-height: 50px; border-radius: 18px; background: linear-gradient(135deg,#0F766E 0%,#0891B2 100%); color: #fff; font-size: 16px; font-weight: 950; border: 0; }
.save-btn[disabled] { opacity: 0.65; }
.style-section { display: flex; gap: 8px; }
.style-btn { flex: 1; min-height: 48px; border-radius: 18px; border: 1px solid rgba(168,211,223,0.82); background: rgba(255,255,255,0.82); color: #6C8198; font-size: 15px; line-height: 1.2; font-weight: 900; }
.style-btn.active { background: linear-gradient(135deg,#0F766E 0%,#0891B2 100%); color: #fff; border-color: transparent; }
.location-card { position: relative; z-index: 1; margin-bottom: 0; padding: 16px; }
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.dd-field-label { color: #16324F; font-size: 13px; font-weight: 800; }
.location-state { display: inline-flex; align-items: center; justify-content: center; min-height: 20px; padding: 0 7px; border-radius: 999px; background: rgba(168,211,223,0.24); color: #7A95A8; font-size: 10px; font-weight: 800; white-space: nowrap; }
.location-state.active { background: rgba(8,145,178,0.14); color: #0E7490; }
.location-inline-row { display: block; }
.map-btn { display: flex; align-items: center; justify-content: center; min-height: 48px; border-radius: 18px; background: rgba(255,255,255,0.82); color: #0E7490; border: 1px solid rgba(168,211,223,0.82); font-size: 13px; font-weight: 900; line-height: 1.2; white-space: nowrap; }
.map-btn-full { width: 100%; min-height: 50px; font-size: 15px; }
.location-result { margin-top: 8px; padding: 14px 14px 13px; border-radius: 18px; background: linear-gradient(180deg,rgba(234,248,251,0.98),rgba(255,255,255,0.98)); }
.geo-text { display: block; color: #16324F; font-size: 14px; font-weight: 950; line-height: 1.4; }
.region-text { display: block; margin-top: 4px; color: #6C8198; font-size: 11px; font-weight: 800; font-family: monospace; }
.location-hint { display: block; margin-top: 8px; color: #6C8198; font-size: 12px; line-height: 1.4; }
.core-card { padding: 20px 18px 18px; }
.species-open-card { padding-bottom: 14px; }
.section-copy { margin-bottom: 14px; }
.section-copy-tight { margin-bottom: 10px; }
.section-title { display: block; color: #16324F; font-size: 17px; font-weight: 950; margin-bottom: 3px; }
.section-meta { display: block; color: #6C8198; font-size: 12px; line-height: 1.4; }
.field { margin-bottom: 0; }
.primary-field { margin-bottom: 14px; }
.dd-input { width: 100%; min-height: 48px; border: 1px solid rgba(168,211,223,0.82); border-radius: 18px; padding: 0 16px; background: rgba(255,255,255,0.84); font-size: 14px; color: #16324F; box-sizing: border-box; }
.species-field { position: relative; }
.species-combobox { position: relative; border: 1px solid rgba(168,211,223,0.82); border-radius: 18px; background: rgba(255,255,255,0.82); min-height: 48px; padding: 6px 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.species-combobox.focus { border-color: #0891B2; background: #fff; }
.species-selected { display: flex; flex-wrap: wrap; gap: 6px; }
.species-tag { display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 6px 0 10px; border-radius: 999px; background: rgba(8,145,178,0.12); color: #0E7490; font-size: 12px; line-height: 1.2; font-weight: 900; }
.species-remove { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border: 0; border-radius: 999px; background: transparent; color: #6C8198; font-size: 14px; line-height: 1; }
.species-input { flex: 1; min-width: 80px; min-height: 36px; border: 0; background: transparent; font-size: 14px; color: #16324F; outline: none; }
.species-add { flex: none; min-height: 32px; padding: 0 12px; border-radius: 12px; background: linear-gradient(135deg,#0F766E 0%,#0891B2 100%); color: #fff; font-size: 13px; line-height: 1.2; font-weight: 900; }
.species-panel { position: absolute; top: 100%; left: 0; right: 0; z-index: 20; margin-top: 6px; padding: 14px; max-height: 280px; overflow-y: auto; box-shadow: 0 8px 24px rgba(14,116,144,0.12); }
.species-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.species-panel-head text { color: #16324F; font-size: 14px; font-weight: 950; }
.species-done { height: 30px; padding: 0 10px; border-radius: 12px; background: rgba(8,145,178,0.08); color: #0E7490; font-size: 12px; font-weight: 900; }
.species-options { display: flex; flex-direction: column; gap: 2px; }
.species-option { display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 0 12px; border-radius: 14px; background: transparent; color: #16324F; font-size: 14px; line-height: 1.2; font-weight: 800; }
.species-option:active { background: rgba(8,145,178,0.06); }
.species-check { width: 18px; height: 18px; border-radius: 50%; border: 1px solid rgba(168,211,223,0.82); flex: none; }
.species-empty { display: block; text-align: center; padding: 8px 0; color: #6C8198; font-size: 13px; }
.tag-card { padding: 16px; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.spot-tag { display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 6px 0 10px; border-radius: 999px; background: rgba(8,145,178,0.12); color: #0E7490; font-size: 12px; line-height: 1.2; font-weight: 900; }
.tag-remove { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border: 0; border-radius: 999px; background: transparent; color: #6C8198; font-size: 14px; line-height: 1; }
.tag-input-row { display: flex; gap: 8px; margin-bottom: 8px; }
.tag-input { flex: 1; min-width: 0; min-height: 42px; }
.tag-add { flex: none; min-height: 42px; padding: 0 14px; border-radius: 16px; background: linear-gradient(135deg,#0F766E 0%,#0891B2 100%); color: #fff; font-size: 13px; line-height: 1.2; font-weight: 900; }
.tag-presets { white-space: nowrap; }
.tag-presets-inner { display: inline-flex; gap: 6px; }
.preset-tag { min-height: 32px; padding: 0 12px; border-radius: 999px; border: 1px solid rgba(168,211,223,0.82); background: rgba(255,255,255,0.82); color: #6C8198; font-size: 12px; line-height: 1.2; font-weight: 900; }
.preset-tag.active { border-color: transparent; background: linear-gradient(135deg,#0F766E 0%,#0891B2 100%); color: #fff; }
.share-card { padding: 16px; }
.share-current { color: #0E7490; font-size: 12px; font-weight: 800; }
.share-options { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.share-option { min-height: 44px; border-radius: 18px; border: 1px solid rgba(168,211,223,0.82); background: rgba(255,255,255,0.82); color: #6C8198; font-size: 13px; line-height: 1.2; font-weight: 900; }
.share-option.active { border-color: transparent; background: linear-gradient(135deg,rgba(15,118,110,0.14) 0%,rgba(8,145,178,0.12) 100%); color: #0E7490; }
.share-title { display: block; text-align: center; padding: 12px 0; }
.photo-section { min-height: 100px; display: flex; align-items: center; justify-content: center; padding: 16px; }
.photo-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; width: 100%; }
.photo-item { position: relative; border-radius: 18px; overflow: hidden; background: #EAF8FB; aspect-ratio: 1; }
.photo-img { width: 100%; height: 100%; }
.photo-remove { position: absolute; right: 6px; top: 6px; width: 22px; height: 22px; border-radius: 50%; border: 0; background: rgba(0,0,0,0.55); color: #fff; font-size: 14px; line-height: 1; display: flex; align-items: center; justify-content: center; }
.photo-placeholder { display: flex; flex-direction: column; align-items: center; gap: 6px; color: #6C8198; font-size: 13px; font-weight: 800; }
.photo-mark { width: 32px; height: 32px; border-radius: 50%; border: 2px dashed currentColor; }
.extra-toggle { margin-top: 0; }
.dd-secondary-btn { width: 100%; min-height: 44px; border-radius: 18px; border: 1px solid rgba(168,211,223,0.82); background: rgba(255,255,255,0.82); color: #6C8198; font-size: 13px; font-weight: 900; }
.extra-panel { padding: 16px; }
.compact-field { margin-bottom: 12px; }
.compact-field:last-child { margin-bottom: 0; }
.textarea { width: 100%; min-height: 88px; border: 1px solid rgba(168,211,223,0.82); border-radius: 18px; padding: 12px 16px; background: rgba(255,255,255,0.84); font-size: 14px; line-height: 1.5; color: #16324F; box-sizing: border-box; }
.textarea-compact { min-height: 72px; }
</style>
