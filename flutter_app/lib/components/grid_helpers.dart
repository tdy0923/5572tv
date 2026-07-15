import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:media_5572/theme/app_theme.dart';
import '../utils/font_utils.dart';
import '../utils/device_utils.dart';
import '../components/app_button.dart';
import '../widgets/shimmer_effect.dart';
import '../widgets/custom_refresh_indicator.dart';

class GridSkeletonCard extends StatelessWidget {
  final double width;

  const GridSkeletonCard({super.key, required this.width});

  @override
  Widget build(BuildContext context) {
    final double height = width * 1.4;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        ShimmerEffect(
          width: width,
          height: height,
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        ),
        const SizedBox(height: 4),
        Center(
          child: ShimmerEffect(
            width: width * 0.8,
            height: 12,
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          ),
        ),
        const SizedBox(height: 2),
        Center(
          child: ShimmerEffect(
            width: width * 0.6,
            height: 8,
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          ),
        ),
      ],
    );
  }
}

class GridLoadingState extends StatelessWidget {
  final Future<void> Function() onRefresh;

  const GridLoadingState({super.key, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return AppRefreshIndicator(
      onRefresh: onRefresh,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final int crossAxisCount = DeviceUtils.getTabletColumnCount(context);
          final isTablet = DeviceUtils.isTablet(context);

          final double screenWidth = constraints.maxWidth;
          const double padding = 16.0;
          const double spacing = 12.0;
          final double availableWidth =
              screenWidth - (padding * 2) - (spacing * (crossAxisCount - 1));
          const double minItemWidth = 80.0;
          final double calculatedItemWidth = availableWidth / crossAxisCount;
          final double itemWidth = math.max(calculatedItemWidth, minItemWidth);
          final double itemHeight = itemWidth * 2.0;

          return FocusTraversalGroup(
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: crossAxisCount,
                childAspectRatio: itemWidth / itemHeight,
                crossAxisSpacing: spacing,
                mainAxisSpacing: isTablet ? 0 : 16,
              ),
              itemCount: isTablet ? crossAxisCount * 2 : 6,
              itemBuilder: (context, index) {
                return GridSkeletonCard(width: itemWidth);
              },
            ),
          );
        },
      ),
    );
  }
}

class GridErrorState extends StatelessWidget {
  final String? message;
  final VoidCallback? onRetry;

  const GridErrorState({super.key, this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.error_outline,
            size: 80,
            color: AppTheme.stroke,
          ),
          const SizedBox(height: 24),
          Text(
            '加载失败',
            style: FontUtils.systemFont(
              fontSize: 18,
              fontWeight: FontWeight.w500,
              color: AppTheme.foregroundMuted,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            message ?? '未知错误',
            style: FontUtils.systemFont(
              fontSize: 14,
              color: AppTheme.foregroundMuted,
            ),
            textAlign: TextAlign.center,
          ),
          if (onRetry != null) ...[
            const SizedBox(height: 24),
            AppButton(
              label: '重试',
              onPressed: onRetry,
              color: AppTheme.success,
            ),
          ],
        ],
      ),
    );
  }
}

class GridEmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  final String? subtitle;

  const GridEmptyState({
    super.key,
    required this.icon,
    required this.message,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.only(top: 120.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 80,
              color: AppTheme.stroke,
            ),
            const SizedBox(height: 24),
            Text(
              message,
              style: FontUtils.systemFont(
                fontSize: 18,
                fontWeight: FontWeight.w500,
                color: AppTheme.foregroundMuted,
              ),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 12),
              Text(
                subtitle!,
                style: FontUtils.systemFont(
                  fontSize: 14,
                  color: AppTheme.foregroundMuted,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
