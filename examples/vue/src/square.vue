<template>
  <button class="square" @click="emit('click')">
    {{ value }}
  </button>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'GameSquare'
});

defineProps<{
  value: string;
}>();

const emit = defineEmits(['click']);
</script>
