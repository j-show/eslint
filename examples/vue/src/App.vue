<template>
  <div class="game">
    <div class="game-board">
      <Board
        :x-is-next="xIsNext"
        :squares="currentSquares"
        @play="handlePlay"
      />
    </div>
    <div class="game-info">
      <ol>
        <li v-for="(_, idx) in history" :key="`l-${idx}`">
          <button @click="jumpTo(idx)">
            Go to {{ idx > 0 ? `move #${idx}` : 'game start' }}
          </button>
        </li>
      </ol>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';

import Board from './board.vue';

const history = ref<string[][]>([[...Array(9).fill('')]] as string[][]);
const currentMove = ref(0);

const xIsNext = computed(() => currentMove.value % 2 === 0);
const currentSquares = computed(() => history.value[currentMove.value]);

const jumpTo = (step: number) => {
  currentMove.value = step;
};

const handlePlay = (nextSquares: string[]) => {
  const nextHistory = [
    ...history.value.slice(0, currentMove.value + 1),
    nextSquares
  ];

  history.value = nextHistory;
  currentMove.value = nextHistory.length - 1;
};
</script>
