import 'package:flutter/services.dart';

class DeviceService {
  static const _channel = MethodChannel('com.media5572.app/device');

  static Future<String> getCpuAbi() async {
    try {
      final abi = await _channel.invokeMethod<String>('getCpuAbi');
      return abi ?? 'arm64-v8a';
    } catch (_) {
      return 'arm64-v8a';
    }
  }

  static bool isArm64(String abi) {
    return abi.contains('arm64') || abi == 'aarch64';
  }

  static String getDownloadUrl(String baseUrl, String abi) {
    if (isArm64(abi)) {
      return '$baseUrl/5572tv-android.apk';
    }
    return '$baseUrl/5572tv-android-armv7a.apk';
  }
}
