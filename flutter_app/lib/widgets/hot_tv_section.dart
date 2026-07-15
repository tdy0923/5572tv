import 'package:flutter/material.dart';
import '../models/douban_movie.dart';
import '../models/play_record.dart';
import '../models/video_info.dart';
import '../services/douban_service.dart';
import 'hot_section.dart';
import 'recommendation_section.dart';
import 'video_menu_bottom_sheet.dart';

class HotTvSection extends StatefulWidget {
  final Function(PlayRecord)? onTvTap;
  final VoidCallback? onMoreTap;
  final Function(VideoInfo, VideoMenuAction)? onGlobalMenuAction;

  const HotTvSection({
    super.key,
    this.onTvTap,
    this.onMoreTap,
    this.onGlobalMenuAction,
  });

  @override
  State<HotTvSection> createState() => _HotTvSectionState();

  static Future<void> refreshHotTvShows() => HotSection.refresh('hot_tv');
}

class _HotTvSectionState extends State<HotTvSection> {
  @override
  Widget build(BuildContext context) {
    return HotSection(
      sectionId: 'hot_tv',
      title: '热门剧集',
      fetchData: () async {
        final result = await DoubanService.getHotTvShows(context);
        if (result.success && result.data != null) {
          return result.data!;
        }
        throw Exception('Failed to load hot tv shows');
      },
      buildContent: (context, data, isLoading, hasError, onRetry) {
        final tvShows = data as List<DoubanMovie>;
        return RecommendationSection(
          title: '热门剧集',
          moreText: '查看更多 >',
          onMoreTap: widget.onMoreTap,
          videoInfos: tvShows.map((m) => m.toVideoInfo()).toList(),
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
            widget.onTvTap?.call(playRecord);
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
