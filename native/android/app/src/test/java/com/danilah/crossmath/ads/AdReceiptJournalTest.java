package com.danilah.crossmath.ads;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.*;
import java.util.*;

public class AdReceiptJournalTest {
    static class Disk implements AdReceiptJournal.Disk {
        byte[] bytes;boolean fail,ambiguous,readFail;
        public byte[] read() throws IOException {if(readFail)throw new IOException();return bytes;}
        public void replace(byte[] next) throws IOException {if(fail)throw new IOException();bytes=next;if(ambiguous)throw new IOException();}
    }
    @Test public void survivesReservationAndEarnedColdRestarts() throws Exception {
        Disk disk=new Disk();AdReceiptJournal j=new AdReceiptJournal(disk);j.reserve("a","p","hint");
        j=new AdReceiptJournal(disk);assertEquals(1,j.unresolved().size());assertTrue(j.pending().isEmpty());
        j.settle("a","earned");j=new AdReceiptJournal(disk);assertEquals("earned",j.pending().get(0).outcome);
        j.acknowledge("a","earned");j=new AdReceiptJournal(disk);assertTrue(j.pending().isEmpty());assertTrue(j.unresolved().isEmpty());
        j.settle("a","earned");assertTrue(j.pending().isEmpty());
    }
    @Test public void staleCancellationAckCannotEraseLateEarned() throws Exception {
        Disk d=new Disk();AdReceiptJournal j=new AdReceiptJournal(d);j.reserve("a","p","hint");
        j.settle("a","cancelled");j.settle("a","earned");j.acknowledge("a","cancelled");
        assertEquals("earned",new AdReceiptJournal(d).pending().get(0).outcome);
    }
    @Test public void earnedMayFollowAnAcknowledgedCancelAfterRestart() throws Exception {
        Disk d=new Disk();AdReceiptJournal j=new AdReceiptJournal(d);j.reserve("a","p","continue");j.settle("a","cancelled");j.acknowledge("a","cancelled");
        j=new AdReceiptJournal(d);j.settle("a","earned");assertEquals(1,j.pending().size());
        j.settle("a","failed");assertEquals("earned",j.pending().get(0).outcome);
    }
    @Test public void failedSaveNeverNotifiesAndAmbiguousSaveRequiresReopen() throws Exception {
        for(boolean ambiguous:new boolean[]{false,true}){
            Disk d=new Disk();AdReceiptJournal j=new AdReceiptJournal(d);j.reserve("a","p","hint");d.fail=!ambiguous;d.ambiguous=ambiguous;
            try{j.settle("a","earned");fail();}catch(IOException expected){}
            d.fail=false;d.ambiguous=false;
            try{j.settle("a","failed");fail();}catch(IOException expected){}
            j=new AdReceiptJournal(d);
            assertEquals(ambiguous?1:0,j.pending().size());assertEquals(ambiguous?0:1,j.unresolved().size());
            if(!ambiguous)j.settle("a","earned");assertEquals("earned",j.pending().get(0).outcome);
        }
    }
    @Test public void failedAckRetainsReceiptAcrossRestart() throws Exception {
        Disk d=new Disk();AdReceiptJournal j=new AdReceiptJournal(d);j.reserve("a","p","win-bonus");j.settle("a","earned");d.fail=true;
        try{j.acknowledge("a","earned");fail();}catch(IOException expected){}
        d.fail=false;j=new AdReceiptJournal(d);assertEquals("earned",j.pending().get(0).outcome);
    }
    @Test public void identifiersAndKindsAreImmutableAndIndependent() throws Exception {
        Disk d=new Disk();AdReceiptJournal j=new AdReceiptJournal(d);j.reserve("a","p1","hint");j.reserve("b","p2","continue");
        try{j.reserve("a","p2","continue");fail();}catch(IOException expected){}
        j.settle("a","earned");j.settle("b","failed");j.acknowledge("a","failed");j.acknowledge("b","failed");
        assertEquals(1,j.pending().size());assertEquals("p1",j.pending().get(0).profileId);
    }
    @Test public void corruptOrUnreadableJournalNeverBecomesFresh() throws Exception {
        Disk d=new Disk();d.bytes=new byte[]{1,2,3};try{new AdReceiptJournal(d);fail();}catch(IOException expected){}
        d.bytes=null;d.readFail=true;try{new AdReceiptJournal(d);fail();}catch(IOException expected){}
    }
    @Test public void longJournalRetainsDedupTombstones() throws Exception {
        Disk d=new Disk();AdReceiptJournal j=new AdReceiptJournal(d);
        for(int i=0;i<1100;i++){j.reserve("a"+i,"p","hint");j.settle("a"+i,"earned");j.acknowledge("a"+i,"earned");}
        j=new AdReceiptJournal(d);assertTrue(j.pending().isEmpty());
        j.settle("a0","earned");assertTrue(j.pending().isEmpty());
        try{j.reserve("a0","p","hint");fail();}catch(IOException expected){}
    }
    @Test public void requestAndAckOfUnknownIdsDoNotCreateRewards() throws Exception {
        Disk d=new Disk();AdReceiptJournal j=new AdReceiptJournal(d);
        j.acknowledge("missing","earned");try{j.settle("missing","earned");fail();}catch(IOException expected){}
        assertTrue(j.pending().isEmpty());assertNull(d.bytes);
    }
    @Test public void oldActivityCallbackRebasesOnNewActivityRequestsAndOutcome() throws Exception {
        Disk d=new Disk();AdReceiptJournal old=new AdReceiptJournal(d);old.reserve("old","p","hint");old.settle("old","cancelled");
        AdReceiptJournal reopened=new AdReceiptJournal(d);reopened.reserve("new","p","hint");reopened.settle("old","earned");
        old.acknowledge("old","cancelled");assertEquals("earned",old.pending().get(0).outcome);
        old.settle("old","earned");reopened.settle("new","earned");old.acknowledge("old","earned");
        assertEquals(1,reopened.pending().size());assertEquals("new",reopened.pending().get(0).id);
    }
}
