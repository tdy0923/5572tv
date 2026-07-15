import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../utils/device_utils.dart';

class AppHoverButton extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final double scaleAmount;
  final Color? hoverColor;
  final bool enabled;

  const AppHoverButton({
    super.key,
    required this.child,
    this.onTap,
    this.scaleAmount = 1.0,
    this.hoverColor,
    this.enabled = true,
  });

  @override
  State<AppHoverButton> createState() => _AppHoverButtonState();
}

class _AppHoverButtonState extends State<AppHoverButton> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final isPC = DeviceUtils.isPC();
    final isInteractive = isPC && widget.enabled && widget.onTap != null;

    Widget result = MouseRegion(
      cursor: isInteractive ? SystemMouseCursors.click : MouseCursor.defer,
      onEnter: isPC ? (_) => setState(() => _isHovered = true) : null,
      onExit: isPC ? (_) => setState(() => _isHovered = false) : null,
      child: GestureDetector(
        onTap: widget.enabled ? widget.onTap : null,
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          child: ColorFiltered(
            colorFilter: isInteractive && _isHovered
                ? ColorFilter.mode(
                    widget.hoverColor ?? Colors.green,
                    BlendMode.modulate,
                  )
                : const ColorFilter.mode(
                    Colors.white,
                    BlendMode.modulate,
                  ),
            child: widget.child,
          ),
        ),
      ),
    );

    if (widget.scaleAmount != 1.0) {
      result = AnimatedScale(
        scale: isInteractive && _isHovered ? widget.scaleAmount : 1.0,
        duration: const Duration(milliseconds: 200),
        child: result,
      );
    }

    return result;
  }
}
