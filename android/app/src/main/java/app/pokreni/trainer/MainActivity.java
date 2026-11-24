package app.pokreni.trainer;

import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /* Coming back from another app (YouTube opened from an exercise video, Zepp, Health Connect), make sure the
       page is running and takes touches again. */
    @Override
    public void onResume() {
        super.onResume();
        if (getBridge() == null) return;
        WebView w = getBridge().getWebView();
        if (w == null) return;
        w.onResume();
        w.resumeTimers();
        w.requestFocus();
    }
}
