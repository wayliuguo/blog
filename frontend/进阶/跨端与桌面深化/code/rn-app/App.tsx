import React, { useCallback, useState } from 'react'
import {
    FlatList,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import { advance, initialOrders, STATUS_CN, type Order } from './src/data'

/**
 * 订单工作台：FlatList 列表 + 选中详情 + 状态推进。
 * 只用 RN 核心组件——真机渲染需要 Android/iOS 环境（见 README 设备层说明）。
 */
export default function App() {
    const [orders, setOrders] = useState<Order[]>(initialOrders)
    const [selectedId, setSelectedId] = useState<string>('1001')

    const selected = orders.find((o) => o.id === selectedId) ?? null

    const onPress = useCallback((id: string) => {
        setSelectedId(id)
    }, [])

    const onAdvance = useCallback((id: string) => {
        // 不可变更新：RN 状态管理与 web 端 React 完全同构
        setOrders((prev) => prev.map((o) => (o.id === id ? advance(o) : o)))
    }, [])

    return (
        <SafeAreaView style={styles.root}>
            <StatusBar barStyle="dark-content" />
            <Text style={styles.h1}>订单工作台（React Native）</Text>
            <View style={styles.columns}>
                <FlatList
                    style={styles.list}
                    data={orders}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <Pressable
                            style={[styles.item, item.id === selectedId && styles.itemActive]}
                            onPress={() => onPress(item.id)}
                        >
                            <Text>
                                #{item.id} {item.title} ¥{item.amount}
                            </Text>
                            <Text style={styles.status}>{STATUS_CN[item.status]}</Text>
                        </Pressable>
                    )}
                />
                <View style={styles.detail}>
                    {selected ? (
                        <>
                            <Text style={styles.dTitle}>
                                #{selected.id} {selected.title}
                            </Text>
                            <Text>金额 ¥{selected.amount}</Text>
                            <Text style={styles.status}>状态：{STATUS_CN[selected.status]}</Text>
                            <Pressable style={styles.btn} onPress={() => onAdvance(selected.id)}>
                                <Text style={styles.btnText}>推进到下一状态</Text>
                            </Pressable>
                        </>
                    ) : (
                        <Text>点击左侧订单查看详情</Text>
                    )}
                </View>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    root: { flex: 1, padding: 16, paddingTop: 48 },
    h1: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
    columns: { flex: 1, flexDirection: 'row', gap: 12 },
    list: { flex: 3 },
    detail: { flex: 2, borderWidth: StyleSheet.hairlineWidth, borderColor: '#d0d7de', borderRadius: 8, padding: 12 },
    item: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eaeef2' },
    itemActive: { backgroundColor: '#eef5ff' },
    status: { color: '#0969da', fontSize: 12, marginTop: 4 },
    dTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    btn: { backgroundColor: '#0969da', borderRadius: 6, padding: 10, alignItems: 'center', marginTop: 16 },
    btnText: { color: '#fff' },
})
