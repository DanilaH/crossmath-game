package com.danilah.crossmath.ads;

import android.app.Activity;
import android.view.View;
import java.util.List;

/** App-owned seam for the SDK chosen by the owner. All view/show methods run on main. */
public interface CrossmathAdProvider {
    interface Fullscreen {
        // MUST claim immediately before the synchronous SDK show call. False forbids showing.
        boolean willOpen();
        void earned(); // only the SDK reward callback; never load/impression/close
        void closed();
        void failed();
    }
    interface Events {
        void availabilityChanged();
        void recovered(String requestId,String outcome);
    }
    String name();
    boolean configured(); // includes approved configuration/consent; false prohibits SDK requests
    boolean rewardedReady();
    boolean interstitialReady();
    // Means format/view with known dimensions is supported, NOT loaded/painted/impression.
    // Retain the same measured neutral view through loading/no-fill. Do not clear on load failure.
    boolean bannerReady();
    boolean supportsWinBonus();
    // Async preload with bounded retry/backoff. start/refresh may never block first paint.
    // Completion changes readiness only. Duplicate/late load callbacks never authorize show.
    void start(Activity activity,Events events);
    void refresh();
    // Unresolved durable requests remain unknown until SDK-specific evidence resolves them.
    void recover(List<AdReceiptJournal.Receipt> unresolved);
    void showRewarded(String requestId,String kind,Fullscreen callbacks);
    void showInterstitial(Fullscreen callbacks);
    // Return the SAME owned current-width SDK View, unscaled; invalidate width generations.
    // The host reserves its measured height outside WebView, through loading/no-fill.
    View banner(int widthPx);
    void bannerVisible(boolean visible);
    void dispose();

    final class Unconfigured implements CrossmathAdProvider {
        public String name(){return "unconfigured";}public boolean configured(){return false;}
        public boolean rewardedReady(){return false;}public boolean interstitialReady(){return false;}
        public boolean bannerReady(){return false;}public boolean supportsWinBonus(){return false;}
        public void start(Activity a,Events e){}public void refresh(){}public void recover(List<AdReceiptJournal.Receipt> r){}
        public void showRewarded(String id,String kind,Fullscreen c){c.failed();}public void showInterstitial(Fullscreen c){c.failed();}
        public View banner(int width){return null;}public void bannerVisible(boolean v){}public void dispose(){}
    }
}
