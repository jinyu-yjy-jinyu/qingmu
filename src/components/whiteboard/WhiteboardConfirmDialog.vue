<script setup lang="ts">
defineProps<{
  title: string
  message: string
  confirmText: string
  cancelText: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div class="whiteboard-dialog-backdrop" @click.self="emit('cancel')">
    <div class="whiteboard-dialog overlay-panel overlay-panel--compact" role="dialog" aria-modal="true">
      <h3 class="whiteboard-dialog__title">{{ title }}</h3>
      <p class="whiteboard-dialog__message">{{ message }}</p>
      <div class="whiteboard-dialog__actions">
        <button class="whiteboard-dialog__btn whiteboard-dialog__btn--cancel" @click="emit('cancel')">
          {{ cancelText }}
        </button>
        <button class="whiteboard-dialog__btn whiteboard-dialog__btn--confirm" @click="emit('confirm')">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.whiteboard-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
}

.whiteboard-dialog {
  width: min(360px, 82vw);
  padding: 18px 20px 16px;
}

.whiteboard-dialog__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ui-text-title);
}

.whiteboard-dialog__message {
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--ui-text-muted);
  word-break: break-word;
}

.whiteboard-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.whiteboard-dialog__btn {
  height: 28px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--ui-control-border);
  font-size: 12.5px;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s;
}

.whiteboard-dialog__btn--cancel {
  background: var(--ui-control-bg-soft);
  color: var(--ui-control-text);
}

.whiteboard-dialog__btn--cancel:hover {
  background: var(--ui-control-bg-hover);
  color: var(--ui-control-text-hover);
}

.whiteboard-dialog__btn--confirm {
  border-color: transparent;
  background: var(--ui-accent);
  color: #ffffff;
}

.whiteboard-dialog__btn--confirm:hover {
  filter: brightness(1.1);
}
</style>
