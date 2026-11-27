package com.danilah.crossmath.ads;

/** One presentation owner. A pre-show timeout is never a timeout of an opened SDK. */
public final class FullscreenLease {
    public final String id;
    private final long deadline;
    private boolean opened, terminal;
    public FullscreenLease(String id,long deadline){this.id=id;this.deadline=deadline;}
    public synchronized boolean willOpen(long now,boolean foreground){
        if(terminal||opened||!foreground||now>=deadline)return false;
        opened=true;return true;
    }
    public synchronized boolean expire(long now){if(terminal||opened||now<deadline)return false;terminal=true;return true;}
    public synchronized boolean finish(){if(terminal)return false;terminal=true;return true;}
    public synchronized boolean opened(){return opened;}
    public synchronized boolean terminal(){return terminal;}
}
