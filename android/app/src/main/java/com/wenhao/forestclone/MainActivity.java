package com.wenhao.forestclone;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private UpdateBridge updates;

    @Override
    public void onCreate(Bundle state) {
        registerPlugin(ForestUpdatesPlugin.class);
        super.onCreate(state);
        updates = new UpdateBridge(this, getBridge().getWebView());
    }

    void openUpdates() {
        if (updates == null) throw new IllegalStateException("更新组件尚未就绪。");
        updates.open();
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
