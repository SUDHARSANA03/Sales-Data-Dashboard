import 'package:flutter/material.dart';

class AnalyticsModule extends StatelessWidget {
  const AnalyticsModule({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text(
        'Analytics Module',
        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
      ),
    );
  }
}
