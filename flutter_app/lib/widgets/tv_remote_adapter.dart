import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class TVRemoteAdapter extends StatefulWidget {
  final Widget child;
  final Function()? onSelect;
  final Function()? onBack;
  final Function()? onMenu;
  final Function()? onPlayPause;
  final Function()? onNext;
  final Function()? onPrevious;

  const TVRemoteAdapter({
    super.key,
    required this.child,
    this.onSelect,
    this.onBack,
    this.onMenu,
    this.onPlayPause,
    this.onNext,
    this.onPrevious,
  });

  @override
  State<TVRemoteAdapter> createState() => _TVRemoteAdapterState();
}

class _TVRemoteAdapterState extends State<TVRemoteAdapter> {
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _focusNode.requestFocus();
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  KeyEventResult _handleKeyEvent(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;

    switch (event.logicalKey) {
      case LogicalKeyboardKey.select:
      case LogicalKeyboardKey.enter:
        widget.onSelect?.call();
        return KeyEventResult.handled;

      case LogicalKeyboardKey.goBack:
      case LogicalKeyboardKey.escape:
        widget.onBack?.call();
        return KeyEventResult.handled;

      case LogicalKeyboardKey.menu:
        widget.onMenu?.call();
        return KeyEventResult.handled;

      case LogicalKeyboardKey.mediaPlayPause:
      case LogicalKeyboardKey.space:
        widget.onPlayPause?.call();
        return KeyEventResult.handled;

      case LogicalKeyboardKey.arrowRight:
        widget.onNext?.call();
        return KeyEventResult.handled;

      case LogicalKeyboardKey.arrowLeft:
        widget.onPrevious?.call();
        return KeyEventResult.handled;

      default:
        return KeyEventResult.ignored;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      focusNode: _focusNode,
      onKeyEvent: _handleKeyEvent,
      autofocus: true,
      child: widget.child,
    );
  }
}
