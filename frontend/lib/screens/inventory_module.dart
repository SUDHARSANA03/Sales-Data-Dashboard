import 'package:flutter/material.dart';

class InventoryModule extends StatelessWidget {
  const InventoryModule({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text(
        'Inventory Module',
        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
      ),
    );
  }
}
