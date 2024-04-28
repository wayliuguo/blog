<script setup>
import { ref } from 'vue'
import { useGlobalState } from '../hooks/store.js'

const { count, doubleCount, increment } = useGlobalState()
</script>

<template>
    <div>{{ count }}</div>
    <div>{{ doubleCount }}</div>
    <button @click="increment(2)">加2</button>
</template>
