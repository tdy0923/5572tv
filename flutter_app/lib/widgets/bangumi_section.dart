import 'package:flutter/material.dart';
import '../models/bangumi.dart';
import '../models/play_record.dart';
import '../models/video_info.dart';
import '../services/bangumi_service.dart';
import 'hot_section.dart';
import 'recommendation_section.dart';
import 'video_menu_bottom_sheet.dart';

class BangumiSection extends StatefulWidget {
  final Function(PlayRecord)? onBangumiTap;
  final VoidCallback? onMoreTap;
  final Function(VideoInfo, VideoMenuAction)? onGlobalMenuAction;

  const BangumiSection({
    super.key,
    this.onBangumiTap,
    this.onMoreTap,
    this.onGlobalMenuAction,
  });

  @override
  State<BangumiSection> createState() => _BangumiSectionState();

  static Future<void> refreshBangumiCalendar() => HotSection.refresh('bangumi');
}

class _BangumiSectionState extends State<BangumiSection> {
  @override
  Widget build(BuildContext context) {
    return HotSection(
      sectionId: 'bangumi',
      title: '新番放送',
      fetchData: () async {
        final result = await BangumiService.getTodayCalendar(context);
        if (result.success && result.data != null) {
          return result.data!;
        }
        throw Exception('Failed to load bangumi calendar');
      },
      buildContent: (context, data, isLoading, hasError, onRetry) {
        final bangumiItems = data as List<BangumiItem>;
        return RecommendationSection(
          title: '新番放送',
          moreText: '查看更多 >',
          onMoreTap: widget.onMoreTap,
          videoInfos: bangumiItems.map((item) => item.toVideoInfo()).toList(),
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
            widget.onBangumiTap?.call(playRecord);
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
