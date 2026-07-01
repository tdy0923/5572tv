import 'package:flutter/material.dart';

class FontUtils {
  /// 获取系统默认字体样式（不依赖网络）
  static TextStyle systemFont({
    double? fontSize,
    FontWeight? fontWeight,
    Color? color,
    double? letterSpacing,
    double? height,
    FontStyle? fontStyle,
  }) {
    return TextStyle(
      fontFamily: 'Roboto',
      fontSize: fontSize,
      fontWeight: fontWeight ?? FontWeight.w500,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
      fontStyle: fontStyle,
    );
  }

  /// 获取标题字体样式
  static TextStyle heading({
    double? fontSize,
    FontWeight? fontWeight,
    Color? color,
    double? letterSpacing,
    double? height,
    FontStyle? fontStyle,
  }) {
    return TextStyle(
      fontFamily: 'Roboto',
      fontSize: fontSize,
      fontWeight: fontWeight ?? FontWeight.w700,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
      fontStyle: fontStyle,
    );
  }

  /// 获取等宽字体样式
  static TextStyle monospace({
    double? fontSize,
    FontWeight? fontWeight,
    Color? color,
    double? letterSpacing,
    double? height,
    FontStyle? fontStyle,
  }) {
    return TextStyle(
      fontFamily: 'monospace',
      fontSize: fontSize,
      fontWeight: fontWeight ?? FontWeight.w400,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
      fontStyle: fontStyle,
    );
  }
}
