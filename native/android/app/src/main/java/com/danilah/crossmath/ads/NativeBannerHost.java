package com.danilah.crossmath.ads;

import android.view.*;
import android.webkit.WebView;
import android.widget.FrameLayout;

/** Native sibling, never an overlay: the content root has already consumed safe insets. */
public final class NativeBannerHost {
    private final FrameLayout host,slot;
    private final WebView web;
    private View creative;
    private int reserved;
    private final View.OnLayoutChangeListener layout;
    public NativeBannerHost(WebView web,Runnable reconcile){
        this.web=web;ViewGroup parent=(ViewGroup)web.getParent();int index=parent.indexOfChild(web);
        ViewGroup.LayoutParams original=web.getLayoutParams();parent.removeView(web);
        host=new FrameLayout(web.getContext());parent.addView(host,index,original);
        host.addView(web,new FrameLayout.LayoutParams(-1,-1));
        slot=new FrameLayout(web.getContext());slot.setVisibility(View.GONE);
        host.addView(slot,new FrameLayout.LayoutParams(-1,0,Gravity.BOTTOM));
        layout=(v,l,t,r,b,ol,ot,or,ob)->{if(r-l!=or-ol||b-t!=ob-ot)host.post(reconcile);};
        host.addOnLayoutChangeListener(layout);
    }
    public int width(){return host.getWidth();}
    public boolean apply(View view){
        if(view==null||width()<=0){hide();return false;}
        if(view!=creative){
            hide();if(view.getParent()!=null)throw new IllegalArgumentException("Banner already owned");slot.removeAllViews();
            creative=view;slot.addView(view,new FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM));
        }
        view.measure(View.MeasureSpec.makeMeasureSpec(width(),View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));
        int height=view.getMeasuredHeight();
        if(height<=0||height>=host.getHeight()){hide();return false;}
        // Height comes from the current SDK view at this width, not a guessed CSS/dp constant.
        FrameLayout.LayoutParams banner=(FrameLayout.LayoutParams)slot.getLayoutParams();banner.height=height;slot.setLayoutParams(banner);
        FrameLayout.LayoutParams page=(FrameLayout.LayoutParams)web.getLayoutParams();
        if(reserved!=height){page.bottomMargin=height;web.setLayoutParams(page);reserved=height;}
        slot.setVisibility(View.VISIBLE);
        return true;
    }
    public void hide(){
        slot.setVisibility(View.GONE);
        if(reserved!=0){FrameLayout.LayoutParams page=(FrameLayout.LayoutParams)web.getLayoutParams();page.bottomMargin=0;web.setLayoutParams(page);reserved=0;}
    }
    public void dispose(){hide();host.removeOnLayoutChangeListener(layout);slot.removeAllViews();creative=null;}
}
