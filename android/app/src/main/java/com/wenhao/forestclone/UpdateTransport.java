package com.wenhao.forestclone;

import java.net.HttpURLConnection;
import java.net.URI;

/** Explicit redirects keep API authorization out of temporary asset URLs. */
final class UpdateTransport {
    interface Factory { HttpURLConnection open(URI uri) throws Exception; }
    static HttpURLConnection connect(String url,String token,String accept,boolean redirects) throws Exception {
        return connect(url,token,accept,redirects,uri->(HttpURLConnection)uri.toURL().openConnection());
    }
    static HttpURLConnection connect(String value,String token,String accept,boolean redirects,Factory factory) throws Exception {
        for(int hop=0;hop<=5;hop++){
            URI uri=UpdatePolicy.https(value);
            HttpURLConnection c=factory.open(uri);c.setInstanceFollowRedirects(false);c.setConnectTimeout(15000);c.setReadTimeout(30000);c.setUseCaches(false);
            c.setRequestProperty("Accept",accept);c.setRequestProperty("User-Agent",UpdateSettings.APP_ID+"-private-updater");c.setRequestProperty("X-GitHub-Api-Version","2022-11-28");c.setRequestProperty("Accept-Encoding","identity");
            if(hop==0 && token!=null && UpdatePolicy.authorize(uri))c.setRequestProperty("Authorization","Bearer "+token);
            int status=c.getResponseCode();
            if(status==200)return c;
            if(redirects && (status==301 || status==302 || status==303 || status==307 || status==308)){
                String location=c.getHeaderField("Location");c.disconnect();UpdatePolicy.require(location!=null,"下载跳转缺少地址");value=uri.resolve(location).toString();UpdatePolicy.redirect(value);continue;
            }
            c.disconnect();
            if(status==401 || status==403)throw new IllegalArgumentException("更新授权失效或无仓库权限，请重新登录");
            if(status==404)throw new IllegalArgumentException("更新文件尚未发布或账号无仓库读取权");
            throw new IllegalArgumentException("更新服务暂不可用（HTTP "+status+"）");
        }
        throw new IllegalArgumentException("下载跳转次数过多");
    }
}
