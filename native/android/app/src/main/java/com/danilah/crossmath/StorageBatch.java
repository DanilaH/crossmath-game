package com.danilah.crossmath;

import java.io.*;
import java.nio.channels.FileLock;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** No Android dependency: the real file lock/CAS algorithm is exercised on the JVM. */
public final class StorageBatch {
    public interface Values { String read(String key) throws Exception; void write(String key,String value) throws Exception; void remove(String key) throws Exception; }
    public interface Operation<T> { T run() throws Exception; }
    public static synchronized <T> T locked(File directory,Operation<T> operation) throws Exception {
        if (!directory.isDirectory() && !directory.mkdirs()) throw new IOException("Storage unavailable");
        try (RandomAccessFile lockFile=new RandomAccessFile(new File(directory,".writer.lock"),"rw");
             FileLock lock=lockFile.getChannel().lock()) { return operation.run(); }
    }
    public static void key(String key) { if(key==null||!key.matches("[a-zA-Z0-9_.-]{1,100}"))throw new IllegalArgumentException("Invalid storage key"); }
    public static boolean apply(File directory,Values values,Map<String,String> expected,LinkedHashMap<String,String> puts,List<String> remove) throws Exception {
        for(String key:expected.keySet())key(key);
        for(Map.Entry<String,String> entry:puts.entrySet()){
            key(entry.getKey());if(entry.getValue()==null||entry.getValue().getBytes(StandardCharsets.UTF_8).length>4*1024*1024)throw new IllegalArgumentException("Save too large");
        }
        for(String key:remove)key(key);
        return locked(directory,()->{
            for(Map.Entry<String,String> entry:expected.entrySet())if(!Objects.equals(values.read(entry.getKey()),entry.getValue()))return false;
            // All referenced pages and last-good backup precede the root publication.
            // A crash before that point leaves the old root valid; no writer interleaves.
            for(Map.Entry<String,String> entry:puts.entrySet())values.write(entry.getKey(),entry.getValue());
            for(String key:remove)try{values.remove(key);}catch(Exception ignored){/* next commit retries orphan collection */}
            return true;
        });
    }
}
