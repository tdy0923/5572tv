import 'package:flutter/material.dart';

class CollapsibleScrollPhysics extends ScrollPhysics {
  final bool isAtMaxHeight;
  final VoidCallback? onCollapseTriggered;
  final bool isIOS;

  const CollapsibleScrollPhysics({
    super.parent,
    this.isAtMaxHeight = false,
    this.onCollapseTriggered,
    this.isIOS = false,
  });

  @override
  CollapsibleScrollPhysics applyTo(ScrollPhysics? ancestor) {
    return CollapsibleScrollPhysics(
      parent: buildParent(ancestor),
      isAtMaxHeight: isAtMaxHeight,
      onCollapseTriggered: onCollapseTriggered,
      isIOS: isIOS,
    );
  }

  @override
  double applyPhysicsToUserOffset(ScrollMetrics position, double offset) {
    if (isAtMaxHeight &&
        ((isIOS && position.pixels <= 1.0) || (!isIOS && position.pixels <= 0)) &&
        offset > 0) {
      if (onCollapseTriggered != null) {
        Future.microtask(() => onCollapseTriggered!());
      }
      return 0.0;
    }
    return super.applyPhysicsToUserOffset(position, offset);
  }

  @override
  ScrollPhysics buildParent(ScrollPhysics? ancestor) {
    final parentPhysics = isIOS ? const BouncingScrollPhysics() : const ClampingScrollPhysics();
    return parent?.applyTo(ancestor ?? parentPhysics) ?? parentPhysics;
  }
}
