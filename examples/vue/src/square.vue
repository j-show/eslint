<template>
  <button class="square" @click="emit('click')">
    {{ value }}
  </button>
</template>

<script lang="ts" setup>
defineProps<{
  value: string;
}>();

const emit = defineEmits(["click"]);
</script>
