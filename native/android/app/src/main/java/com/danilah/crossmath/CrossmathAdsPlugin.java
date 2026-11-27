package com.danilah.crossmath;

import android.os.*;
import android.util.AtomicFile;
import android.view.ViewTreeObserver;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.danilah.crossmath.ads.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** Durable optional ads bridge. No SDK is selected and every format is unavailable by default. */
@CapacitorPlugin(name="CrossmathAds")
public class CrossmathAdsPlugin extends Plugin {
    private final Handler main=new Handler(Looper.getMainLooper());
    private CrossmathAdProvider provider;
    private volatile AdReceiptJournal journal;
    private volatile AdReceiptJournal.Disk journalDisk;
    private final Map<String,String> undelivered=new ConcurrentHashMap<>();
    private volatile boolean disposed;
    private boolean foreground=true,bannerDesired;
    private NativeBannerHost banner;
    private Show current;
    private ViewTreeObserver.OnWindowFocusChangeListener focus;
    private static final class Show {
        final FullscreenLease lease;final PluginCall call;final String requestId;
        volatile boolean reserved;
        Show(FullscreenLease l,PluginCall c,String r){lease=l;call=c;requestId=r;}
    }
    // Deliberate SDK integration point. Changing this requires owner approval + native acceptance.
    protected CrossmathAdProvider createProvider(){return new CrossmathAdProvider.Unconfigured();}
    @Override public void load(){
        provider=createProvider();
        focus=hasFocus->reconcileBanner();bridge.getWebView().getViewTreeObserver().addOnWindowFocusChangeListener(focus);
        bridge.getWebView().addOnLayoutChangeListener((v,l,t,r,b,ol,ot,or,ob)->{if(r-l!=or-ol)reconcileBanner();});
        GameStoragePlugin.IO.execute(()->{
            try{
                File directory=new File(getContext().getNoBackupFilesDir(),"crossmath-ads-v2");
                if(!directory.isDirectory()&&!directory.mkdirs())throw new IOException("Journal directory");
                AtomicFile file=new AtomicFile(new File(directory,"receipts.bin"));
                journalDisk=new AdReceiptJournal.Disk(){
                    public byte[] read() throws IOException {
                        try{return file.readFully();}catch(FileNotFoundException error){if(file.getBaseFile().exists()||new File(file.getBaseFile()+".bak").exists())throw error;return null;}
                    }
                    public void replace(byte[] bytes) throws IOException {
                        FileOutputStream out=null;
                        try{out=file.startWrite();out.write(bytes);file.finishWrite(out);out=null;}
                        finally{if(out!=null)file.failWrite(out);}
                    }
                };
                AdReceiptJournal opened=new AdReceiptJournal(journalDisk);
                if(!disposed)journal=opened;
            }catch(Exception error){journal=null;}
            main.post(()->{if(disposed)return;startProvider();statusChanged();});
        });
    }
    private void startProvider(){
        try{provider.start(getActivity(),new CrossmathAdProvider.Events(){
            public void availabilityChanged(){main.post(()->{if(!disposed){statusChanged();reconcileBanner();}});}
            public void recovered(String id,String outcome){persistReceipt(id,outcome);}
        });if(journal!=null)provider.recover(journal.unresolved());}catch(Exception error){/* unavailable, never a gameplay prerequisite */}
    }
    private boolean active(){return !disposed&&foreground&&getActivity()!=null&&!getActivity().isFinishing()&&getActivity().getWindow().getDecorView().hasWindowFocus();}
    private JSObject status(){
        JSObject state=new JSObject();boolean rewarded=false,interstitial=false,hasBanner=false,bonus=false;
        try{boolean enabled=!disposed&&journal!=null&&provider!=null&&provider.configured();rewarded=enabled&&provider.rewardedReady();interstitial=enabled&&provider.interstitialReady();hasBanner=enabled&&provider.bannerReady();bonus=enabled&&provider.supportsWinBonus();}
        catch(Exception error){rewarded=false;interstitial=false;hasBanner=false;bonus=false;}
        state.put("protocolVersion",2);state.put("rewarded",rewarded);state.put("interstitial",interstitial);state.put("banner",hasBanner);
        JSArray kinds=new JSArray();kinds.put("hint");kinds.put("continue");if(bonus)kinds.put("win-bonus");state.put("rewardKinds",kinds);return state;
    }
    private void statusChanged(){if(!disposed)notifyListeners("availabilityChanged",status());}
    @PluginMethod public void availability(PluginCall call){GameStoragePlugin.IO.execute(this::retryReceipts);main.post(()->{try{if(!disposed)provider.refresh();call.resolve(status());}catch(Exception error){call.reject("Ad availability failed");}});}
    @PluginMethod public void pendingRewards(PluginCall call){GameStoragePlugin.IO.execute(()->{
        try{if(journal==null)throw new IOException();JSArray receipts=new JSArray();for(AdReceiptJournal.Receipt r:journal.pending())receipts.put(event(r));JSObject result=new JSObject();result.put("receipts",receipts);call.resolve(result);}
        catch(Exception error){call.reject("Ad receipt recovery unavailable");}
    });}
    @PluginMethod public void acknowledge(PluginCall call){
        String id=call.getString("id"),outcome=call.getString("outcome");
        GameStoragePlugin.IO.execute(()->{try{if(journal==null||id==null||outcome==null)throw new IOException();journal.acknowledge(id,outcome);call.resolve();}catch(Exception error){journal=null;call.reject("Ad acknowledgement failed");}});
    }
    private JSObject event(AdReceiptJournal.Receipt r){JSObject event=new JSObject();event.put("id",r.id);event.put("profileId",r.profileId);event.put("outcome",r.outcome);return event;}
    private void persistReceipt(String id,String outcome){
        if(id==null||!Arrays.asList("earned","cancelled","failed").contains(outcome))return;
        undelivered.merge(id,outcome,(old,next)->"earned".equals(old)?old:next);
        GameStoragePlugin.IO.execute(this::retryReceipts);
    }
    private void retryReceipts(){
        if(journal==null&&journalDisk!=null){try{journal=new AdReceiptJournal(journalDisk);}catch(Exception error){return;}}
        for(Map.Entry<String,String> entry:new HashMap<>(undelivered).entrySet()){
            try{
                if(journal==null)throw new IOException();AdReceiptJournal.Receipt receipt=journal.settle(entry.getKey(),entry.getValue());
                undelivered.remove(entry.getKey(),entry.getValue());
                // Journal commit/readback precedes notification. Failure leaves the request pending.
                main.post(()->{if(!disposed&&!receipt.acknowledged)notifyListeners("rewardSettled",event(receipt));});
            }catch(Exception error){journal=null;return;}
        }
    }
    @PluginMethod public void showRewarded(PluginCall call){main.post(()->safeShow(call,true));}
    @PluginMethod public void showInterstitial(PluginCall call){main.post(()->safeShow(call,false));}
    @PluginMethod public void cancelUnopened(PluginCall call){main.post(()->{
        String id=call.getString("presentationId");Show show=current;boolean opened=show!=null&&show.lease.id.equals(id)&&show.lease.opened();
        if(show!=null&&show.lease.id.equals(id)&&!opened)finish(show,"cancelled");
        JSObject result=new JSObject();result.put("state",opened?"opened":"closed");call.resolve(result);
    });}
    private void safeShow(PluginCall call,boolean rewarded){try{show(call,rewarded);}catch(Exception error){if(current!=null&&current.call==call)finish(current,"failed");else resolve(call,"failed");}}
    private void show(PluginCall call,boolean rewarded){
        String presentation=call.getString("presentationId"),id=rewarded?call.getString("id"):null;
        long startBefore=BridgeNumbers.counter(call.getData().opt("startBefore")),remaining=startBefore-System.currentTimeMillis();
        String kind=call.getString("kind"),profile=call.getString("profileId");
        if(current!=null||!active()||journal==null||!provider.configured()||remaining<=0||remaining>1500||presentation==null||presentation.isEmpty()||
          (rewarded? !provider.rewardedReady()||!Arrays.asList("hint","continue","win-bonus").contains(kind)||"win-bonus".equals(kind)&&!provider.supportsWinBonus():!provider.interstitialReady())){
            if(rewarded&&journal!=null){GameStoragePlugin.IO.execute(()->{try{journal.reserve(id,profile,kind);persistReceipt(id,"failed");}catch(Exception error){/* Do not overwrite a pre-existing request. */}});}
            resolve(call,"unavailable");return;
        }
        Show show=new Show(new FullscreenLease(presentation,SystemClock.elapsedRealtime()+remaining),call,id);current=show;reconcileBanner();
        Runnable begin=()->{
            if(disposed||current!=show||!active()||show.lease.terminal()||show.lease.expire(SystemClock.elapsedRealtime())){if(show.reserved)persistReceipt(id,"failed");finish(show,"unavailable");return;}
            CrossmathAdProvider.Fullscreen callbacks=new CrossmathAdProvider.Fullscreen(){
                public boolean willOpen(){
                    // SDK integration must call on main, immediately before show. Reject stale ownership.
                    if(Looper.myLooper()!=Looper.getMainLooper()||current!=show||!show.lease.willOpen(SystemClock.elapsedRealtime(),active()))return false;
                    JSObject event=new JSObject();event.put("presentationId",presentation);notifyListeners("fullscreenOpened",event);reconcileBanner();return true;
                }
                public void earned(){if(rewarded&&show.lease.opened())persistReceipt(id,"earned");}
                public void closed(){main.post(()->finish(show,show.lease.opened()?"shown":"cancelled"));}
                public void failed(){main.post(()->finish(show,show.lease.opened()?"shown":"failed"));}
            };
            try{if(rewarded)provider.showRewarded(id,kind,callbacks);else provider.showInterstitial(callbacks);}
            catch(Exception error){finish(show,"failed");}
        };
        main.postDelayed(()->{if(current==show&&show.lease.expire(SystemClock.elapsedRealtime()))finish(show,"unavailable");},remaining);
        if(rewarded){
            GameStoragePlugin.IO.execute(()->{
                try{journal.reserve(id,profile,kind);show.reserved=true;main.post(begin);}
                catch(Exception error){main.post(()->finish(show,"failed"));}
            });
        }else begin.run();
    }
    private void finish(Show show,String outcome){
        if(current!=show)return;
        show.lease.finish();current=null;
        // A terminal no-reward receipt is revisable by an honest late earned callback.
        if(show.requestId!=null&&show.reserved)persistReceipt(show.requestId,"cancelled".equals(outcome)||"shown".equals(outcome)?"cancelled":"failed");
        resolve(show.call,outcome);reconcileBanner();statusChanged();
    }
    private void resolve(PluginCall call,String outcome){JSObject result=new JSObject();result.put("result",outcome);call.resolve(result);}
    @PluginMethod public void setBanner(PluginCall call){main.post(()->{
        try{bannerDesired=Boolean.TRUE.equals(call.getBoolean("visible",false));reconcileBanner();call.resolve();}
        catch(Exception error){call.reject("Banner intent failed");}
    });}
    private void reconcileBanner(){
        if(provider==null)return;
        try{
            boolean visible=bannerDesired&&active()&&current==null&&journal!=null&&provider.configured()&&provider.bannerReady();
            if(visible){if(banner==null)banner=new NativeBannerHost(bridge.getWebView(),this::reconcileBanner);visible=banner.width()>0&&banner.apply(provider.banner(banner.width()));}
            else if(banner!=null)banner.hide();
            provider.bannerVisible(visible);
        }catch(Exception error){if(banner!=null)banner.hide();}
    }
    @Override protected void handleOnPause(){foreground=false;reconcileBanner();if(current!=null&&!current.lease.opened())finish(current,"cancelled");}
    @Override protected void handleOnResume(){foreground=true;reconcileBanner();statusChanged();}
    @Override protected void handleOnDestroy(){
        disposed=true;foreground=false;
        if(current!=null){Show show=current;current=null;show.lease.finish();resolve(show.call,"cancelled");}
        if(focus!=null&&bridge.getWebView().getViewTreeObserver().isAlive())bridge.getWebView().getViewTreeObserver().removeOnWindowFocusChangeListener(focus);
        if(banner!=null)banner.dispose();provider.dispose();
    }
}
