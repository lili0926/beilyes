package com.personal.memorypalace;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** 开机后自动把常驻推送服务拉起来，否则重启手机就再也收不到他的消息。 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            try { AriesPushService.start(context); } catch (Exception ignored) {}
        }
    }
}
