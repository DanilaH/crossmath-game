package com.danilah.crossmath;

import android.util.AtomicFile;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Process-wide queue plus OS file lock; CAS compares and publishes within one native call. */
@CapacitorPlugin(name="GameStorage")
public class GameStoragePlugin extends Plugin {
    static final ExecutorService IO=Executors.newSingleThreadExecutor();
    private File directory(){return new File(getContext().getNoBackupFilesDir(),"game-state-v1");}
    private AtomicFile file(String key){StorageBatch.key(key);return new AtomicFile(new File(directory(),key+".json"));}
    private final StorageBatch.Values values=new StorageBatch.Values(){
        public String read(String key) throws Exception {
            AtomicFile file=file(key);
            try{return new String(file.readFully(),StandardCharsets.UTF_8);}
            catch(FileNotFoundException absent){if(file.getBaseFile().exists()||new File(file.getBaseFile()+".bak").exists())throw absent;return null;}
        }
        public void write(String key,String value) throws Exception {
            if(value==null)throw new IllegalArgumentException("Missing value");
            byte[] bytes=value.getBytes(StandardCharsets.UTF_8);if(bytes.length>4*1024*1024)throw new IllegalArgumentException("Save too large");
            AtomicFile file=file(key);FileOutputStream out=null;
            try{out=file.startWrite();out.write(bytes);file.finishWrite(out);out=null;if(!Arrays.equals(file.readFully(),bytes))throw new IOException("Write verification failed");}
            catch(Exception error){if(out!=null)file.failWrite(out);throw error;}
        }
        public void remove(String key)throws Exception{AtomicFile file=file(key);file.delete();if(file.getBaseFile().exists())throw new IOException("Delete failed");}
    };
    @PluginMethod public void get(PluginCall call){IO.execute(()->{
        try{String value=StorageBatch.locked(directory(),()->values.read(call.getString("key","")));JSObject result=new JSObject();result.put("value",value==null?JSONObject.NULL:value);call.resolve(result);}
        catch(Exception error){call.reject("Storage read failed");}
    });}
    @PluginMethod public void set(PluginCall call){IO.execute(()->{
        try{StorageBatch.locked(directory(),()->{values.write(call.getString("key",""),call.getString("value"));return null;});call.resolve();}
        catch(Exception error){call.reject("Storage write failed");}
    });}
    @PluginMethod public void remove(PluginCall call){IO.execute(()->{
        try{StorageBatch.locked(directory(),()->{values.remove(call.getString("key",""));return null;});call.resolve();}
        catch(Exception error){call.reject("Storage remove failed");}
    });}
    @PluginMethod public void list(PluginCall call){IO.execute(()->{
        try{JSArray keys=StorageBatch.locked(directory(),()->{
            String prefix=call.getString("prefix","");if(!prefix.matches("[a-zA-Z0-9_.-]{0,100}"))throw new IllegalArgumentException("Invalid storage prefix");
            File[] files=directory().listFiles();if(files==null)throw new IOException("Archive enumeration failed");JSArray names=new JSArray();
            for(File entry:files){String name=entry.getName();if(name.endsWith(".json")&&name.substring(0,name.length()-5).matches("[a-zA-Z0-9_.-]{1,100}")&&name.startsWith(prefix))names.put(name.substring(0,name.length()-5));}return names;
        });JSObject result=new JSObject();result.put("keys",keys);call.resolve(result);}
        catch(Exception error){call.reject("Archive enumeration failed");}
    });}
    @PluginMethod public void compareAndSet(PluginCall call){IO.execute(()->{
        try{
            JSObject expectedJson=call.getObject("expected");JSArray entries=call.getArray("puts"),deletes=call.getArray("remove");
            if(expectedJson==null||entries==null||deletes==null)throw new IllegalArgumentException("Invalid batch");
            Map<String,String> expected=new LinkedHashMap<>();Iterator<String> keys=expectedJson.keys();
            while(keys.hasNext()){String key=keys.next();expected.put(key,expectedJson.isNull(key)?null:expectedJson.getString(key));}
            LinkedHashMap<String,String> puts=new LinkedHashMap<>();
            for(int i=0;i<entries.length();i++){JSONObject entry=entries.getJSONObject(i);puts.put(entry.getString("key"),entry.getString("value"));}
            List<String> remove=new ArrayList<>();for(int i=0;i<deletes.length();i++)remove.add(deletes.getString(i));
            boolean applied=StorageBatch.apply(directory(),values,expected,puts,remove);JSObject result=new JSObject();result.put("applied",applied);call.resolve(result);
        }catch(Exception error){call.reject("Storage transaction failed");}
    });}
}
