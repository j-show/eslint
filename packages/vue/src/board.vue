<template>
  <div class="status">
    {{ status }}
  </div>
  <div class="board-row">
    <Square :value="squares[0]" @click="handleClick(0)" />
    <Square :value="squares[1]" @click="handleClick(1)" />
    <Square :value="squares[2]" @click="handleClick(2)" />
  </div>
  <div class="board-row">
    <Square :value="squares[3]" @click="handleClick(3)" />
    <Square :value="squares[4]" @click="handleClick(4)" />
    <Square :value="squares[5]" @click="handleClick(5)" />
  </div>
  <div class="board-row">
    <Square :value="squares[6]" @click="handleClick(6)" />
    <Square :value="squares[7]" @click="handleClick(7)" />
    <Square :value="squares[8]" @click="handleClick(8)" />
  </div>
</template>

<script lang="ts" setup>
import Square from "./square.vue";
import { computed } from "vue";

const DEAFULT_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const calculateWinner = (squares: string[]) => {
  for (const item of DEAFULT_LINES) {
    const [a, b, c] = item;

    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }

  return null;
};

const props = defineProps<{
  xIsNext: boolean;
  squares: string[];
}>();

const emit = defineEmits(["play"]);

const status = computed(() => {
  const winner = calculateWinner(props.squares);

  return winner
    ? `Winner: ${winner}`
    : `Next player: ${props.xIsNext ? "X" : "O"}`;
});

const handleClick = (i: number) => {
  const squares = props.squares;
  if (calculateWinner(squares) || squares[i]) return;

  const nextSquares = squares.slice();
  if (props.xIsNext) {
    nextSquares[i] = "X";
  } else {
    nextSquares[i] = "O";
  }

  emit("play", nextSquares);
};
</script>
