import 'package:flutter/material.dart';

class HotSection extends StatefulWidget {
  final Future<List<dynamic>> Function() fetchData;
  final Widget Function(
    BuildContext context,
    List<dynamic> data,
    bool isLoading,
    bool hasError,
    VoidCallback onRetry,
  ) buildContent;
  final String title;
  final String? emptyMessage;
  final String sectionId;

  const HotSection({
    super.key,
    required this.fetchData,
    required this.buildContent,
    required this.title,
    this.emptyMessage,
    required this.sectionId,
  });

  @override
  State<HotSection> createState() => _HotSectionState();

  static final Map<String, _HotSectionState> _instances = {};

  static Future<void> refresh(String sectionId) async {
    await _instances[sectionId]?._loadData();
  }
}

class _HotSectionState extends State<HotSection> {
  List<dynamic> _data = [];
  bool _isLoading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    HotSection._instances[widget.sectionId] = this;
    _loadData();
  }

  Future<void> _loadData() async {
    if (!mounted) return;

    try {
      setState(() {
        _isLoading = true;
        _hasError = false;
      });

      final result = await widget.fetchData();
      if (!mounted) return;

      setState(() {
        _data = result;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _hasError = true;
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    if (HotSection._instances[widget.sectionId] == this) {
      HotSection._instances.remove(widget.sectionId);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.buildContent(
      context,
      _data,
      _isLoading,
      _hasError,
      _loadData,
    );
  }
}
