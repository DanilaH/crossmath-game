package com.danilah.crossmath;
import org.junit.Test;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.Assert.*;

public class StorageBatchTest {
    static class Disk implements StorageBatch.Values {
        final File dir;String fail;
        Disk(File dir){this.dir=dir;}
        public String read(String key)throws Exception{Path p=new File(dir,key).toPath();return Files.exists(p)?new String(Files.readAllBytes(p),java.nio.charset.StandardCharsets.UTF_8):null;}
        public void write(String key,String value)throws Exception{if(key.equals(fail))throw new IOException("write fault");Files.write(new File(dir,key).toPath(),value.getBytes(java.nio.charset.StandardCharsets.UTF_8));}
        public void remove(String key)throws Exception{Files.deleteIfExists(new File(dir,key).toPath());}
    }
    static LinkedHashMap<String,String> puts(String next){LinkedHashMap<String,String> p=new LinkedHashMap<>();p.put("page",next);p.put("backup","0");p.put("root",next);return p;}
    @Test public void concurrentWritersPublishOnlyOneRoot()throws Exception{
        File dir=Files.createTempDirectory("crossmath-cas").toFile();Disk disk=new Disk(dir);disk.write("root","0");
        ExecutorService pool=Executors.newFixedThreadPool(2);CountDownLatch start=new CountDownLatch(1);
        try{Future<Boolean> a=pool.submit(()->{start.await();return StorageBatch.apply(dir,new Disk(dir),Map.of("root","0"),puts("a"),List.of());});
            Future<Boolean> b=pool.submit(()->{start.await();return StorageBatch.apply(dir,new Disk(dir),Map.of("root","0"),puts("b"),List.of());});start.countDown();
            assertNotEquals(a.get(10,TimeUnit.SECONDS),b.get(10,TimeUnit.SECONDS));assertEquals("0",disk.read("backup"));assertTrue(Set.of("a","b").contains(disk.read("root")));
        }finally{pool.shutdownNow();}
    }
    @Test public void failureBeforeRootLeavesLastGoodPrimaryAndBackup()throws Exception{
        File dir=Files.createTempDirectory("crossmath-fault").toFile();Disk disk=new Disk(dir);disk.write("root","0");disk.fail="root";
        try{StorageBatch.apply(dir,disk,Map.of("root","0"),puts("a"),List.of());fail();}catch(IOException expected){}
        assertEquals("0",disk.read("root"));assertEquals("0",disk.read("backup"));disk.fail=null;
        assertTrue(StorageBatch.apply(dir,disk,Map.of("root","0"),puts("a"),List.of()));
    }
    @Test public void staleWriterCannotChangeBackupOrPages()throws Exception{
        File dir=Files.createTempDirectory("crossmath-stale").toFile();Disk disk=new Disk(dir);disk.write("root","new");disk.write("backup","prior");
        assertFalse(StorageBatch.apply(dir,disk,Map.of("root","0"),puts("old"),List.of()));assertEquals("prior",disk.read("backup"));assertNull(disk.read("page"));
    }
    @Test public void fullPlanIsValidatedBeforeMutation()throws Exception{
        File dir=Files.createTempDirectory("crossmath-limit").toFile();Disk disk=new Disk(dir);disk.write("root","0");LinkedHashMap<String,String> p=puts("a");p.put("tooBig","x".repeat(4*1024*1024+1));
        try{StorageBatch.apply(dir,disk,Map.of("root","0"),p,List.of());fail();}catch(IllegalArgumentException expected){}assertEquals("0",disk.read("root"));assertNull(disk.read("page"));
    }
    @Test public void lostReplyRetryConflictsAndDoesNotReapply()throws Exception{
        File dir=Files.createTempDirectory("crossmath-ack").toFile();Disk disk=new Disk(dir);disk.write("root","0");
        assertTrue(StorageBatch.apply(dir,disk,Map.of("root","0"),puts("1"),List.of()));
        assertFalse(StorageBatch.apply(dir,disk,Map.of("root","0"),puts("1"),List.of()));assertEquals("1",disk.read("root"));assertEquals("0",disk.read("backup"));
    }
    public static class Contender {
        public static void main(String[] args)throws Exception{
            File dir=new File(args[0]);Disk disk=new Disk(dir);Files.write(new File(dir,"ready"+args[1]).toPath(),"ready".getBytes());
            long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);while(!new File(dir,"start").exists()){if(System.nanoTime()>end)throw new IOException("barrier timeout");Thread.sleep(5);}
            boolean applied=StorageBatch.apply(dir,disk,Map.of("root","0"),puts(args[1]),List.of());Files.write(new File(dir,"result"+args[1]).toPath(),Boolean.toString(applied).getBytes());
        }
    }
    @Test public void independentProcessesUseTheSameOsLock()throws Exception{
        File dir=Files.createTempDirectory("crossmath-process").toFile();Disk disk=new Disk(dir);disk.write("root","0");
        String cp=StorageBatchTest.class.getProtectionDomain().getCodeSource().getLocation().getPath()+File.pathSeparator+StorageBatch.class.getProtectionDomain().getCodeSource().getLocation().getPath();
        String java=System.getProperty("java.home")+"/bin/java";
        Process a=new ProcessBuilder(java,"-cp",cp,Contender.class.getName(),dir.getPath(),"a").inheritIO().start();
        Process b=new ProcessBuilder(java,"-cp",cp,Contender.class.getName(),dir.getPath(),"b").inheritIO().start();
        try{
            long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);while(!new File(dir,"readya").exists()||!new File(dir,"readyb").exists()){if(System.nanoTime()>end)throw new IOException("child barrier timeout");Thread.sleep(5);}
            Files.write(new File(dir,"start").toPath(),"start".getBytes());assertTrue(a.waitFor(10,TimeUnit.SECONDS));assertTrue(b.waitFor(10,TimeUnit.SECONDS));assertEquals(0,a.exitValue());assertEquals(0,b.exitValue());
            assertNotEquals(disk.read("resulta"),disk.read("resultb"));assertEquals("0",disk.read("backup"));assertTrue(Set.of("a","b").contains(disk.read("root")));
        }finally{a.destroyForcibly();b.destroyForcibly();}
    }
}
