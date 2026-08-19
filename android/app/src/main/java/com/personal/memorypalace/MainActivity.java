package com.personal.memorypalace;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PocketBrowserPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
