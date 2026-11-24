package com.nasir.bazaarrun;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        immersive();
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (getBridge() == null) { finish(); return; }
                getBridge().getWebView().evaluateJavascript(
                    "(()=>{if(typeof window.androidBack==='function')return window.androidBack();if(typeof running!=='undefined'&&running){pause();return true;}return false;})()",
                    paused -> { if (!"true".equals(paused)) finish(); });
            }
        });
    }
    private void immersive() {
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
    @Override public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (focused) immersive();
    }
    @Override public void onPause() {
        if (getBridge() != null) getBridge().getWebView().evaluateJavascript("if(typeof running!=='undefined'&&running)pause();", null);
        super.onPause();
    }
}
