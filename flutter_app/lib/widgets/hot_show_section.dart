import 'package:flutter/material.dart';
import '../models/douban_movie.dart';
import '../models/play_record.dart';
import '../models/video_info.dart';
import '../services/douban_service.dart';
import 'hot_section.dart';
import 'recommendation_section.dart';
import 'video_menu_bottom_sheet.dart';

class HotShowSection extends StatefulWidget {
  final Function(PlayRecord)? onShowTap;
  final VoidCallback? onMoreTap;
  final Function(VideoInfo, VideoMenuAction)? onGlobalMenuAction;

  const HotShowSection({
    super.key,
    this.onShowTap,
    this.onMoreTap,
    this.onGlobalMenuAction,
  });

  @override
  State<HotShowSection> createState() => _HotShowSectionState();

  static Future<void> refreshHotShows() => HotSection.refresh('hot_show');
}

class _HotShowSectionState extends State<HotShowSection> {
  @override
  Widget build(BuildContext context) {
    return HotSection(
      sectionId: 'hot_show',
      title: '热门综艺',
      fetchData: () async {
        final result = await DoubanService.getHotShows(context);
        if (result.success && result.data != null && result.data!.isNotEmpty) {
          return result.data!;
        }
        throw Exception('Failed to load hot shows');
      },
      buildContent: (context, data, isLoading, hasError, onRetry) {
        final shows = data as List<DoubanMovie>;
        return RecommendationSection(
          title: '热门综艺',
          moreText: '查看更多 >',
          onMoreTap: widget.onMoreTap,
          videoInfos: shows.map((m) => m.toVideoInfo()).toList(),
          onItemTap: (videoInfo) {
            final playRecord = PlayRecord(
              id: videoInfo.id,
              source: videoInfo.source,
              title: videoInfo.title,
              sourceName: videoInfo.sourceName,
              year: videoInfo.year,
              cover: videoInfo.cover,
              index: videoInfo.index,
              totalEpisodes: videoInfo.totalEpisodes,
              playTime: videoInfo.playTime,
              totalTime: videoInfo.totalTime,
              saveTime: videoInfo.saveTime,
              searchTitle: videoInfo.searchTitle,
            );
            widget.onShowTap?.call(playRecord);
          },
          onGlobalMenuAction: widget.onGlobalMenuAction,
          isLoading: isLoading,
          hasError: hasError,
          onRetry: onRetry,
          cardCount: 2.75,
        );
      },
    );
  }
}
