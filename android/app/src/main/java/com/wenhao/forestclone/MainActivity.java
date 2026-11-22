package com.wenhao.forestclone;

import android.content.Intent;
import android.os.Bundle;
import android.app.AlertDialog;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private UpdateBridge updates;

    @Override
    public void onCreate(Bundle state) {
        registerPlugin(ForestUpdatesPlugin.class);
        super.onCreate(state);
        updates = new UpdateBridge(this, getBridge().getWebView());
        if (getPackageName().equals("com.wenhao.forestclone.privateupdates")
                && !getPreferences(MODE_PRIVATE).getBoolean("migrationIntroSeen", false)) {
            new AlertDialog.Builder(this)
                    .setTitle("从旧版专注森林迁入")
                    .setMessage("如果装有旧版，请保留它。打开旧版的「统计 → 存档备份与迁移」复制或导出存档，再回到「专注森林·新版」的同一页导入。核对专注记录、最近一条记录和金币后再整理旧版。使用 Gist 同步的设备可在新版重新连接自己的账号。")
                    .setPositiveButton("知道了", (dialog, which) ->
                            getPreferences(MODE_PRIVATE).edit().putBoolean("migrationIntroSeen", true).apply())
                    .show();
        }
    }

    void openUpdates() {
        if (updates == null) throw new IllegalStateException("更新组件尚未就绪。");
        updates.open();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && updates != null) updates.autoCheck();
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (updates != null) updates.onActivityResult(requestCode);
    }

    @Override
    public void onDestroy() {
        if (updates != null) updates.close();
        super.onDestroy();
    }
}
