import 'package:flutter/material.dart';

enum AppTextVariant { display, headline, title, body, caption, label, monospace }

class AppText extends StatelessWidget {
  final String data;
  final AppTextVariant variant;
  final Color? color;
  final TextAlign? textAlign;
  final int? maxLines;
  final TextOverflow? overflow;
  final double? fontSize;
  final FontWeight? fontWeight;
  final double? letterSpacing;
  final double? height;

  const AppText(
    this.data, {
    super.key,
    this.variant = AppTextVariant.body,
    this.color,
    this.textAlign,
    this.maxLines,
    this.overflow,
    this.fontSize,
    this.fontWeight,
    this.letterSpacing,
    this.height,
  });

  factory AppText.body(
    String data, {
    Key? key,
    Color? color,
    TextAlign? textAlign,
    int? maxLines,
    TextOverflow? overflow,
    double? fontSize,
    FontWeight? fontWeight,
    double? letterSpacing,
    double? height,
  }) {
    return AppText(
      data,
      key: key,
      variant: AppTextVariant.body,
      color: color,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
      fontSize: fontSize,
      fontWeight: fontWeight,
      letterSpacing: letterSpacing,
      height: height,
    );
  }

  factory AppText.heading(
    String data, {
    Key? key,
    Color? color,
    TextAlign? textAlign,
    int? maxLines,
    TextOverflow? overflow,
    double? fontSize,
    FontWeight? fontWeight,
    double? letterSpacing,
    double? height,
  }) {
    return AppText(
      data,
      key: key,
      variant: AppTextVariant.headline,
      color: color,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
      fontSize: fontSize,
      fontWeight: fontWeight,
      letterSpacing: letterSpacing,
      height: height,
    );
  }

  factory AppText.monospace(
    String data, {
    Key? key,
    Color? color,
    TextAlign? textAlign,
    int? maxLines,
    TextOverflow? overflow,
    double? fontSize,
    FontWeight? fontWeight,
    double? letterSpacing,
    double? height,
  }) {
    return AppText(
      data,
      key: key,
      variant: AppTextVariant.monospace,
      color: color,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
      fontSize: fontSize,
      fontWeight: fontWeight,
      letterSpacing: letterSpacing,
      height: height,
    );
  }

  factory AppText.display(
    String data, {
    Key? key,
    Color? color,
    TextAlign? textAlign,
    int? maxLines,
    TextOverflow? overflow,
    double? fontSize,
    FontWeight? fontWeight,
    double? letterSpacing,
    double? height,
  }) {
    return AppText(
      data,
      key: key,
      variant: AppTextVariant.display,
      color: color,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
      fontSize: fontSize,
      fontWeight: fontWeight,
      letterSpacing: letterSpacing,
      height: height,
    );
  }

  factory AppText.title(
    String data, {
    Key? key,
    Color? color,
    TextAlign? textAlign,
    int? maxLines,
    TextOverflow? overflow,
    double? fontSize,
    FontWeight? fontWeight,
    double? letterSpacing,
    double? height,
  }) {
    return AppText(
      data,
      key: key,
      variant: AppTextVariant.title,
      color: color,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
      fontSize: fontSize,
      fontWeight: fontWeight,
      letterSpacing: letterSpacing,
      height: height,
    );
  }

  factory AppText.caption(
    String data, {
    Key? key,
    Color? color,
    TextAlign? textAlign,
    int? maxLines,
    TextOverflow? overflow,
    double? fontSize,
    FontWeight? fontWeight,
    double? letterSpacing,
    double? height,
  }) {
    return AppText(
      data,
      key: key,
      variant: AppTextVariant.caption,
      color: color,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
      fontSize: fontSize,
      fontWeight: fontWeight,
      letterSpacing: letterSpacing,
      height: height,
    );
  }

  factory AppText.label(
    String data, {
    Key? key,
    Color? color,
    TextAlign? textAlign,
    int? maxLines,
    TextOverflow? overflow,
    double? fontSize,
    FontWeight? fontWeight,
    double? letterSpacing,
    double? height,
  }) {
    return AppText(
      data,
      key: key,
      variant: AppTextVariant.label,
      color: color,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
      fontSize: fontSize,
      fontWeight: fontWeight,
      letterSpacing: letterSpacing,
      height: height,
    );
  }

  @override
  Widget build(BuildContext context) {
    final defaultStyle = DefaultTextStyle.of(context).style;
    final textTheme = Theme.of(context).textTheme;

    final themeStyle = _getThemeStyle(textTheme);
    final merged = defaultStyle.merge(themeStyle);

    return Text(
      data,
      style: merged.copyWith(
        color: color,
        fontSize: fontSize,
        fontWeight: fontWeight,
        letterSpacing: letterSpacing,
        height: height,
      ),
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
    );
  }

  TextStyle _getThemeStyle(TextTheme textTheme) {
    switch (variant) {
      case AppTextVariant.display:
        return textTheme.displaySmall ?? const TextStyle(fontSize: 32, fontWeight: FontWeight.w700);
      case AppTextVariant.headline:
        return textTheme.headlineSmall ?? const TextStyle(fontSize: 24, fontWeight: FontWeight.w600);
      case AppTextVariant.title:
        return textTheme.titleMedium ?? const TextStyle(fontSize: 18, fontWeight: FontWeight.w600);
      case AppTextVariant.body:
        return textTheme.bodyMedium ?? const TextStyle(fontSize: 14, fontWeight: FontWeight.w400);
      case AppTextVariant.caption:
        return textTheme.bodySmall ?? const TextStyle(fontSize: 12, fontWeight: FontWeight.w400);
      case AppTextVariant.label:
        return textTheme.labelMedium ?? const TextStyle(fontSize: 13, fontWeight: FontWeight.w500);
      case AppTextVariant.monospace:
        return const TextStyle(fontFamily: 'monospace', fontSize: 13, fontWeight: FontWeight.w400);
    }
  }
}
