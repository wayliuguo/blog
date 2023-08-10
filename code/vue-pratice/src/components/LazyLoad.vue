<template>
    <div class="box">
        <li v-for="(item, index) in list" :key="index">
            <img v-lazy="item" alt="">
        </li>
    </div>
  </template>
  
  <script>
  export default {
    name: 'LazyLoad',
    data() {
        return {
            list: []
        }
    },
    mounted() {
        this.list = [
            'https://scpic.chinaz.net/files/pic/pic9/202105/apic32685.jpg',
            'https://scpic.chinaz.net/files/pic/pic9/202004/zzpic24532.jpg',
            'https://scpic.chinaz.net/Files/pic/pic9/202004/zzpic24243.jpg',
            'https://scpic.chinaz.net/Files/pic/pic9/202004/zzpic24272.jpg',
            'https://scpic.chinaz.net/Files/pic/pic9/201510/apic15901.jpg',
            'https://scpic.chinaz.net/files/pic/pic9/202105/apic32685.jpg',
            'https://scpic.chinaz.net/files/pic/pic9/202004/zzpic24532.jpg',
            'https://scpic.chinaz.net/Files/pic/pic9/202004/zzpic24243.jpg',
            'https://scpic.chinaz.net/Files/pic/pic9/202004/zzpic24272.jpg',
            'https://scpic.chinaz.net/Files/pic/pic9/201510/apic15901.jpg',
            'https://scpic.chinaz.net/files/pic/pic9/202105/apic32685.jpg',
            'https://scpic.chinaz.net/files/pic/pic9/202004/zzpic24532.jpg',
            'https://scpic.chinaz.net/Files/pic/pic9/202004/zzpic24243.jpg',
            'https://scpic.chinaz.net/Files/pic/pic9/202004/zzpic24272.jpg',
            'https://scpic.chinaz.net/Files/pic/pic9/201510/apic15901.jpg',
            'https://scpic.chinaz.net/files/pic/pic9/202105/apic32685.jpg',
            'https://scpic.chinaz.net/files/pic/pic9/202004/zzpic24532.jpg',
            'https://scpic.chinaz.net/Files/pic/pic9/202004/zzpic24243.jpg',
            'https://scpic.chinaz.net/Files/pic/pic9/202004/zzpic24272.jpg',
            'https://scpic.chinaz.net/Files/pic/pic9/201510/apic15901.jpg'
        ]
    }
  }
  </script>
  
  <style scoped>
  .box {
    width: 400px;
    height: 400px;
    overflow: scroll;
  }
  img {
    width: 100px;
    height: 150px;
  }
  </style>
  