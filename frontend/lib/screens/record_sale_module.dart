import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import '../services/api_service.dart';

class RecordSaleModule extends StatefulWidget {
  const RecordSaleModule({Key? key}) : super(key: key);

  @override
  State<RecordSaleModule> createState() => _RecordSaleModuleState();
}

class _RecordSaleModuleState extends State<RecordSaleModule> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _quantityController = TextEditingController(text: '1');
  final _priceController = TextEditingController();

  List<dynamic> _products = [];
  List<dynamic> _customers = [];
  int? _selectedProductId;
  int? _selectedCustomerId;
  String _selectedPaymentMethod = 'Cash';
  bool _sendEmail = true;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchCatalog();
  }

  Future<void> _fetchCatalog() async {
    final api = Provider.of<ApiService>(context, listen: false);
    if (api.token == null) return;

    try {
      final headers = {'Authorization': 'Bearer ${api.token}'};
      final pRes = await http.get(Uri.parse('${api.baseUrl}/products'), headers: headers);
      final cRes = await http.get(Uri.parse('${api.baseUrl}/customers'), headers: headers);

      if (pRes.statusCode == 200 && cRes.statusCode == 200) {
        setState(() {
          _products = jsonDecode(pRes.body);
          _customers = jsonDecode(cRes.body);
          if (_products.isNotEmpty) {
            _selectedProductId = _products.first['id'];
          }
        });
      }
    } catch (e) {
      debugPrint('Fetch error: $e');
    }
  }

  void _onCustomerChanged(int? customerId) {
    setState(() {
      _selectedCustomerId = customerId;
      if (customerId != null) {
        final cust = _customers.firstWhere((c) => c['id'] == customerId, orElse: () => null);
        if (cust != null && cust['email'] != null) {
          _emailController.text = cust['email'];
        }
      } else {
        _emailController.clear();
      }
    });
  }

  Future<void> _submitSale() async {
    if (!_formKey.currentState!.validate() || _selectedProductId == null) return;

    setState(() => _isLoading = true);
    final api = Provider.of<ApiService>(context, listen: false);

    final payload = {
      'product_id': _selectedProductId,
      'quantity': int.tryParse(_quantityController.text) ?? 1,
      'unit_price': double.tryParse(_priceController.text),
      'customer_id': _selectedCustomerId,
      'customer_email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
      'send_email': _sendEmail,
      'payment_method': _selectedPaymentMethod,
    };

    try {
      final response = await http.post(
        Uri.parse('${api.baseUrl}/sales'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${api.token}',
        },
        body: jsonEncode(payload),
      );

      setState(() => _isLoading = false);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final sentEmail = data['customer_email'];
        final invNum = data['invoice_number'] ?? 'INV-${data['id']}';

        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.green),
                SizedBox(width: 8),
                Text('Sale Recorded!'),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Invoice: #$invNum', style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('Total: ₹${(data['total_sales'] as num).toStringAsFixed(2)}'),
                const SizedBox(height: 8),
                if (sentEmail != null && sentEmail.toString().isNotEmpty)
                  Text('✓ Invoice sent to concerned mail ID:\n$sentEmail',
                      style: const TextStyle(color: Colors.blueAccent, fontWeight: FontWeight.w600))
                else
                  const Text('No concern mail ID was specified.'),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  _formKey.currentState?.reset();
                  _emailController.clear();
                  _quantityController.text = '1';
                  _priceController.clear();
                },
                child: const Text('OK'),
              ),
            ],
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: ${response.body}')),
        );
      }
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Request error: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Record Sale & Email Invoice',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            if (_products.isNotEmpty)
              DropdownButtonFormField<int>(
                value: _selectedProductId,
                decoration: const InputDecoration(labelText: 'Select Product', border: OutlineInputBorder()),
                items: _products.map<DropdownMenuItem<int>>((p) {
                  return DropdownMenuItem<int>(
                    value: p['id'],
                    child: Text('${p['name']} (₹${p['selling_price']})'),
                  );
                }).toList(),
                onChanged: (val) => setState(() => _selectedProductId = val),
              ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _quantityController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Quantity', border: OutlineInputBorder()),
              validator: (v) => (int.tryParse(v ?? '') ?? 0) < 1 ? 'Enter valid quantity' : null,
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<int?>(
              value: _selectedCustomerId,
              decoration: const InputDecoration(labelText: 'Customer', border: OutlineInputBorder()),
              items: [
                const DropdownMenuItem<int?>(value: null, child: Text('Walk-in Customer (Manual Email)')),
                ..._customers.map<DropdownMenuItem<int?>>((c) {
                  return DropdownMenuItem<int?>(
                    value: c['id'],
                    child: Text('${c['name']} ${c['email'] != null ? '• ' + c['email'] : ''}'),
                  );
                }),
              ],
              onChanged: _onCustomerChanged,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Customer Email (Concern Mail ID)',
                hintText: 'e.g. customer@example.com',
                prefixIcon: Icon(Icons.email),
                border: OutlineInputBorder(),
                helperText: 'Invoice will be dispatched to this mail ID',
              ),
            ),
            const SizedBox(height: 10),
            SwitchListTile(
              title: const Text('Send Invoice to Concerned Mail ID'),
              value: _sendEmail,
              onChanged: (val) => setState(() => _sendEmail = val),
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              value: _selectedPaymentMethod,
              decoration: const InputDecoration(labelText: 'Payment Method', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'Cash', child: Text('Cash')),
                DropdownMenuItem(value: 'Card', child: Text('Credit / Debit Card')),
                DropdownMenuItem(value: 'Mobile UPI', child: Text('Mobile UPI')),
              ],
              onChanged: (val) => setState(() => _selectedPaymentMethod = val ?? 'Cash'),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isLoading ? null : _submitSale,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Complete Sale & Send Invoice', style: TextStyle(fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }
}
