import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService extends ChangeNotifier {
  final String baseUrl = "http://127.0.0.1:8000/api";
  String? _token;
  String? get token => _token;

  ApiService() {
    _loadToken();
  }

  Future<void> _loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('demandsense_token');
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: {'username': email, 'password': password},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _token = data['access_token'];
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('demandsense_token', _token!);
        notifyListeners();
        return true;
      }
    } catch (e) {
      print('Login error: $e');
    }
    return false;
  }

  Future<void> logout() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('demandsense_token');
    notifyListeners();
  }
}
