<script setup>
defineProps({
    title: { type: String, required: true }
})
</script>

<template>
    <section class="card">
        <h2>{{ title }}</h2>
        <p><slot /></p>
    </section>
</template>

<style scoped>
.card {
    border: 1px solid #d0d7de;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
}
</style>