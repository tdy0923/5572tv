package com.media5572.app

import android.os.Build
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.media5572.app/device")
            .setMethodCallHandler { call, result ->
                if (call.method == "getCpuAbi") {
                    result.success(Build.SUPPORTED_ABIS.firstOrNull() ?: "arm64-v8a")
                } else {
                    result.notImplemented()
                }
            }
    }
}
