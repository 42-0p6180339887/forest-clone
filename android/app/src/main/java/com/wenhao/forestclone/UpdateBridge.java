package com.wenhao.forestclone;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.ProgressDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.text.InputType;
import android.util.Base64;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.EditText;
import android.widget.Toast;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import org.json.*;

/** A no-argument JS entry. Authorization, HTTP and installation stay native. */
public final class UpdateBridge {
    private static final String API="https://api.github.com/repos/"+UpdateSettings.REPOSITORY;
    private static final int INSTALL_PERMISSION=4219;
    private final Activity activity;
    private final WebView web;
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final SharedPreferences prefs;
    private volatile boolean closed=false, running=false;
    private volatile int authorizationGeneration=0;
    private JSONObject config;
    private JSONObject candidate;
    private ProgressDialog progress;

    public UpdateBridge(Activity activity,WebView web) {
        this.activity=activity;this.web=web;
        prefs=activity.getSharedPreferences("private-updates-v1",Activity.MODE_PRIVATE);
        try {
            config=new JSONObject(new String(read(activity.getAssets().open("offline/update-config.json"),65536),StandardCharsets.UTF_8));
            UpdatePolicy.require(UpdateSettings.REPOSITORY.equals(config.getString("repository")) && UpdateSettings.APP_ID.equals(config.getString("appId")) && UpdateSettings.PLATFORM.equals(config.getString("platform")) && UpdateSettings.CHANNEL.equals(config.getString("channel")),"更新配置无效");
        } catch(Exception e) { config=null; }
    }
    @JavascriptInterface public void open() { ui(()->openNative()); }
    private void openNative() {
        if(Build.VERSION.SDK_INT<23){message("需要 Android 6 或更新系统","此设备可继续使用本地功能；内置更新授权需要 Android Keystore 的 AES-GCM 支持。");return;}
        if(config==null){message("更新配置未就绪","请安装含有效更新配置的过渡版本。");return;}
        if(running){Toast.makeText(activity,"正在检查或下载更新",Toast.LENGTH_SHORT).show();return;}
        if(!prefs.contains("authorization")){authorize();return;}
        new AlertDialog.Builder(activity).setTitle("应用更新")
            .setMessage("当前版本 "+versionName()+" · 私有稳定通道\n安装前会保存本机数据快照；请先结束专注并完成存档同步。")
            .setPositiveButton("检查更新",(d,w)->check(false))
            .setNeutralButton("更换授权",(d,w)->authorize())
            .setNegativeButton("关闭",null).show();
    }
    private void authorize() {
        ArrayList<String> options=new ArrayList<>();
        if(!config.optString("clientId").isEmpty())options.add("通过 GitHub 登录");
        options.add("输入本人仓库读取令牌");
        if(prefs.contains("authorization"))options.add("移除此设备的更新授权");
        new AlertDialog.Builder(activity).setTitle("授权读取私有更新仓库")
            .setItems(options.toArray(new String[0]),(d,index)->{
                String selected=options.get(index);
                if(selected.startsWith("通过"))deviceFlow();
                else if(selected.startsWith("输入"))tokenDialog();
                else {prefs.edit().remove("authorization").apply();Toast.makeText(activity,"已移除本机授权；可在 GitHub 撤销令牌",Toast.LENGTH_LONG).show();}
            }).setNegativeButton("取消",null).show();
    }
    private void tokenDialog() {
        EditText input=new EditText(activity);
        input.setSingleLine(true);input.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);
        input.setSaveEnabled(false);if(Build.VERSION.SDK_INT>=26)input.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        input.setHint("个人细粒度令牌");
        AlertDialog dialog=new AlertDialog.Builder(activity).setTitle("输入本人的 GitHub 令牌")
            .setMessage("仅用于本人有权访问的私有仓库。请创建只允许 "+UpdateSettings.REPOSITORY+"、Contents: read 的细粒度令牌。授权会用 Android Keystore 加密保存在此设备；不会交给网页。")
            .setView(input).setPositiveButton("验证并保存",null).setNegativeButton("取消",null).create();
        dialog.setOnShowListener(d->{dialog.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
            String token=input.getText().toString().trim();
            if(token.length()<20 || token.length()>1000 || !token.matches("[A-Za-z0-9_]+")){input.setError("令牌格式无效");return;}
            input.setText("");dialog.dismiss();
            task("验证更新授权",()->{JSONObject auth=new JSONObject().put("access_token",token).put("kind","personal");JSONObject manifest=channel(token);validateIdentity(manifest);saveAuthorization(auth);ui(()->message("授权已保存","令牌只保存在本机。可重新打开「应用更新」检查新版本。"));});
        });});dialog.show();
    }
    private void deviceFlow() {
        final int generation=++authorizationGeneration;
        task("获取 GitHub 设备码",()->{
            JSONObject code=oauth("/login/device/code",new JSONObject().put("client_id",config.getString("clientId")));
            String device=code.getString("device_code"),user=code.getString("user_code");
            long deadline=System.currentTimeMillis()+Math.min(1800,Math.max(1,code.getInt("expires_in")))*1000L;
            int interval=Math.max(5,code.optInt("interval",5));
            String verification=code.getString("verification_uri");
            UpdatePolicy.require("https://github.com/login/device".equals(verification),"GitHub 授权地址异常");
            ui(()->{
                dismissProgress();
                new AlertDialog.Builder(activity).setTitle("在 GitHub 输入设备码")
                    .setMessage(user+"\n\n请确认授权应用名称及私有仓库权限，完成后回到此处。")
                    .setPositiveButton("打开 GitHub",(d,w)->activity.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(verification))))
                    .setNegativeButton("取消",(d,w)->authorizationGeneration++)
                    .setOnCancelListener(d->authorizationGeneration++).show();
            });
            while(!closed && generation==authorizationGeneration && System.currentTimeMillis()<deadline){
                Thread.sleep(interval*1000L);
                JSONObject auth=oauth("/login/oauth/access_token",new JSONObject().put("client_id",config.getString("clientId")).put("device_code",device).put("grant_type","urn:ietf:params:oauth:grant-type:device_code"));
                if(auth.has("access_token")){
                    JSONObject manifest=channel(auth.getString("access_token"));validateIdentity(manifest);
                    normalizeExpiry(auth);auth.put("kind","device");saveAuthorization(auth);
                    ui(()->message("GitHub 授权成功","已验证私有更新仓库读取权限。可重新打开「应用更新」检查版本。"));return;
                }
                String error=auth.optString("error");
                if("slow_down".equals(error))interval+=5;
                else if(!"authorization_pending".equals(error))throw new IllegalArgumentException("GitHub 授权未完成，请重新登录");
            }
            if(generation==authorizationGeneration && !closed)throw new IllegalArgumentException("GitHub 设备码已过期，请重新登录");
        });
    }
    private void normalizeExpiry(JSONObject auth) throws JSONException {
        if(auth.has("expires_in"))auth.put("expires_at",System.currentTimeMillis()+auth.getLong("expires_in")*1000L);
        if(auth.has("refresh_token_expires_in"))auth.put("refresh_expires_at",System.currentTimeMillis()+auth.getLong("refresh_token_expires_in")*1000L);
    }
    private String accessToken() throws Exception {
        JSONObject auth=loadAuthorization();
        if(auth.optLong("expires_at",Long.MAX_VALUE)>System.currentTimeMillis()+120000)return auth.getString("access_token");
        UpdatePolicy.require("device".equals(auth.optString("kind")) && auth.has("refresh_token") && auth.optLong("refresh_expires_at",Long.MAX_VALUE)>System.currentTimeMillis(),"更新授权已过期，请重新登录");
        JSONObject refreshed=oauth("/login/oauth/access_token",new JSONObject().put("client_id",config.getString("clientId")).put("grant_type","refresh_token").put("refresh_token",auth.getString("refresh_token")));
        UpdatePolicy.require(refreshed.has("access_token"),"更新授权刷新失败，请重新登录");
        normalizeExpiry(refreshed);refreshed.put("kind","device");saveAuthorization(refreshed);return refreshed.getString("access_token");
    }
    public void autoCheck() {
        if(!running && Build.VERSION.SDK_INT>=23 && config!=null && prefs.contains("authorization") && System.currentTimeMillis()-prefs.getLong("lastAutoAttempt",0)>86400000L){
            prefs.edit().putLong("lastAutoAttempt",System.currentTimeMillis()).apply();check(true);
        }
    }
    private void check(boolean silent) {
        if(running)return;
        task(silent?null:"检查更新",()->{
            JSONObject manifest=channel(accessToken());validateIdentity(manifest);
            prefs.edit().putLong("lastCheck",System.currentTimeMillis()).putString("lastManifest",manifest.toString()).apply();
            if(!manifest.getBoolean("available")){if(!silent)ui(()->message("暂无更新","此通道尚未发布安装包。"));return;}
            if(manifest.getLong("versionCode")<=currentCode()){if(!silent)ui(()->message("已是最新版本","当前版本 "+versionName()));return;}
            validateCandidate(manifest);candidate=manifest;
            ui(()->new AlertDialog.Builder(activity).setTitle("发现新版本 "+manifest.optString("versionName"))
                .setMessage(manifest.optString("notes")+"\n\n下载后将校验签名并保存本机快照。训练、记录编辑或同步期间请稍后安装。")
                .setPositiveButton("下载更新",(d,w)->download(manifest)).setNegativeButton("稍后",null).show());
        },silent);
    }
    private JSONObject channel(String token) throws Exception {
        return jsonGet(API+"/contents/channels/"+UpdateSettings.APP_ID+"/android/"+UpdateSettings.CHANNEL+".json?ref=main",token,"application/vnd.github.raw+json");
    }
    private static void validateIdentity(JSONObject m) throws JSONException {
        Set<String> fields=new HashSet<>(Arrays.asList("schemaVersion","appId","platform","channel","available","versionCode","versionName","releaseTag","releaseAssetName","bytes","sha256","notes","android"));
        for(Iterator<String> keys=m.keys();keys.hasNext();)UpdatePolicy.require(fields.contains(keys.next()),"更新清单包含未知字段");
        UpdatePolicy.identity(integer(m,"schemaVersion"),m.getString("appId"),m.getString("platform"),m.getString("channel"));
        for(String key:new String[]{"appId","platform","channel","versionName","releaseTag","releaseAssetName","sha256","notes"})if(m.has(key))UpdatePolicy.require(m.get(key) instanceof String,"清单文本类型无效");
        UpdatePolicy.require(m.get("available") instanceof Boolean,"清单 available 类型无效");
        if(!m.getBoolean("available"))UpdatePolicy.require(m.length()==5,"未发布通道不应包含安装候选");
    }
    private void validateCandidate(JSONObject m) throws Exception {
        validateIdentity(m);UpdatePolicy.require(m.getBoolean("available"),"通道没有可用更新");
        JSONObject a=m.getJSONObject("android");
        UpdatePolicy.require(a.length()==2 && a.get("packageName") instanceof String && a.get("signingCertificateSha256") instanceof String,"Android 清单字段无效");
        UpdatePolicy.candidate(currentCode(),number(m,"versionCode"),m.getString("versionName"),m.getString("releaseTag"),m.getString("releaseAssetName"),number(m,"bytes"),m.getString("sha256"),a.getString("packageName"),a.getString("signingCertificateSha256"));
        UpdatePolicy.require(!m.getString("notes").trim().isEmpty() && m.getString("notes").length()<=16384,"更新说明无效");
    }
    private void download(JSONObject manifest) {
        task("下载并校验更新",()->{
            validateCandidate(manifest);String token=accessToken();
            JSONObject release=jsonGet(API+"/releases/tags/"+manifest.getString("releaseTag"),token,"application/vnd.github+json");
            UpdatePolicy.release(manifest.getString("releaseTag"),release.getString("tag_name"),release.getBoolean("draft"),release.getBoolean("prerelease"));
            JSONObject asset=null;JSONArray assets=release.getJSONArray("assets");
            for(int i=0;i<assets.length();i++){JSONObject a=assets.getJSONObject(i);if(manifest.getString("releaseAssetName").equals(a.getString("name"))){UpdatePolicy.require(asset==null,"附件名称重复");asset=a;}}
            UpdatePolicy.require(asset!=null,"Release 缺少指定安装包");
            UpdatePolicy.require(number(asset,"size")==number(manifest,"bytes"),"Release 附件大小与清单不符");
            String url=asset.getString("url");UpdatePolicy.assetApi(url,number(asset,"id"));
            File dir=new File(activity.getCacheDir(),"updates");UpdatePolicy.require(dir.isDirectory() || dir.mkdirs(),"无法创建更新目录");
            File partial=new File(dir,"download.part"),verified=new File(dir,"verified.apk");
            if(verified.exists() && !verified.delete())throw new IOException();
            try {
                HttpURLConnection connection=UpdateTransport.connect(url,token,"application/octet-stream",true);
                long expected=manifest.getLong("bytes"),count=0;MessageDigest digest=MessageDigest.getInstance("SHA-256");
                try(InputStream in=connection.getInputStream();FileOutputStream out=new FileOutputStream(partial)){
                    byte[] buffer=new byte[32768];int n;
                    while((n=in.read(buffer))!=-1){if(closed || Thread.currentThread().isInterrupted())throw new InterruptedIOException();count+=n;UpdatePolicy.require(count<=expected,"安装包超出声明大小");digest.update(buffer,0,n);out.write(buffer,0,n);}out.getFD().sync();
                } finally {connection.disconnect();}
                UpdatePolicy.digest(expected,manifest.getString("sha256"),count,digest.digest());
                verifyApk(partial,manifest);
                UpdatePolicy.require(partial.renameTo(verified),"无法提交已验证安装包");
                candidate=manifest;ui(()->confirmInstall());
            } finally {if(partial.exists())partial.delete();}
        });
    }
    private void verifyApk(File file,JSONObject manifest) throws Exception {
        PackageManager pm=activity.getPackageManager();int flags=Build.VERSION.SDK_INT>=28?PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES;
        PackageInfo archive=pm.getPackageArchiveInfo(file.getAbsolutePath(),flags),installed=pm.getPackageInfo(activity.getPackageName(),flags);
        UpdatePolicy.require(archive!=null && activity.getPackageName().equals(archive.packageName),"下载文件不是本应用安装包");
        long code=Build.VERSION.SDK_INT>=28?archive.getLongVersionCode():archive.versionCode;
        UpdatePolicy.require(code==manifest.getLong("versionCode") && code>currentCode() && manifest.getString("versionName").equals(archive.versionName),"APK 实际版本与清单不符");
        UpdatePolicy.certificates(certificates(installed),certificates(archive),manifest.getJSONObject("android").getString("signingCertificateSha256"));
    }
    private Set<String> certificates(PackageInfo info) throws Exception {
        Signature[] signatures=Build.VERSION.SDK_INT>=28 && info.signingInfo!=null?info.signingInfo.getApkContentsSigners():info.signatures;
        Set<String> set=new HashSet<>();if(signatures!=null)for(Signature s:signatures)set.add(UpdatePolicy.hex(MessageDigest.getInstance("SHA-256").digest(s.toByteArray())));return set;
    }
    private void confirmInstall() {
        new AlertDialog.Builder(activity).setTitle("安装已验证更新")
            .setMessage("将保存带当前版本号的本机快照，再打开 Android 安装确认页。请先结束训练并完成同步；直接覆盖安装保留个人数据。")
            .setPositiveButton("保存快照并安装",(d,w)->snapshotAndInstall()).setNegativeButton("稍后",null).show();
    }
    private void snapshotAndInstall() {
        if(candidate==null)return;
        final JSONObject manifest=candidate;
        String script="JSON.stringify((()=>{if(location.origin!=="+JSONObject.quote(UpdateSettings.ORIGIN)+")return {error:'origin'};if(typeof window.crimpdUpdateBusy==='function'&&window.crimpdUpdateBusy())return {error:'busy'};if(/timer|log-workout|workout-log/.test(location.pathname))return {error:'busy'};let raw=localStorage.getItem("+JSONObject.quote(UpdateSettings.STORAGE_KEY)+");if(raw===null)return {data:null};try{return {data:JSON.parse(raw)}}catch(e){return {error:'data'}}})())";
        web.evaluateJavascript(script,result->{
            try {
                Object decoded=new JSONTokener(result).nextValue();
                JSONObject state=decoded instanceof String?new JSONObject((String)decoded):(JSONObject)decoded;
                if(state.has("error")){message("暂缓更新","训练、记录编辑或同步进行中时请稍后重试；若本机数据异常，请先备份恢复。");return;}
                task("保存升级前快照",()->{
                    File apk=new File(activity.getCacheDir(),"updates/verified.apk");verifyApk(apk,manifest);verifyFile(apk,manifest);
                    JSONObject snapshot=new JSONObject().put("format",UpdateSettings.APP_ID+"-android-upgrade-v1").put("versionCode",currentCode()).put("versionName",versionName()).put("origin",UpdateSettings.ORIGIN).put("storageKey",UpdateSettings.STORAGE_KEY).put("createdAt",System.currentTimeMillis()).put("data",state.get("data"));
                    File folder=new File(activity.getFilesDir(),"update-snapshots");UpdatePolicy.require(folder.isDirectory() || folder.mkdirs(),"无法保存升级快照");
                    File target=new File(folder,currentCode()+"-"+System.currentTimeMillis()+".json");
                    try(FileOutputStream out=new FileOutputStream(target)){out.write(snapshot.toString().getBytes(StandardCharsets.UTF_8));out.getFD().sync();}
                    prefs.edit().putString("pendingManifest",manifest.toString()).apply();ui(()->install());
                });
            } catch(Exception e){message("无法保存升级快照","本机数据未通过检查，请先完成备份后重试。");}
        });
    }
    private void verifyFile(File file,JSONObject manifest) throws Exception {
        MessageDigest digest=MessageDigest.getInstance("SHA-256");long count=0;
        try(InputStream in=new FileInputStream(file)){byte[] b=new byte[32768];int n;while((n=in.read(b))!=-1){digest.update(b,0,n);count+=n;}}
        UpdatePolicy.digest(manifest.getLong("bytes"),manifest.getString("sha256"),count,digest.digest());
    }
    private void install() {
        if(Build.VERSION.SDK_INT>=26 && !activity.getPackageManager().canRequestPackageInstalls()){
            new AlertDialog.Builder(activity).setTitle("允许安装本应用更新")
                .setMessage("Android 需要你允许此应用请求安装更新。返回后会再次确认安装。")
                .setPositiveButton("打开系统设置",(d,w)->activity.startActivityForResult(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+activity.getPackageName())),INSTALL_PERMISSION)).setNegativeButton("稍后",null).show();return;
        }
        Intent install=new Intent(Intent.ACTION_INSTALL_PACKAGE,Uri.parse("content://"+activity.getPackageName()+".updates/verified.apk"));
        install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);install.putExtra(Intent.EXTRA_RETURN_RESULT,true);
        try {activity.startActivityForResult(install,INSTALL_PERMISSION+1);}catch(Exception e){message("无法打开安装器","请确认系统允许安装应用更新后重试。");}
    }
    public void onActivityResult(int requestCode) {
        if(requestCode==INSTALL_PERMISSION && (Build.VERSION.SDK_INT<26 || activity.getPackageManager().canRequestPackageInstalls())){
            try{candidate=new JSONObject(prefs.getString("pendingManifest","{}"));confirmInstall();}catch(Exception ignored){}
        }
    }
    private JSONObject jsonGet(String url,String token,String accept) throws Exception {
        HttpURLConnection c=UpdateTransport.connect(url,token,accept,false);
        try {return new JSONObject(new String(read(c.getInputStream(),1024*1024),StandardCharsets.UTF_8));}finally{c.disconnect();}
    }
    private JSONObject oauth(String path,JSONObject form) throws Exception {
        UpdatePolicy.require("/login/device/code".equals(path)||"/login/oauth/access_token".equals(path),"授权路径无效");
        HttpURLConnection c=(HttpURLConnection)new URL("https://github.com"+path).openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(15000);c.setReadTimeout(30000);c.setUseCaches(false);c.setRequestMethod("POST");c.setDoOutput(true);
        c.setRequestProperty("Accept","application/json");c.setRequestProperty("Content-Type","application/x-www-form-urlencoded");
        StringBuilder body=new StringBuilder();Iterator<String> keys=form.keys();while(keys.hasNext()){String key=keys.next();if(body.length()>0)body.append('&');body.append(URLEncoder.encode(key,"UTF-8")).append('=').append(URLEncoder.encode(form.getString(key),"UTF-8"));}
        byte[] bytes=body.toString().getBytes(StandardCharsets.UTF_8);c.setFixedLengthStreamingMode(bytes.length);
        try {try(OutputStream out=c.getOutputStream()){out.write(bytes);}UpdatePolicy.require(c.getResponseCode()==200,"GitHub 授权服务暂不可用");return new JSONObject(new String(read(c.getInputStream(),65536),StandardCharsets.UTF_8));}finally{c.disconnect();}
    }
    private javax.crypto.SecretKey key() throws Exception {
        String alias=activity.getPackageName()+".private-updates-v1";KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(store.containsAlias(alias))return (javax.crypto.SecretKey)store.getKey(alias,null);
        KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");generator.init(new KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());return generator.generateKey();
    }
    private void saveAuthorization(JSONObject auth) throws Exception {
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());
        String value=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+"."+Base64.encodeToString(cipher.doFinal(auth.toString().getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);
        UpdatePolicy.require(prefs.edit().putString("authorization",value).commit(),"无法保存本机授权");
    }
    private JSONObject loadAuthorization() throws Exception {
        String[] parts=prefs.getString("authorization","").split("\\.",2);UpdatePolicy.require(parts.length==2,"请先授权读取更新仓库");
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.DEFAULT)));
        return new JSONObject(new String(cipher.doFinal(Base64.decode(parts[1],Base64.DEFAULT)),StandardCharsets.UTF_8));
    }
    private long currentCode() throws PackageManager.NameNotFoundException {PackageInfo p=activity.getPackageManager().getPackageInfo(activity.getPackageName(),0);return Build.VERSION.SDK_INT>=28?p.getLongVersionCode():p.versionCode;}
    private String versionName(){try{return activity.getPackageManager().getPackageInfo(activity.getPackageName(),0).versionName;}catch(Exception e){return "未知";}}
    private static int integer(JSONObject value,String key) throws JSONException {long n=number(value,key);UpdatePolicy.require(n<=Integer.MAX_VALUE && n>=Integer.MIN_VALUE,"清单整数溢出");return (int)n;}
    private static long number(JSONObject value,String key) throws JSONException {Object n=value.get(key);UpdatePolicy.require(n instanceof Integer || n instanceof Long,"清单整数类型无效");return ((Number)n).longValue();}
    private static byte[] read(InputStream in,int limit) throws IOException {try(InputStream source=in;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=source.read(b))!=-1){if(out.size()+n>limit)throw new IOException();out.write(b,0,n);}return out.toByteArray();}}
    private interface Job {void run() throws Exception;}
    private void task(String title,Job job){task(title,job,false);}
    private synchronized void task(String title,Job job,boolean silent){
        if(running || closed)return;running=true;
        if(title!=null)ui(()->{progress=ProgressDialog.show(activity,"应用更新",title,true,false);});
        worker.execute(()->{try{job.run();}catch(Exception e){if(!silent && !closed)ui(()->message("更新未完成",e instanceof IllegalArgumentException?e.getMessage():"网络或本机校验失败，请稍后重试；个人数据保持保存在本机。"));}finally{running=false;ui(()->dismissProgress());}});
    }
    private void dismissProgress(){if(progress!=null){progress.dismiss();progress=null;}}
    private void message(String title,String body){if(!closed && !activity.isFinishing())new AlertDialog.Builder(activity).setTitle(title).setMessage(body).setPositiveButton("知道了",null).show();}
    private void ui(Runnable action){activity.runOnUiThread(()->{if(!closed && !activity.isFinishing())action.run();});}
    public void close(){closed=true;authorizationGeneration++;worker.shutdownNow();dismissProgress();}
}
