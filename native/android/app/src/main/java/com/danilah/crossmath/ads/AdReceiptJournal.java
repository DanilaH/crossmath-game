package com.danilah.crossmath.ads;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Durable native authority before JS notification. No SDK or Android dependencies. */
public final class AdReceiptJournal {
    public interface Disk { byte[] read() throws IOException; void replace(byte[] bytes) throws IOException; }
    public static final class Receipt {
        public final String id, profileId, kind, outcome;
        public final boolean acknowledged;
        Receipt(String id,String profileId,String kind,String outcome,boolean acknowledged) {
            this.id=id;this.profileId=profileId;this.kind=kind;this.outcome=outcome;this.acknowledged=acknowledged;
        }
    }
    private final Disk disk;
    private LinkedHashMap<String,Receipt> entries;
    private boolean healthy=true;
    public AdReceiptJournal(Disk disk) throws IOException {this.disk=disk;entries=decode(disk.read());}
    public synchronized void reserve(String id,String profileId,String kind) throws IOException {
        refresh();
        check(id);check(profileId);
        if(!Arrays.asList("hint","continue","win-bonus").contains(kind))throw new IOException("Unknown kind");
        if(entries.containsKey(id))throw new IOException("Request already reserved");
        LinkedHashMap<String,Receipt> next=new LinkedHashMap<>(entries);
        next.put(id,new Receipt(id,profileId,kind,null,false));commit(next);
    }
    public synchronized Receipt settle(String id,String outcome) throws IOException {
        refresh();
        if(!Arrays.asList("earned","cancelled","failed").contains(outcome))throw new IOException("Unknown outcome");
        Receipt old=entries.get(id);if(old==null)throw new IOException("Unmatched receipt");
        // Earned dominates a delayed cancellation/failure, including after an earlier ack.
        if("earned".equals(old.outcome)||outcome.equals(old.outcome)||old.outcome!=null&&!outcome.equals("earned"))return old;
        LinkedHashMap<String,Receipt> next=new LinkedHashMap<>(entries);
        Receipt receipt=new Receipt(old.id,old.profileId,old.kind,outcome,false);next.put(id,receipt);commit(next);return receipt;
    }
    public synchronized void acknowledge(String id,String outcome) throws IOException {
        refresh();
        Receipt old=entries.get(id);
        if(old==null||old.outcome==null||!old.outcome.equals(outcome))return;
        LinkedHashMap<String,Receipt> next=new LinkedHashMap<>(entries);
        next.put(id,new Receipt(old.id,old.profileId,old.kind,old.outcome,true));commit(next);
    }
    public synchronized List<Receipt> pending() throws IOException {
        refresh();
        List<Receipt> pending=new ArrayList<>();for(Receipt r:entries.values())if(r.outcome!=null&&!r.acknowledged)pending.add(r);return pending;
    }
    public synchronized List<Receipt> unresolved() throws IOException {
        refresh();
        List<Receipt> pending=new ArrayList<>();for(Receipt r:entries.values())if(r.outcome==null)pending.add(r);return pending;
    }
    private void commit(LinkedHashMap<String,Receipt> next) throws IOException {
        byte[] bytes=encode(next);
        try{disk.replace(bytes);if(!Arrays.equals(disk.read(),bytes))throw new IOException("Receipt verification failed");entries=next;}
        catch(IOException error){healthy=false;throw error;}
    }
    private void requireHealthy() throws IOException {if(!healthy)throw new IOException("Receipt journal requires authoritative reopen");}
    private void refresh() throws IOException {
        // All native instances use the same process-wide IO executor. An old Activity's
        // late callback must rebase on a new Activity's requests, never its stale map.
        requireHealthy();byte[] bytes=disk.read();
        if(bytes==null&&!entries.isEmpty())throw new IOException("Receipt journal disappeared");
        entries=decode(bytes);
    }
    private static void check(String s) throws IOException {
        if(s==null||s.isEmpty()||s.length()>512||s.indexOf('\0')>=0)throw new IOException("Invalid identifier");
    }
    private static void put(DataOutputStream out,String value) throws IOException {byte[] bytes=value.getBytes(StandardCharsets.UTF_8);out.writeInt(bytes.length);out.write(bytes);}
    private static String get(DataInputStream in) throws IOException {int n=in.readInt();if(n<0||n>4096)throw new IOException("Invalid field");byte[] b=new byte[n];in.readFully(b);return new String(b,StandardCharsets.UTF_8);}
    private static byte[] encode(Map<String,Receipt> entries) throws IOException {
        ByteArrayOutputStream buffer=new ByteArrayOutputStream();DataOutputStream out=new DataOutputStream(buffer);
        out.writeInt(0x43414432);out.writeInt(entries.size());
        for(Receipt r:entries.values()){put(out,r.id);put(out,r.profileId);put(out,r.kind);put(out,r.outcome==null?"":r.outcome);out.writeBoolean(r.acknowledged);}
        out.flush();return buffer.toByteArray();
    }
    private static LinkedHashMap<String,Receipt> decode(byte[] bytes) throws IOException {
        LinkedHashMap<String,Receipt> result=new LinkedHashMap<>();if(bytes==null)return result;
        DataInputStream in=new DataInputStream(new ByteArrayInputStream(bytes));
        if(in.readInt()!=0x43414432)throw new IOException("Unsupported receipt journal");
        int count=in.readInt();if(count<0||count>bytes.length)throw new IOException("Invalid receipt count");
        for(int i=0;i<count;i++){
            String id=get(in),profile=get(in),kind=get(in),outcome=get(in);boolean ack=in.readBoolean();
            check(id);check(profile);
            if(!Arrays.asList("hint","continue","win-bonus").contains(kind)||!Arrays.asList("","earned","cancelled","failed").contains(outcome)||outcome.isEmpty()&&ack||result.containsKey(id))throw new IOException("Corrupt receipt");
            result.put(id,new Receipt(id,profile,kind,outcome.isEmpty()?null:outcome,ack));
        }
        if(in.available()!=0)throw new IOException("Trailing receipt data");return result;
    }
}
