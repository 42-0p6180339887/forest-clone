package com.wenhao.forestclone;

import java.net.URI;
import java.util.Set;

/** Shared, JVM-testable boundary checks; no credentials or Android state. */
final class UpdatePolicy {
    static final String REPOSITORY = UpdateSettings.REPOSITORY;
    static final String APP_ID = UpdateSettings.APP_ID, PLATFORM = UpdateSettings.PLATFORM, CHANNEL = UpdateSettings.CHANNEL;
    static final long MAX_APK_BYTES = 512L * 1024 * 1024;
    static void require(boolean value, String message) {
        if (!value) throw new IllegalArgumentException(message);
    }
    static void identity(int schema, String app, String platform, String channel) {
        require(schema == 1 && APP_ID.equals(app) && PLATFORM.equals(platform) && CHANNEL.equals(channel), "更新清单不属于本应用或通道");
    }
    static String tag(String name, long code) { return APP_ID+"--"+PLATFORM+"--"+CHANNEL+"--v"+name+"--"+code; }
    static void candidate(long current, long code, String name, String tag, String asset, long bytes, String sha, String pkg, String certificate) {
        require(code > current && code <= Integer.MAX_VALUE, "版本未递增");
        require(name != null && name.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,63}"), "版本名称无效");
        require(tag(name,code).equals(tag), "Release 标签不匹配");
        require(asset != null && asset.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,159}") && asset.endsWith(".apk"), "附件名称无效");
        require(bytes > 0 && bytes <= MAX_APK_BYTES, "安装包大小无效");
        require(sha != null && sha.matches("[0-9a-f]{64}"), "安装包校验值无效");
        require(UpdateSettings.PACKAGE_NAME.equals(pkg), "安装包名不匹配");
        require(certificate != null && certificate.matches("[0-9a-f]{64}"), "签名校验值无效");
    }
    static void release(String wanted, String tag, boolean draft, boolean prerelease) {
        require(wanted.equals(tag) && !draft && !prerelease, "Release 未正式发布或标签不匹配");
    }
    static URI https(String value) {
        try {
            URI uri = new URI(value);
            require("https".equals(uri.getScheme()) && uri.getHost()!=null && uri.getRawUserInfo()==null && uri.getFragment()==null && (uri.getPort()==-1 || uri.getPort()==443), "更新地址必须是 HTTPS");
            return uri;
        } catch (java.net.URISyntaxException e) { throw new IllegalArgumentException("更新地址无效"); }
    }
    static boolean authorize(URI uri) { return "api.github.com".equalsIgnoreCase(uri.getHost()) && "https".equals(uri.getScheme()) && uri.getRawUserInfo()==null && (uri.getPort()==-1 || uri.getPort()==443); }
    static void assetApi(String value, long id) {
        URI uri=https(value);
        require(id>0 && ("https://api.github.com/repos/"+REPOSITORY+"/releases/assets/"+id).equals(uri.toString()), "附件 API 地址不匹配");
    }
    static void redirect(String value) {
        String host=https(value).getHost().toLowerCase(java.util.Locale.ROOT);
        require(host.equals("api.github.com") || host.equals("github.com") || host.endsWith(".githubusercontent.com"), "下载跳转域名不受信任");
    }
    static String hex(byte[] bytes) {
        StringBuilder b=new StringBuilder(); for(byte v:bytes)b.append(String.format(java.util.Locale.ROOT,"%02x",v&255)); return b.toString();
    }
    static void digest(long expectedBytes, String expected, long actualBytes, byte[] digest) {
        require(expectedBytes==actualBytes && expected.equals(hex(digest)), "安装包大小或 SHA-256 不匹配");
    }
    static void certificates(Set<String> installed, Set<String> archive, String expected) {
        require(!installed.isEmpty() && installed.equals(archive) && archive.contains(expected), "安装包签名与本机应用不一致");
    }
}
