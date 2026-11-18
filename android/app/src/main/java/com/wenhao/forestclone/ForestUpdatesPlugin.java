package com.wenhao.forestclone;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ForestUpdates")
public class ForestUpdatesPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        final MainActivity activity = (MainActivity) getActivity();
        activity.runOnUiThread(() -> {
            try {
                activity.openUpdates();
                call.resolve();
            } catch (RuntimeException error) {
                call.reject("无法打开更新窗口。");
            }
        });
    }
}
