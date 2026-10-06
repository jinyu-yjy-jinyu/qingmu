<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { WhiteboardEntry } from '../../composables/useWhiteboardManager'
import { useI18n } from '../../i18n'

const { t } = useI18n()

defineProps<{
  boards: WhiteboardEntry[]
  currentId: string
  canCreate: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  create: []
  requestDelete: [id: string]
  rename: [id: string, name: string]
  clearCurrent: []
  exportPng: []
}>()

const editingId = ref<string | null>(null)
const draftName = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function startRename(id: string, name: string) {
  editingId.value = id
  draftName.value = name
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function commitRename() {
  if (editingId.value === null) return
  const id = editingId.value
  const name = draftName.value
  editingId.value = null
  emit('rename', id, name)
}

function cancelRename() {
  editingId.value = null
}
</script>

<template>
  <div class="whiteboard-tabbar overlay-panel overlay-panel--compact">
    <div class="whiteboard-tabbar__scroll">
      <button
        v-for="board in boards"
        :key="board.id"
        class="whiteboard-tab"
        :class="{ 'whiteboard-tab--active': board.id === currentId }"
        :title="board.name"
        @click="emit('select', board.id)"
        @dblclick="startRename(board.id, board.name)"
      >
        <input
          v-if="editingId === board.id"
          ref="inputRef"
          v-model="draftName"
          class="whiteboard-tab__input"
          maxlength="50"
          spellcheck="false"
          @click.stop
          @dblclick.stop
          @keydown.enter.prevent="commitRename"
          @keydown.esc.prevent="cancelRename"
          @blur="commitRename"
        />
        <template v-else>
          <span class="whiteboard-tab__name">{{ board.name }}</span>
          <span
            class="whiteboard-tab__close"
            role="button"
            :title="t('whiteboard.delete')"
            @click.stop="emit('requestDelete', board.id)"
          >
            ✕
          </span>
        </template>
      </button>
      <button
        class="whiteboard-tab whiteboard-tab--new"
        :disabled="!canCreate"
        :title="canCreate ? t('whiteboard.newBoard') : t('whiteboard.maxReached')"
        @click="emit('create')"
      >
        ＋
      </button>
    </div>
    <div class="whiteboard-tabbar__divider" aria-hidden="true"></div>
    <div class="whiteboard-tabbar__actions">
      <button class="whiteboard-action" :title="t('whiteboard.clearCurrent')" @click="emit('clearCurrent')">
        {{ t('whiteboard.clearCurrent') }}
      </button>
      <button class="whiteboard-action" :title="t('whiteboard.exportPng')" @click="emit('exportPng')">
        {{ t('whiteboard.exportPng') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.whiteboard-tabbar {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: min(92vw, 720px);
  padding: 6px 8px;
  user-select: none;
  -webkit-user-select: none;
}

.whiteboard-tabbar__scroll {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.whiteboard-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 160px;
  height: 26px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid var(--ui-control-border);
  background: var(--ui-control-bg-soft);
  color: var(--ui-control-text);
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s;
}

.whiteboard-tab:hover {
  background: var(--ui-control-bg-hover);
  border-color: var(--ui-control-border-hover);
  color: var(--ui-control-text-hover);
}

.whiteboard-tab--active {
  border-color: var(--ui-accent-border);
  background: var(--ui-accent-bg-active);
  color: var(--ui-accent-text);
}

.whiteboard-tab--active:hover {
  border-color: var(--ui-accent-border-strong);
  color: var(--ui-accent-text);
}

.whiteboard-tab__name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.whiteboard-tab__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  font-size: 10px;
  color: var(--ui-text-muted);
  transition:
    background 0.12s,
    color 0.12s;
}

.whiteboard-tab__close:hover {
  background: var(--ui-msg-error-bg);
  color: var(--ui-msg-error-text);
}

.whiteboard-tab__input {
  width: 96px;
  height: 18px;
  padding: 0 4px;
  border-radius: 4px;
  border: 1px solid var(--ui-accent-border);
  outline: none;
  background: var(--ui-bg-elevated);
  color: var(--ui-text-value);
  font-size: 12px;
  line-height: 1;
}

.whiteboard-tab--new {
  justify-content: center;
  min-width: 26px;
  padding: 0;
  font-size: 14px;
}

.whiteboard-tab--new:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.whiteboard-tabbar__divider {
  width: 1px;
  height: 18px;
  background: var(--ui-divider);
}

.whiteboard-tabbar__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.whiteboard-action {
  height: 26px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--ui-control-border);
  background: var(--ui-control-bg-soft);
  color: var(--ui-control-text);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s;
}

.whiteboard-action:hover {
  background: var(--ui-control-bg-hover);
  border-color: var(--ui-control-border-hover);
  color: var(--ui-control-text-hover);
}
</style>
