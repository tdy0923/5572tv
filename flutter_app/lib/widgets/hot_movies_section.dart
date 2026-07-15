import 'package:flutter/material.dart';
import '../models/douban_movie.dart';
import '../models/play_record.dart';
import '../models/video_info.dart';
import '../services/douban_service.dart';
import 'hot_section.dart';
import 'recommendation_section.dart';
import 'video_menu_bottom_sheet.dart';

class HotMoviesSection extends StatefulWidget {
  final Function(PlayRecord)? onMovieTap;
  final VoidCallback? onMoreTap;
  final Function(VideoInfo, VideoMenuAction)? onGlobalMenuAction;

  const HotMoviesSection({
    super.key,
    this.onMovieTap,
    this.onMoreTap,
    this.onGlobalMenuAction,
  });

  @override
  State<HotMoviesSection> createState() => _HotMoviesSectionState();

  static Future<void> refreshHotMovies() => HotSection.refresh('hot_movies');
}

class _HotMoviesSectionState extends State<HotMoviesSection> {
  @override
  Widget build(BuildContext context) {
    return HotSection(
      sectionId: 'hot_movies',
      title: '热门电影',
      fetchData: () async {
        final result = await DoubanService.getHotMovies(context);
        if (result.success && result.data != null) {
          return result.data!;
        }
        throw Exception('Failed to load hot movies');
      },
      buildContent: (context, data, isLoading, hasError, onRetry) {
        final movies = data as List<DoubanMovie>;
        return RecommendationSection(
          title: '热门电影',
          moreText: '查看更多 >',
          onMoreTap: widget.onMoreTap,
          videoInfos: movies.map((m) => m.toVideoInfo()).toList(),
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
            widget.onMovieTap?.call(playRecord);
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
