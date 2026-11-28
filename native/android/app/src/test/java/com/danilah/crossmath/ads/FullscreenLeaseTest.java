package com.danilah.crossmath.ads;
import org.junit.Test;
import static org.junit.Assert.*;
public class FullscreenLeaseTest {
    @Test public void preShowDeadlineForbidsLateAutoplay(){FullscreenLease l=new FullscreenLease("a",1500);assertTrue(l.expire(1500));assertFalse(l.willOpen(1501,true));}
    @Test public void displayedAdHasNoGenericTimeout(){FullscreenLease l=new FullscreenLease("a",1500);assertTrue(l.willOpen(1499,true));assertFalse(l.expire(600000));assertFalse(l.terminal());assertTrue(l.finish());}
    @Test public void cannotOpenInBackgroundOrTwice(){FullscreenLease l=new FullscreenLease("a",1500);assertFalse(l.willOpen(100,false));assertTrue(l.willOpen(101,true));assertFalse(l.willOpen(102,true));}
    @Test public void cancelledOwnerRejectsCallbacks(){FullscreenLease l=new FullscreenLease("a",1500);assertTrue(l.finish());assertFalse(l.finish());assertFalse(l.willOpen(101,true));}
    @Test public void exactBoundaryIsExpired(){assertFalse(new FullscreenLease("a",1500).willOpen(1500,true));assertFalse(new FullscreenLease("b",1500).expire(1499));}
}
