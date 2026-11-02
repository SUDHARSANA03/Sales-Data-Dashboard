import 'package:flutter/material.dart';

class HomeModule extends StatelessWidget {
  const HomeModule({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text(
        'Home Dashboard Module',
        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
      ),
    );
  }
}
