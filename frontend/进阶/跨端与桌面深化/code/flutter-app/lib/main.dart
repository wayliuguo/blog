import 'package:flutter/material.dart';

/// 数据模型：与 web/RN 侧订单结构同构，方便三端对照
class Order {
  const Order({
    required this.id,
    required this.title,
    required this.amount,
    required this.status,
  });

  final String id;
  final String title;
  final double amount;
  final OrderStatus status;

  Order advance() => Order(
        id: id,
        title: title,
        amount: amount,
        // Dart 的枚举切换必须穷举——编译器约束下的状态机
        status: switch (status) {
          OrderStatus.pending => OrderStatus.paid,
          OrderStatus.paid => OrderStatus.shipped,
          OrderStatus.shipped => OrderStatus.shipped,
        },
      );

  String get statusCn => switch (status) {
        OrderStatus.pending => '待支付',
        OrderStatus.paid => '已支付',
        OrderStatus.shipped => '已发货',
      };
}

enum OrderStatus { pending, paid, shipped }

const initialOrders = <Order>[
  Order(id: '1001', title: '机械键盘', amount: 399, status: OrderStatus.paid),
  Order(id: '1002', title: '无线鼠标', amount: 199, status: OrderStatus.pending),
  Order(id: '1003', title: '显示器支架', amount: 259, status: OrderStatus.pending),
  Order(id: '1004', title: 'USB-C 扩展坞', amount: 329, status: OrderStatus.shipped),
];

void main() => runApp(const OrderWorkbenchApp());

class OrderWorkbenchApp extends StatelessWidget {
  const OrderWorkbenchApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '订单工作台',
      theme: ThemeData(colorSchemeSeed: Colors.blue, useMaterial3: true),
      home: const OrderListPage(),
    );
  }
}

/// 列表页：ListView.builder 惰性构建——对应 RN FlatList 的虚拟化
class OrderListPage extends StatefulWidget {
  const OrderListPage({super.key});

  @override
  State<OrderListPage> createState() => _OrderListPageState();
}

class _OrderListPageState extends State<OrderListPage> {
  List<Order> orders = initialOrders;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('订单工作台（Flutter）')),
      body: ListView.builder(
        itemCount: orders.length,
        itemBuilder: (context, index) {
          final o = orders[index];
          return ListTile(
            leading: Text('#${o.id}'),
            title: Text(o.title),
            subtitle: Text('¥${o.amount.toStringAsFixed(0)} · ${o.statusCn}'),
            // 不可变更新 + setState 通知重建：Flutter 状态管理的心智模型
            onTap: () => setState(() {
              orders = [
                for (final item in orders)
                  if (item.id == o.id) item.advance() else item,
              ];
            }),
          );
        },
      ),
    );
  }
}
